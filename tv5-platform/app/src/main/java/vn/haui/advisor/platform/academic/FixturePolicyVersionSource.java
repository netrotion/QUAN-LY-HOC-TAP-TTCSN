package vn.haui.advisor.platform.academic;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import vn.haui.advisor.platform.config.SeedProperties;

import java.io.IOException;
import java.io.InputStream;

/**
 * Phiên bản quy chế lấy từ fixture quy chế của TV4 (policyId@version), cùng nguồn với engine học vụ.
 */
@Component
public class FixturePolicyVersionSource implements PolicyVersionSource {

    private static final Logger log = LoggerFactory.getLogger(FixturePolicyVersionSource.class);
    static final String UNKNOWN = "policy-unknown";

    private final String policyVersion;

    public FixturePolicyVersionSource(SeedProperties properties, ResourceLoader resourceLoader, ObjectMapper objectMapper) {
        this.policyVersion = read(properties.getPolicyResource(), resourceLoader, objectMapper);
    }

    @Override
    public String currentPolicyVersion() {
        return policyVersion;
    }

    private static String read(String location, ResourceLoader resourceLoader, ObjectMapper objectMapper) {
        try (InputStream in = resourceLoader.getResource(location).getInputStream()) {
            JsonNode policy = objectMapper.readTree(in);
            String id = policy.path("policyId").asText(null);
            String version = policy.path("version").asText(null);
            if (id != null && version != null) {
                return id + "@" + version;
            }
            log.warn("Fixture quy chế {} thiếu policyId/version; dùng {}", location, UNKNOWN);
        } catch (IOException ex) {
            log.warn("Không đọc được fixture quy chế {}: {}; dùng {}", location, ex.getMessage(), UNKNOWN);
        }
        return UNKNOWN;
    }
}
