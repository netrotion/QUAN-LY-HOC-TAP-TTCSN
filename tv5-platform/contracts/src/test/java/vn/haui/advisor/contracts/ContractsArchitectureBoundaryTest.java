package vn.haui.advisor.contracts;

import org.junit.jupiter.api.Test;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

public class ContractsArchitectureBoundaryTest {

    @Test
    void testContractsDoNotImportProhibitedPackages() throws Exception {
        Path srcDir = Paths.get("").toAbsolutePath();
        if (!srcDir.endsWith("contracts")) {
            srcDir = srcDir.resolve("tv5-platform/contracts");
        }
        Path javaSrc = srcDir.resolve("src/main/java");

        if (Files.exists(javaSrc)) {
            try (Stream<Path> stream = Files.walk(javaSrc)) {
                List<Path> javaFiles = stream.filter(p -> p.toString().endsWith(".java")).toList();
                assertThat(javaFiles).isNotEmpty();

                for (Path javaFile : javaFiles) {
                    List<String> lines = Files.readAllLines(javaFile);
                    for (String line : lines) {
                        String trimmed = line.trim();
                        if (trimmed.startsWith("import ")) {
                            assertThat(trimmed)
                                    .as("Contracts không được import JPA/Entity tại file " + javaFile.getFileName())
                                    .doesNotContain("jakarta.persistence")
                                    .doesNotContain("javax.persistence")
                                    .as("Contracts không được import Spring Web/Controller tại file " + javaFile.getFileName())
                                    .doesNotContain("org.springframework.web")
                                    .doesNotContain("org.springframework.stereotype")
                                    .as("Contracts không được import SQL/Database tại file " + javaFile.getFileName())
                                    .doesNotContain("java.sql")
                                    .doesNotContain("org.postgresql");
                        }
                    }
                }
            }
        }
    }
}
