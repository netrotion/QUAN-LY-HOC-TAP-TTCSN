package vn.haui.advisor.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình tham số AI module (prefix ai.*).
 */
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    /**
     * Chế độ hoạt động của AI Module: MOCK hoặc LIVE.
     * Mặc định là MOCK cho môi trường local dev và unit test.
     * Ở môi trường LIVE/production, chế độ LIVE yêu cầu bean model thật, không tự sinh mock.
     */
    private AiMode mode = AiMode.MOCK;

    /**
     * Cấu hình phân hệ RAG (ai.rag.*).
     */
    private RagProperties rag = new RagProperties();

    /**
     * Cấu hình mô hình LLM (ai.model.*).
     */
    private ModelProperties model = new ModelProperties();

    /**
     * Cấu hình lịch sử hội thoại (ai.conversation.*).
     */
    private ConversationProperties conversation = new ConversationProperties();

    public AiMode getMode() {
        return mode;
    }

    public void setMode(AiMode mode) {
        this.mode = mode;
    }

    public void setMode(String modeStr) {
        if (modeStr == null || modeStr.isBlank()) {
            this.mode = AiMode.MOCK;
            return;
        }
        String clean = modeStr.trim().toUpperCase();
        if (clean.equals("LIVE") || clean.contains("GEMINI")) {
            this.mode = AiMode.LIVE;
            if (modeStr.toLowerCase().startsWith("gemini-")) {
                this.model.setModelName(modeStr.trim());
            }
        } else {
            this.mode = AiMode.MOCK;
        }
    }

    public RagProperties getRag() {
        return rag;
    }

    public void setRag(RagProperties rag) {
        this.rag = rag;
    }

    public ModelProperties getModel() {
        return model;
    }

    public void setModel(ModelProperties model) {
        this.model = model;
    }

    public ConversationProperties getConversation() {
        return conversation;
    }

    public void setConversation(ConversationProperties conversation) {
        this.conversation = conversation;
    }

    public static class ModelProperties {
        private String provider = "gemini";
        private String modelName = "gemini-3.5-flash-lite";
        private String apiKey;
        private double temperature = 0.2;
        private int timeoutSeconds = 15;
        private int maxTokens = 2048;

        public String getProvider() {
            return provider;
        }

        public void setProvider(String provider) {
            this.provider = provider;
        }

        public String getModelName() {
            return modelName;
        }

        public void setModelName(String modelName) {
            this.modelName = modelName;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public double getTemperature() {
            return temperature;
        }

        public void setTemperature(double temperature) {
            this.temperature = temperature;
        }

        public int getTimeoutSeconds() {
            return timeoutSeconds;
        }

        public void setTimeoutSeconds(int timeoutSeconds) {
            this.timeoutSeconds = timeoutSeconds;
        }

        public int getMaxTokens() {
            return maxTokens;
        }

        public void setMaxTokens(int maxTokens) {
            this.maxTokens = maxTokens;
        }
    }

    public static class ConversationProperties {
        private int maxHistoryTurns = 10;
        private int maxHistoryChars = 900_000;

        public int getMaxHistoryTurns() {
            return maxHistoryTurns;
        }

        public void setMaxHistoryTurns(int maxHistoryTurns) {
            this.maxHistoryTurns = maxHistoryTurns;
        }

        public int getMaxHistoryChars() {
            return maxHistoryChars;
        }

        public void setMaxHistoryChars(int maxHistoryChars) {
            this.maxHistoryChars = maxHistoryChars;
        }
    }

    public static class RagProperties {
        private String catalogPath = "rag/source-catalog.json";
        private int topK = 3;
        private double similarityThreshold = 0.45;
        private StoreType storeType = StoreType.IN_MEMORY;
        private int embeddingDimension = 128;
        private EmbeddingProviderType embeddingProvider = EmbeddingProviderType.FAKE;

        public enum StoreType {
            IN_MEMORY,
            PGVECTOR
        }

        public enum EmbeddingProviderType {
            FAKE,
            LIVE
        }

        public String getCatalogPath() {
            return catalogPath;
        }

        public void setCatalogPath(String catalogPath) {
            this.catalogPath = catalogPath;
        }

        public int getTopK() {
            return topK;
        }

        public void setTopK(int topK) {
            this.topK = topK;
        }

        public double getSimilarityThreshold() {
            return similarityThreshold;
        }

        public void setSimilarityThreshold(double similarityThreshold) {
            this.similarityThreshold = similarityThreshold;
        }

        public StoreType getStoreType() {
            return storeType;
        }

        public void setStoreType(StoreType storeType) {
            this.storeType = storeType;
        }

        public int getEmbeddingDimension() {
            return embeddingDimension;
        }

        public void setEmbeddingDimension(int embeddingDimension) {
            this.embeddingDimension = embeddingDimension;
        }

        public EmbeddingProviderType getEmbeddingProvider() {
            return embeddingProvider;
        }

        public void setEmbeddingProvider(EmbeddingProviderType embeddingProvider) {
            this.embeddingProvider = embeddingProvider;
        }
    }
}
