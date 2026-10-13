package vn.haui.advisor.contracts;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.BeanDescription;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.introspect.AnnotatedMethod;
import com.fasterxml.jackson.databind.introspect.BeanPropertyDefinition;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tiêu chí nghiệm thu Task 2.4: "Không có hai tên/trường khác nhau cho cùng dữ liệu".
 * Kiểm tra trên cả ba lớp của hợp đồng: Java DTO, OpenAPI V1 và JSON fixtures,
 * đối chiếu với từ điển trường glossary-v1.json.
 */
@DisplayName("contracts-v1: một dữ liệu — một tên trường")
class ContractNamingConsistencyTest {

    private final ObjectMapper mapper = ContractTestSupport.mapper();

    @Test
    @DisplayName("Mọi lớp DTO có schema OpenAPI cùng tên và cùng tập trường")
    void dtoPropertiesMatchOpenApiSchemas() throws Exception {
        Map<String, Map<String, Object>> schemas = ContractTestSupport.openApiSchemas();
        List<String> problems = new ArrayList<>();

        for (Class<?> dto : dtoClasses()) {
            Map<String, Object> schema = schemas.get(dto.getSimpleName());
            if (schema == null) {
                problems.add(dto.getSimpleName() + ": thiếu schema trong openapi-v1.yaml");
                continue;
            }
            if (dto.isEnum()) {
                List<String> constants = Arrays.stream(dto.getEnumConstants()).map(Object::toString).toList();
                if (!constants.equals(schema.get("enum"))) {
                    problems.add(dto.getSimpleName() + ": enum Java " + constants + " khác OpenAPI " + schema.get("enum"));
                }
                continue;
            }
            Set<String> openApiProps = propertyNames(schema);
            Set<String> serialized = jacksonProperties(dto, true);
            Set<String> deserialized = jacksonProperties(dto, false);
            if (!serialized.equals(openApiProps)) {
                problems.add(dto.getSimpleName() + ": DTO ghi ra " + serialized + " nhưng OpenAPI khai báo " + openApiProps);
            }
            if (!deserialized.equals(openApiProps)) {
                problems.add(dto.getSimpleName() + ": DTO đọc vào " + deserialized + " nhưng OpenAPI khai báo " + openApiProps);
            }
        }
        assertThat(problems).isEmpty();
    }

    @Test
    @DisplayName("Kiểu dữ liệu Java của từng trường khớp kiểu OpenAPI")
    @SuppressWarnings("unchecked")
    void dtoPropertyTypesMatchOpenApiTypes() throws Exception {
        Map<String, Map<String, Object>> schemas = ContractTestSupport.openApiSchemas();
        List<String> problems = new ArrayList<>();
        // JSON number nhưng Java còn Integer (DTO 1.0.0), chỉ chấp nhận khi đã ghi trong glossary-v1.json#legacyJavaTypes
        Set<String> legacyIntegers = new HashSet<>();
        for (JsonNode legacy : ContractTestSupport.glossary().path("legacyJavaTypes")) {
            legacyIntegers.add(legacy.get("member").asText());
        }

        for (Class<?> dto : dtoClasses()) {
            if (dto.isEnum() || !schemas.containsKey(dto.getSimpleName())) {
                continue;
            }
            Map<String, Object> properties = (Map<String, Object>) schemas.get(dto.getSimpleName())
                    .getOrDefault("properties", Map.of());
            for (BeanPropertyDefinition property : describe(dto, true).findProperties()) {
                Map<String, Object> propertySchema = (Map<String, Object>) properties.get(property.getName());
                if (propertySchema == null) {
                    continue;
                }
                String expected = openApiType(propertySchema);
                String actual = javaType(property.getPrimaryType());
                String member = dto.getSimpleName() + "." + property.getName();
                if ("number".equals(expected) && "integer".equals(actual) && legacyIntegers.remove(member)) {
                    continue;
                }
                if (!expected.equals(actual)) {
                    problems.add(dto.getSimpleName() + "." + property.getName()
                            + ": Java " + actual + " ≠ OpenAPI " + expected);
                }
            }
        }
        legacyIntegers.forEach(member -> problems.add(member + ": ghi trong legacyJavaTypes nhưng không còn lệch kiểu"));
        assertThat(problems).isEmpty();
    }

    @Test
    @DisplayName("Không DTO nào có hai trường JSON cùng đọc/ghi một dữ liệu (alias getter/setter)")
    void noDtoExposesTheSameValueUnderTwoNames() throws Exception {
        List<String> problems = new ArrayList<>();
        for (Class<?> dto : dtoClasses()) {
            if (dto.isEnum() || Modifier.isAbstract(dto.getModifiers())) {
                continue;
            }
            Object instance = dto.getDeclaredConstructor().newInstance();
            Map<String, Object> sentinels = new HashMap<>();
            int seed = 1;
            for (BeanPropertyDefinition property : describe(dto, false).findProperties()) {
                Object sentinel = sentinelFor(property.getRawPrimaryType(), seed++);
                if (sentinel == null || !property.hasSetter()) {
                    continue;
                }
                property.getSetter().getAnnotated().invoke(instance, sentinel);
                sentinels.put(property.getName(), sentinel);
            }

            JsonNode written = mapper.valueToTree(instance);
            for (Map.Entry<String, Object> entry : sentinels.entrySet()) {
                JsonNode expected = mapper.valueToTree(entry.getValue());
                List<String> holders = new ArrayList<>();
                Iterator<Map.Entry<String, JsonNode>> fields = written.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> field = fields.next();
                    if (sameValue(field.getValue(), expected)) {
                        holders.add(field.getKey());
                    }
                }
                if (holders.size() != 1 || !holders.contains(entry.getKey())) {
                    problems.add(dto.getSimpleName() + ": giá trị ghi vào '" + entry.getKey()
                            + "' xuất hiện ở các trường " + holders);
                }
            }
        }
        assertThat(problems).isEmpty();
    }

    @Test
    @DisplayName("Tên trường đã khai tử không xuất hiện ở DTO, OpenAPI hay fixture")
    void retiredFieldNamesAreGone() throws Exception {
        Map<String, String> retired = retiredNames();
        List<String> problems = new ArrayList<>();

        for (Class<?> dto : dtoClasses()) {
            if (dto.isEnum()) {
                continue;
            }
            for (String name : jacksonProperties(dto, true)) {
                if (retired.containsKey(name)) {
                    problems.add("DTO " + dto.getSimpleName() + "." + name + " → dùng '" + retired.get(name) + "'");
                }
            }
        }

        for (Map.Entry<String, Map<String, Object>> schema : ContractTestSupport.openApiSchemas().entrySet()) {
            for (String name : propertyNames(schema.getValue())) {
                if (retired.containsKey(name)) {
                    problems.add("OpenAPI " + schema.getKey() + "." + name + " → dùng '" + retired.get(name) + "'");
                }
            }
        }

        try (Stream<Path> files = Files.list(ContractTestSupport.examplesDir())) {
            for (Path file : files.filter(p -> p.toString().endsWith(".json")).toList()) {
                if (file.getFileName().toString().equals("fixture-manifest.json")) {
                    continue;
                }
                collectKeys(mapper.readTree(file.toFile()), new TreeSet<>()).stream()
                        .filter(retired::containsKey)
                        .forEach(name -> problems.add("Fixture " + file.getFileName() + ": '" + name
                                + "' → dùng '" + retired.get(name) + "'"));
            }
        }
        assertThat(problems).isEmpty();
    }

    @Test
    @DisplayName("Mọi trường OpenAPI đã đăng ký trong glossary và cùng tên thì cùng kiểu")
    @SuppressWarnings("unchecked")
    void everyFieldIsRegisteredInGlossaryWithOneType() throws Exception {
        JsonNode fields = ContractTestSupport.glossary().get("fields");
        Map<String, Map<String, Object>> schemas = ContractTestSupport.openApiSchemas();
        Map<String, Set<String>> typesByName = new TreeMap<>();
        List<String> problems = new ArrayList<>();

        for (Map.Entry<String, Map<String, Object>> schema : schemas.entrySet()) {
            Map<String, Object> properties = (Map<String, Object>) schema.getValue().getOrDefault("properties", Map.of());
            for (Map.Entry<String, Object> property : properties.entrySet()) {
                String type = jsonKind((Map<String, Object>) property.getValue(), schemas);
                typesByName.computeIfAbsent(property.getKey(), k -> new TreeSet<>()).add(type);
                if (!fields.has(property.getKey())) {
                    problems.add(schema.getKey() + "." + property.getKey() + ": chưa đăng ký trong glossary-v1.json");
                }
            }
        }

        typesByName.forEach((name, types) -> {
            if (types.size() > 1) {
                problems.add("Trường '" + name + "' mang nhiều kiểu khác nhau: " + types);
            }
            if (fields.has(name) && !types.contains(fields.get(name).get("type").asText())) {
                problems.add("Trường '" + name + "' có kiểu " + types + " nhưng glossary ghi "
                        + fields.get(name).get("type").asText());
            }
        });

        Iterator<String> registered = fields.fieldNames();
        while (registered.hasNext()) {
            String name = registered.next();
            if (!typesByName.containsKey(name)) {
                problems.add("Glossary đăng ký '" + name + "' nhưng không schema nào dùng");
            }
        }
        assertThat(problems).isEmpty();
    }

    @Test
    @DisplayName("Accessor Java chuyển tiếp (deprecated) bị ẩn khỏi JSON và có trong glossary")
    void deprecatedJavaBridgesAreHiddenAndTracked() throws Exception {
        Set<String> tracked = new HashSet<>();
        for (JsonNode bridge : ContractTestSupport.glossary().path("javaBridges")) {
            tracked.add(bridge.get("member").asText());
        }

        List<String> problems = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (Class<?> dto : dtoClasses()) {
            for (Method method : dto.getDeclaredMethods()) {
                if (!method.isAnnotationPresent(Deprecated.class)) {
                    continue;
                }
                String member = dto.getSimpleName() + "#" + method.getName();
                seen.add(member);
                if (!method.isAnnotationPresent(JsonIgnore.class)) {
                    problems.add(member + ": accessor deprecated phải có @JsonIgnore");
                }
                if (!tracked.contains(member)) {
                    problems.add(member + ": chưa ghi trong glossary-v1.json#javaBridges");
                }
            }
            for (var constructor : dto.getDeclaredConstructors()) {
                if (!constructor.isAnnotationPresent(Deprecated.class)) {
                    continue;
                }
                String member = dto.getSimpleName() + "#<init>(" + constructor.getParameterCount() + ")";
                seen.add(member);
                if (!tracked.contains(member)) {
                    problems.add(member + ": chưa ghi trong glossary-v1.json#javaBridges");
                }
            }
        }
        for (String member : tracked) {
            if (!seen.contains(member)) {
                problems.add(member + ": glossary ghi javaBridge nhưng DTO không còn accessor này");
            }
        }
        assertThat(problems).isEmpty();
    }

    // ---------------------------------------------------------------------------------------------

    private static List<Class<?>> dtoClasses() throws IOException {
        Path dtoDir = ContractTestSupport.contractsDir().resolve("src/main/java/vn/haui/advisor/contracts/dto");
        List<Class<?>> classes = new ArrayList<>();
        try (Stream<Path> files = Files.list(dtoDir)) {
            for (Path file : files.filter(p -> p.toString().endsWith(".java")).sorted().toList()) {
                String name = file.getFileName().toString().replace(".java", "");
                Class<?> cls = ContractTestSupport.dtoClass(name);
                assertThat(cls).as("Không nạp được lớp %s", name).isNotNull();
                classes.add(cls);
            }
        }
        return classes;
    }

    private BeanDescription describe(Class<?> dto, boolean serialization) {
        JavaType type = mapper.constructType(dto);
        return serialization
                ? mapper.getSerializationConfig().introspect(type)
                : mapper.getDeserializationConfig().introspect(type);
    }

    private Set<String> jacksonProperties(Class<?> dto, boolean serialization) {
        Set<String> names = new TreeSet<>();
        for (BeanPropertyDefinition property : describe(dto, serialization).findProperties()) {
            if (isVisible(property, serialization)) {
                names.add(property.getName());
            }
        }
        return names;
    }

    private static boolean isVisible(BeanPropertyDefinition property, boolean serialization) {
        if (serialization) {
            AnnotatedMethod getter = property.getGetter();
            return getter != null || (property.getField() != null && property.getField().isPublic());
        }
        AnnotatedMethod setter = property.getSetter();
        return setter != null || (property.getField() != null && property.getField().isPublic());
    }

    /**
     * Kiểu JSON trên dây của một trường: enum → string, schema object → object, array giữ kiểu phần tử.
     * Cùng tên trường thì phải cùng kiểu này ở mọi schema.
     */
    @SuppressWarnings("unchecked")
    private static String jsonKind(Map<String, Object> schema, Map<String, Map<String, Object>> schemas) {
        if (schema.containsKey("allOf")) {
            return jsonKind(((List<Map<String, Object>>) schema.get("allOf")).get(0), schemas);
        }
        if (schema.containsKey("$ref")) {
            String ref = (String) schema.get("$ref");
            return jsonKind(schemas.get(ref.substring(ref.lastIndexOf('/') + 1)), schemas);
        }
        String type = (String) schema.get("type");
        if ("array".equals(type)) {
            return "array<" + jsonKind((Map<String, Object>) schema.get("items"), schemas) + ">";
        }
        return type;
    }

    @SuppressWarnings("unchecked")
    private static Set<String> propertyNames(Map<String, Object> schema) {
        Map<String, Object> properties = (Map<String, Object>) schema.getOrDefault("properties", Map.of());
        return new TreeSet<>(properties.keySet());
    }

    @SuppressWarnings("unchecked")
    private static String openApiType(Map<String, Object> schema) {
        if (schema.containsKey("allOf")) {
            return openApiType(((List<Map<String, Object>>) schema.get("allOf")).get(0));
        }
        if (schema.containsKey("$ref")) {
            String ref = (String) schema.get("$ref");
            return "ref:" + ref.substring(ref.lastIndexOf('/') + 1);
        }
        String type = (String) schema.get("type");
        if ("array".equals(type)) {
            return "array<" + openApiType((Map<String, Object>) schema.get("items")) + ">";
        }
        return type;
    }

    private static String javaType(JavaType type) {
        Class<?> raw = type.getRawClass();
        if (List.class.isAssignableFrom(raw)) {
            return "array<" + javaType(type.getContentType()) + ">";
        }
        if (raw == String.class || raw == Instant.class) {
            return "string";
        }
        if (raw == Integer.class || raw == int.class || raw == Long.class || raw == long.class) {
            return "integer";
        }
        if (raw == BigDecimal.class || raw == Double.class || raw == double.class) {
            return "number";
        }
        if (raw == Boolean.class || raw == boolean.class) {
            return "boolean";
        }
        if (raw.getName().startsWith(ContractTestSupport.DTO_PACKAGE)) {
            return "ref:" + raw.getSimpleName();
        }
        return "unsupported:" + raw.getName();
    }

    private static Object sentinelFor(Class<?> type, int seed) {
        if (type == String.class) {
            return "sentinel-" + seed;
        }
        if (type == Integer.class || type == int.class) {
            return 7000 + seed;
        }
        if (type == BigDecimal.class) {
            return new BigDecimal("70." + (100 + seed));
        }
        if (type == List.class) {
            return List.of("sentinel-list-" + seed);
        }
        return null;
    }

    private static boolean sameValue(JsonNode a, JsonNode b) {
        if (a.isNumber() && b.isNumber()) {
            return a.decimalValue().compareTo(b.decimalValue()) == 0;
        }
        return a.equals(b);
    }

    private static Map<String, String> retiredNames() throws IOException {
        Map<String, String> retired = new HashMap<>();
        Iterator<Map.Entry<String, JsonNode>> entries = ContractTestSupport.glossary().get("retired").fields();
        while (entries.hasNext()) {
            Map.Entry<String, JsonNode> entry = entries.next();
            retired.put(entry.getKey(), entry.getValue().get("replacedBy").asText());
        }
        return retired;
    }

    private static Set<String> collectKeys(JsonNode node, Set<String> keys) {
        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                keys.add(field.getKey());
                collectKeys(field.getValue(), keys);
            }
        } else if (node.isArray()) {
            node.forEach(child -> collectKeys(child, keys));
        }
        return keys;
    }
}
