package vn.haui.advisor.contracts;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Bộ kiểm tra JSON theo tập con OpenAPI 3.0 mà contracts-v1 sử dụng:
 * type, format số, enum, nullable, required, $ref, items, readOnly.
 * Mọi object được coi là đóng (không cho phép trường ngoài schema) để phát hiện tên trường lệch.
 */
public final class OpenApiSchemaValidator {

    private final Map<String, Map<String, Object>> schemas;

    public OpenApiSchemaValidator(Map<String, Map<String, Object>> schemas) {
        this.schemas = schemas;
    }

    public List<String> validate(JsonNode node, String schemaName) {
        List<String> errors = new ArrayList<>();
        Map<String, Object> schema = schemas.get(schemaName);
        if (schema == null) {
            errors.add("Schema không tồn tại trong OpenAPI: " + schemaName);
            return errors;
        }
        validateNode(node, schema, "$", errors);
        return errors;
    }

    @SuppressWarnings("unchecked")
    private void validateNode(JsonNode node, Map<String, Object> schema, String path, List<String> errors) {
        if (node == null || node.isNull()) {
            if (!Boolean.TRUE.equals(schema.get("nullable"))) {
                errors.add(path + ": null nhưng schema không khai báo nullable");
            }
            return;
        }

        // OpenAPI 3.0: tham chiếu nullable được viết dạng allOf: [$ref] + nullable: true
        if (schema.containsKey("allOf")) {
            for (Map<String, Object> part : (List<Map<String, Object>>) schema.get("allOf")) {
                validateNode(node, part, path, errors);
            }
            return;
        }

        if (schema.containsKey("$ref")) {
            String ref = (String) schema.get("$ref");
            String name = ref.substring(ref.lastIndexOf('/') + 1);
            Map<String, Object> target = schemas.get(name);
            if (target == null) {
                errors.add(path + ": $ref không giải được " + ref);
                return;
            }
            validateNode(node, target, path, errors);
            return;
        }

        String type = (String) schema.get("type");
        if (type == null) {
            errors.add(path + ": schema thiếu type");
            return;
        }

        switch (type) {
            case "object" -> validateObject(node, schema, path, errors);
            case "array" -> {
                if (!node.isArray()) {
                    errors.add(path + ": cần array");
                    return;
                }
                Map<String, Object> items = (Map<String, Object>) schema.get("items");
                for (int i = 0; i < node.size(); i++) {
                    validateNode(node.get(i), items, path + "[" + i + "]", errors);
                }
            }
            case "string" -> {
                if (!node.isTextual()) {
                    errors.add(path + ": cần string");
                    return;
                }
                String text = node.asText();
                List<Object> allowed = (List<Object>) schema.get("enum");
                if (allowed != null && !allowed.contains(text)) {
                    errors.add(path + ": giá trị '" + text + "' ngoài enum " + allowed);
                }
                String pattern = (String) schema.get("pattern");
                if (pattern != null && !Pattern.compile(pattern).matcher(text).find()) {
                    errors.add(path + ": '" + text + "' không khớp pattern " + pattern);
                }
                validateFormat(text, (String) schema.get("format"), path, errors);
            }
            case "integer" -> {
                if (!node.isIntegralNumber()) {
                    errors.add(path + ": cần integer");
                }
            }
            case "number" -> {
                if (!node.isNumber()) {
                    errors.add(path + ": cần number");
                }
            }
            case "boolean" -> {
                if (!node.isBoolean()) {
                    errors.add(path + ": cần boolean");
                }
            }
            default -> errors.add(path + ": type không hỗ trợ " + type);
        }
    }

    private static void validateFormat(String text, String format, String path, List<String> errors) {
        if (format == null) {
            return;
        }
        try {
            switch (format) {
                case "date-time" -> OffsetDateTime.parse(text);
                case "date" -> LocalDate.parse(text);
                default -> {
                }
            }
        } catch (DateTimeParseException e) {
            errors.add(path + ": '" + text + "' sai định dạng " + format);
        }
    }

    @SuppressWarnings("unchecked")
    private void validateObject(JsonNode node, Map<String, Object> schema, String path, List<String> errors) {
        if (!node.isObject()) {
            errors.add(path + ": cần object");
            return;
        }
        Map<String, Object> properties = (Map<String, Object>) schema.getOrDefault("properties", Map.of());
        List<String> required = (List<String>) schema.getOrDefault("required", List.of());

        for (String name : required) {
            if (!node.has(name)) {
                errors.add(path + ": thiếu trường bắt buộc '" + name + "'");
            }
        }

        Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            Map<String, Object> propertySchema = (Map<String, Object>) properties.get(field.getKey());
            if (propertySchema == null) {
                errors.add(path + ": trường '" + field.getKey() + "' không có trong schema");
                continue;
            }
            validateNode(field.getValue(), propertySchema, path + "." + field.getKey(), errors);
        }
    }
}
