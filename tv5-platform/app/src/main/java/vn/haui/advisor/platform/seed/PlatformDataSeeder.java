package vn.haui.advisor.platform.seed;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ResourceLoader;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import vn.haui.advisor.contracts.dto.CertificateStatus;
import vn.haui.advisor.contracts.dto.CertificateVerification;
import vn.haui.advisor.contracts.dto.TranscriptSourceType;
import vn.haui.advisor.platform.certificate.CertificateRepository;
import vn.haui.advisor.platform.config.SeedProperties;
import vn.haui.advisor.platform.curriculum.CurriculumRepository;
import vn.haui.advisor.platform.student.StudentRepository;
import vn.haui.advisor.platform.transcript.TranscriptRepository;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Seed DB từ fixture của TV4 (cùng một nguồn với engine học vụ, không tạo bộ dữ liệu thứ hai):
 * - Luôn đồng bộ CTĐT và tên chuẩn đầu ra phi tín chỉ (dữ liệu tham chiếu).
 * - Chỉ tạo tài khoản demo khi bật haui.seed.demo-accounts.enabled và có mật khẩu; không ghi đè tài khoản đã có.
 */
@Component
@Order(1)
public class PlatformDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PlatformDataSeeder.class);
    private static final Map<String, String> REQUIREMENT_BY_CATEGORY = Map.of(
            "NGOẠI NGỮ", "FOREIGN_LANGUAGE", "TIN HỌC", "IT_SKILLS", "GDQP_AN", "DEFENSE_EDUCATION", "GDTC", "PHYSICAL_EDUCATION");

    private final SeedProperties properties;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactions;
    private final CurriculumRepository curriculumRepository;
    private final CertificateRepository certificateRepository;
    private final StudentRepository studentRepository;
    private final TranscriptRepository transcriptRepository;
    private final PasswordEncoder passwordEncoder;

    public PlatformDataSeeder(SeedProperties properties, ResourceLoader resourceLoader, ObjectMapper objectMapper,
                              TransactionTemplate transactions, CurriculumRepository curriculumRepository,
                              CertificateRepository certificateRepository, StudentRepository studentRepository,
                              TranscriptRepository transcriptRepository, PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.resourceLoader = resourceLoader;
        this.objectMapper = objectMapper;
        this.transactions = transactions;
        this.curriculumRepository = curriculumRepository;
        this.certificateRepository = certificateRepository;
        this.studentRepository = studentRepository;
        this.transcriptRepository = transcriptRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        String curriculumId = transactions.execute(status -> seedCurriculum());
        transactions.executeWithoutResult(status -> syncRequirementNames());

        SeedProperties.DemoAccounts demo = properties.getDemoAccounts();
        if (!demo.isEnabled()) {
            return;
        }
        if (demo.getPassword() == null || demo.getPassword().isBlank()) {
            log.warn("haui.seed.demo-accounts.enabled=true nhưng chưa đặt DEMO_ACCOUNT_PASSWORD: bỏ qua tạo tài khoản demo.");
            return;
        }
        transactions.executeWithoutResult(status -> seedDemoAccounts(curriculumId, demo.getPassword()));
    }

    private String seedCurriculum() {
        JsonNode root = read(properties.getCurriculumResource());
        String curriculumId = root.get("curriculumId").asText();
        curriculumRepository.upsertCurriculum(new CurriculumRepository.CurriculumRow(curriculumId, text(root, "curriculumName"),
                root.get("majorCode").asText(), text(root, "majorName"), text(root, "faculty"), root.path("totalCredits").asInt(),
                text(root, "status"), text(root, "source")));
        int order = 1;
        for (JsonNode course : root.get("courses")) {
            curriculumRepository.upsertCourse(curriculumId, order++, course.get("courseCode").asText(), text(course, "courseName"),
                    course.get("credits").decimalValue(), text(course, "knowledgeBlock"),
                    course.hasNonNull("suggestedSemester") ? course.get("suggestedSemester").asInt() : null,
                    course.path("isMandatory").asBoolean(false), codes(course.path("prerequisites")),
                    codes(course.path("priorCourses")), codes(course.path("corequisites")));
        }
        log.info("Đồng bộ CTĐT {} ({} học phần) từ {}", curriculumId, order - 1, properties.getCurriculumResource());
        return curriculumId;
    }

    private void syncRequirementNames() {
        JsonNode requirements = read(properties.getPolicyResource()).path("graduationRequirements").path("nonCreditRequirements");
        for (JsonNode requirement : requirements) {
            certificateRepository.renameRequirement(text(requirement, "category"), text(requirement, "name"));
        }
    }

    private void seedDemoAccounts(String defaultCurriculumId, String password) {
        Instant now = Instant.now();
        String passwordHash = passwordEncoder.encode(password);
        for (JsonNode profile : read(properties.getStudentProfilesResource()).path("profiles")) {
            String studentId = profile.get("studentId").asText();
            if (studentRepository.existsUser(studentId)) {
                continue;
            }
            String curriculumId = curriculumRepository.findIdByMajorCode(text(profile, "majorCode")).orElse(defaultCurriculumId);
            String majorCode = curriculumRepository.find(curriculumId).orElseThrow().majorCode();
            studentRepository.insertAccount(studentId, passwordHash, text(profile, "fullName"), text(profile, "email"),
                    text(profile, "className"), profile.path("cohort").asText("K19"), curriculumId, majorCode, now);

            Set<String> catalog = curriculumRepository.courseCatalog(curriculumId).keySet();
            List<TranscriptRepository.AttemptToStore> attempts = new ArrayList<>();
            List<String> skipped = new ArrayList<>();
            for (JsonNode attempt : profile.path("courseAttempts")) {
                String code = attempt.get("courseCode").asText();
                if (!catalog.contains(code)) {
                    skipped.add(code);
                    continue;
                }
                attempts.add(new TranscriptRepository.AttemptToStore(code, attempt.get("semesterCode").asText(),
                        decimal(attempt, "score10"), text(attempt, "letterGrade")));
            }
            if (!skipped.isEmpty()) {
                log.warn("Hồ sơ demo {}: bỏ {} lần học vì học phần không có trong CTĐT {}: {}", studentId, skipped.size(), curriculumId, skipped);
            }
            if (!attempts.isEmpty()) {
                transcriptRepository.replaceAll(studentId, attempts, TranscriptSourceType.DEMO_SEED, null, now);
                studentRepository.markTranscriptConfirmed(studentId, TranscriptSourceType.DEMO_SEED, null, now);
            }

            for (JsonNode certificate : profile.path("certificates")) {
                String code = REQUIREMENT_BY_CATEGORY.get(text(certificate, "category"));
                if (code == null) {
                    continue;
                }
                String message = text(certificate, "statusMessage");
                boolean unknown = "UNKNOWN".equalsIgnoreCase(message);
                CertificateStatus status = certificate.path("completed").asBoolean(false) ? CertificateStatus.ACHIEVED
                        : unknown ? CertificateStatus.UNKNOWN : CertificateStatus.NOT_ACHIEVED;
                certificateRepository.findRequirementId(code).ifPresent(requirementId -> certificateRepository.upsertDeclaration(
                        studentId, requirementId, status, CertificateVerification.DEMO_SEED, unknown ? null : message, null, now));
            }
            log.info("Tạo tài khoản demo {} ({} lần học)", studentId, attempts.size());
        }
    }

    private JsonNode read(String location) {
        try (InputStream in = resourceLoader.getResource(location).getInputStream()) {
            return objectMapper.readTree(in);
        } catch (IOException ex) {
            throw new IllegalStateException("Không đọc được fixture seed " + location, ex);
        }
    }

    private static List<String> codes(JsonNode array) {
        List<String> codes = new ArrayList<>();
        array.forEach(node -> codes.add(node.asText()));
        return codes;
    }

    /** Đọc chuỗi từ fixture TV4; sửa chuỗi bị lỗi mã hóa (mojibake) và ghi cảnh báo để TV4 sửa file gốc. */
    private String text(JsonNode node, String field) {
        if (!node.hasNonNull(field)) {
            return null;
        }
        String raw = node.get(field).asText();
        String repaired = FixtureText.repair(raw);
        if (!repaired.equals(raw)) {
            log.warn("Fixture TV4 có chuỗi lỗi mã hóa ở trường {}: \"{}\" → \"{}\" (đã sửa khi seed)", field, raw, repaired);
        }
        return repaired;
    }

    private static BigDecimal decimal(JsonNode node, String field) {
        return node.hasNonNull(field) ? node.get(field).decimalValue() : null;
    }
}
