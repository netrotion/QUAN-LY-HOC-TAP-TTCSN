package vn.haui.advisor.academic.fixture;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public class AcademicFixtureLoader {

    private static final ObjectMapper MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    public static PolicyDemo loadPolicyDemo() {
        return loadObject("/fixtures/policy-demo.json", "policy-demo.json", PolicyDemo.class);
    }

    public static CurriculumFixture loadCurriculum() {
        return loadObject("/fixtures/curriculum-it-v0.json", "curriculum-it-v0.json", CurriculumFixture.class);
    }

    public static CurriculumFixture loadCurriculumV1() {
        return loadObject("/fixtures/curriculum-ktpm-v1.json", "curriculum-ktpm-v1.json", CurriculumFixture.class);
    }

    public static Map<String, StudentProfileFixture> loadStudentProfiles() {
        Map<String, StudentProfileFixture> map = new LinkedHashMap<>();
        map.putAll(loadStudentProfilesFromPath("/fixtures/student-profiles-v0.json", "student-profiles-v0.json"));
        map.putAll(loadStudentProfilesFromPath("/fixtures/student-profiles-v1.json", "student-profiles-v1.json"));
        return Collections.unmodifiableMap(map);
    }

    public static Map<String, StudentProfileFixture> loadStudentProfilesV1() {
        return Collections.unmodifiableMap(loadStudentProfilesFromPath("/fixtures/student-profiles-v1.json", "student-profiles-v1.json"));
    }

    private static Map<String, StudentProfileFixture> loadStudentProfilesFromPath(String resourcePath, String fixtureFileName) {
        try {
            byte[] bytes = readFixtureBytes(resourcePath, fixtureFileName);
            JsonNode root = MAPPER.readTree(bytes);
            JsonNode profilesNode = root.get("profiles");
            if (profilesNode == null || !profilesNode.isArray()) {
                return Collections.emptyMap();
            }

            Map<String, StudentProfileFixture> map = new LinkedHashMap<>();
            for (JsonNode node : profilesNode) {
                StudentProfileFixture profile = MAPPER.treeToValue(node, StudentProfileFixture.class);
                if (profile.getStudentId() != null) {
                    map.put(profile.getStudentId(), profile);
                }
            }
            return map;
        } catch (IOException e) {
            throw new IllegalStateException("Không thể đọc " + fixtureFileName + ": " + e.getMessage(), e);
        }
    }

    private static <T> T loadObject(String resourcePath, String fixtureFileName, Class<T> clazz) {
        try {
            byte[] bytes = readFixtureBytes(resourcePath, fixtureFileName);
            return MAPPER.readValue(bytes, clazz);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể tải fixture " + fixtureFileName + ": " + e.getMessage(), e);
        }
    }

    private static byte[] readFixtureBytes(String resourcePath, String fixtureFileName) throws IOException {
        // 1. Thử đọc từ classpath
        try (InputStream is = AcademicFixtureLoader.class.getResourceAsStream(resourcePath)) {
            if (is != null) {
                return is.readAllBytes();
            }
        }

        // 2. Thử đọc từ hệ thống tệp cục bộ
        Path[] candidatePaths = new Path[] {
                Paths.get("fixtures", fixtureFileName),
                Paths.get("tv4-academic", "fixtures", fixtureFileName),
                Paths.get("..", "tv4-academic", "fixtures", fixtureFileName),
                Paths.get("tv4-academic", "src", "main", "resources", "fixtures", fixtureFileName)
        };

        for (Path p : candidatePaths) {
            if (Files.exists(p)) {
                return Files.readAllBytes(p);
            }
        }

        throw new IOException("Không tìm thấy fixture file " + fixtureFileName + " trên classpath hoặc filesystem.");
    }
}
