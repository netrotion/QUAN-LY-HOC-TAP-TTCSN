package vn.haui.advisor.ai.config;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import vn.haui.advisor.ai.conversation.ConversationHistoryManager;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.mock.MockAcademicFacade;
import vn.haui.advisor.ai.model.AdvisorModel;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.rag.embedding.DeterministicFakeEmbeddingProvider;
import vn.haui.advisor.ai.rag.embedding.EmbeddingProvider;
import vn.haui.advisor.ai.rag.embedding.LiveEmbeddingProvider;
import vn.haui.advisor.ai.rag.grounding.CitationGrounder;
import vn.haui.advisor.ai.rag.grounding.EvidenceValidator;
import vn.haui.advisor.ai.rag.ingestion.MarkdownDocumentReader;
import vn.haui.advisor.ai.rag.ingestion.RagCatalogReader;
import vn.haui.advisor.ai.rag.ingestion.RagIngestionService;
import vn.haui.advisor.ai.rag.ingestion.SemanticChunker;
import vn.haui.advisor.ai.rag.retrieval.RagRetriever;
import vn.haui.advisor.ai.rag.retrieval.VietnameseQueryNormalizer;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.ai.rag.vector.InMemoryVectorStore;
import vn.haui.advisor.ai.rag.vector.PgVectorStoreAdapter;
import vn.haui.advisor.ai.rag.vector.VectorStore;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.contracts.ports.AdvisorFacade;
import vn.haui.advisor.contracts.ports.ConversationStore;

/**
 * Spring Auto-configuration cho module AI (tv1-ai).
 * Quản lý vòng đời và điều kiện kích hoạt giữa MOCK mode và LIVE mode,
 * cùng hạ tầng RAG (Ingestion, Embedding, VectorStore, Retriever, Grounding).
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AiProperties.class)
public class AiAutoConfiguration {

    // ==========================================
    // 1. RAG INFRASTRUCTURE BEANS
    // ==========================================

    @Bean
    @ConditionalOnMissingBean
    public RagCatalogReader ragCatalogReader() {
        return new RagCatalogReader();
    }

    @Bean
    @ConditionalOnMissingBean
    public MarkdownDocumentReader markdownDocumentReader() {
        return new MarkdownDocumentReader();
    }

    @Bean
    @ConditionalOnMissingBean
    public SemanticChunker semanticChunker() {
        return new SemanticChunker();
    }

    @Bean
    @ConditionalOnMissingBean
    public RagIngestionService ragIngestionService(RagCatalogReader catalogReader,
                                                   MarkdownDocumentReader documentReader,
                                                   SemanticChunker semanticChunker) {
        return new RagIngestionService(catalogReader, documentReader, semanticChunker);
    }

    @Bean
    @ConditionalOnMissingBean(EmbeddingProvider.class)
    public EmbeddingProvider embeddingProvider(AiProperties properties) {
        if (properties.getRag().getEmbeddingProvider() == AiProperties.RagProperties.EmbeddingProviderType.LIVE) {
            return new LiveEmbeddingProvider();
        }
        return new DeterministicFakeEmbeddingProvider(properties.getRag().getEmbeddingDimension());
    }

    @Bean
    @ConditionalOnMissingBean(VectorStore.class)
    public VectorStore vectorStore(AiProperties properties, ObjectProvider<JdbcTemplate> jdbcTemplateProvider) {
        if (properties.getRag().getStoreType() == AiProperties.RagProperties.StoreType.PGVECTOR) {
            JdbcTemplate jdbcTemplate = jdbcTemplateProvider.getIfAvailable();
            if (jdbcTemplate != null) {
                return new PgVectorStoreAdapter(jdbcTemplate);
            }
        }
        return new InMemoryVectorStore();
    }

    @Bean
    @ConditionalOnMissingBean
    public VietnameseQueryNormalizer vietnameseQueryNormalizer() {
        return new VietnameseQueryNormalizer();
    }

    @Bean
    @ConditionalOnMissingBean
    public RagRetriever ragRetriever(EmbeddingProvider embeddingProvider,
                                     VectorStore vectorStore,
                                     VietnameseQueryNormalizer normalizer,
                                     AiProperties properties) {
        return new RagRetriever(
                embeddingProvider,
                vectorStore,
                normalizer,
                properties.getRag().getSimilarityThreshold(),
                properties.getRag().getTopK()
        );
    }

    @Bean
    @ConditionalOnMissingBean
    public EvidenceValidator evidenceValidator(RagCatalogReader catalogReader) {
        return new EvidenceValidator(catalogReader);
    }

    @Bean
    @ConditionalOnMissingBean
    public CitationGrounder citationGrounder(RagCatalogReader catalogReader) {
        return new CitationGrounder(catalogReader);
    }

    @Bean
    @ConditionalOnMissingBean
    public RagAdvisorService ragAdvisorService(RagRetriever retriever,
                                               EvidenceValidator validator,
                                               CitationGrounder grounder,
                                               RagIngestionService ingestionService,
                                               VectorStore vectorStore,
                                               EmbeddingProvider embeddingProvider) {
        RagAdvisorService service = new RagAdvisorService(
                retriever,
                validator,
                grounder,
                ingestionService,
                vectorStore,
                embeddingProvider
        );
        service.initializeCatalogIndex();
        return service;
    }

    // ==========================================
    // 2. MOCK MODE BEANS (ai.mode=mock hoặc mặc định)
    // ==========================================

    @Bean
    @ConditionalOnProperty(prefix = "ai", name = "mode", havingValue = "mock", matchIfMissing = true)
    @ConditionalOnMissingBean(AdvisorModel.class)
    public AdvisorModel mockAdvisorModel(RagAdvisorService ragAdvisorService) {
        return new MockAdvisorModel(ragAdvisorService);
    }

    @Bean
    @ConditionalOnProperty(prefix = "ai", name = "mode", havingValue = "mock", matchIfMissing = true)
    @ConditionalOnMissingBean(AcademicFacade.class)
    public AcademicFacade mockAcademicFacade() {
        return new MockAcademicFacade();
    }

    // ==========================================
    // 3. LIVE MODE BEANS (ai.mode=live)
    // Tuyệt đối không fallback sang mock; không tạo MockAdvisorModel hay MockAcademicFacade
    // ==========================================

    @Bean
    @ConditionalOnProperty(prefix = "ai", name = "mode", havingValue = "live")
    @ConditionalOnMissingBean(AdvisorModel.class)
    public AdvisorModel liveAdvisorModel(ResponseGroundingValidator responseGroundingValidator) {
        return new LiveAdvisorModel(responseGroundingValidator);
    }

    // ==========================================
    // 4. CORE ADVISOR BEANS
    // ==========================================

    @Bean
    @ConditionalOnMissingBean
    public ConversationHistoryManager conversationHistoryManager(ObjectProvider<vn.haui.advisor.contracts.ports.ConversationStore> conversationStoreProvider,
                                                                 ObjectProvider<com.fasterxml.jackson.databind.ObjectMapper> objectMapperProvider) {
        vn.haui.advisor.contracts.ports.ConversationStore store = conversationStoreProvider.getIfAvailable();
        com.fasterxml.jackson.databind.ObjectMapper mapper = objectMapperProvider.getIfAvailable(com.fasterxml.jackson.databind.ObjectMapper::new);
        return new ConversationHistoryManager(store, mapper);
    }

    @Bean
    @ConditionalOnMissingBean
    public IntentClassifier intentClassifier() {
        return new IntentClassifier();
    }

    @Bean
    @ConditionalOnMissingBean
    public ResponseGroundingValidator responseGroundingValidator() {
        return new ResponseGroundingValidator();
    }

    @Bean
    @ConditionalOnMissingBean(ToolAdapter.class)
    public ToolAdapter toolAdapter(AcademicFacade academicFacade) {
        return new DefaultToolAdapter(academicFacade);
    }

    @Bean
    @ConditionalOnMissingBean(AdvisorFacade.class)
    public AdvisorFacade advisorFacade(AdvisorModel advisorModel,
                                       ToolAdapter toolAdapter,
                                       RagAdvisorService ragAdvisorService,
                                       ConversationHistoryManager conversationHistoryManager,
                                       IntentClassifier intentClassifier,
                                       ResponseGroundingValidator responseGroundingValidator) {
        return new DefaultAdvisorFacade(
                advisorModel,
                toolAdapter,
                ragAdvisorService,
                conversationHistoryManager,
                intentClassifier,
                responseGroundingValidator
        );
    }
}
