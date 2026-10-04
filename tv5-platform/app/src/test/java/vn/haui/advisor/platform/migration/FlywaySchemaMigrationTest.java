package vn.haui.advisor.platform.migration;

import org.flywaydb.core.Flyway;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Flyway Schema Migration Test (V1 & V2 Comprehensive Domain)")
public class FlywaySchemaMigrationTest {

    @Test
    @DisplayName("Should successfully apply V1 and V2 migrations on test database and create all required tables")
    void shouldApplyAllMigrationsSuccessfullyOnTestDatabase() throws Exception {
        JdbcDataSource ds = new JdbcDataSource();
        ds.setURL("jdbc:h2:mem:migration_test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH");
        ds.setUser("sa");
        ds.setPassword("");

        Flyway flyway = Flyway.configure()
                .dataSource(ds)
                .locations("classpath:db/migration")
                .placeholders(Map.of("pgvector_init", "-- test db: pgvector skipped"))
                .load();

        var result = flyway.migrate();
        assertTrue(result.success, "Flyway migration must report success");
        assertEquals(2, result.migrationsExecuted, "Expected V1 and V2 migrations to be executed");

        // Verify that all core entities from PRD §8 & Task 2.2d exist in DB
        String[] requiredTables = {
                "system_settings",
                "audit_logs",
                "users",
                "student_records",
                "curricula",
                "curriculum_versions",
                "courses",
                "course_relations",
                "course_offerings",
                "enrollment_attempts",
                "audit_requirements",
                "student_audit_checklists",
                "import_sessions",
                "study_plans",
                "plan_semesters",
                "planned_courses",
                "plan_actions",
                "conversations",
                "conversation_messages",
                "knowledge_sources"
        };

        try (Connection conn = ds.getConnection();
             Statement stmt = conn.createStatement()) {
            for (String tableName : requiredTables) {
                try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM " + tableName)) {
                    assertTrue(rs.next(), "Table " + tableName + " must be queryable");
                }
            }
        }
    }
}
