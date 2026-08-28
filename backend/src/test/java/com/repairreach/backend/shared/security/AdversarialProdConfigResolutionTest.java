package com.repairreach.backend.shared.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Adversarial Production Configuration Resolution Tests")
class AdversarialProdConfigResolutionTest {

    private final YamlPropertySourceLoader loader = new YamlPropertySourceLoader();

    private StandardEnvironment loadProdEnvironment(Map<String, Object> environmentVariables) throws IOException {
        StandardEnvironment env = new StandardEnvironment();
        if (environmentVariables != null && !environmentVariables.isEmpty()) {
            env.getPropertySources().addFirst(new MapPropertySource("testEnvVars", environmentVariables));
        }
        List<PropertySource<?>> sources = loader.load("application-prod.yml", new ClassPathResource("application-prod.yml"));
        for (PropertySource<?> source : sources) {
            env.getPropertySources().addLast(source);
        }
        return env;
    }

    @Test
    @DisplayName("Defaults: application-prod.yml resolves all default values safely when no env vars are provided")
    void shouldResolveSafeDefaultsWithoutEnvVars() throws Exception {
        StandardEnvironment env = loadProdEnvironment(Map.of());

        assertThat(env.resolvePlaceholders("${server.port}")).isEqualTo("8080");
        assertThat(env.resolvePlaceholders("${server.error.include-stacktrace}")).isEqualTo("never");
        assertThat(env.resolvePlaceholders("${server.error.include-message}")).isEqualTo("never");
        assertThat(env.resolvePlaceholders("${server.error.include-binding-errors}")).isEqualTo("never");
        assertThat(env.resolvePlaceholders("${spring.datasource.url}"))
            .isEqualTo("jdbc:postgresql://localhost:5432/postgres?sslmode=require");
        assertThat(env.resolvePlaceholders("${spring.datasource.username}")).isEqualTo("postgres");
        assertThat(env.resolvePlaceholders("${spring.datasource.password}")).isEqualTo("");
        assertThat(env.resolvePlaceholders("${spring.datasource.hikari.maximum-pool-size}")).isEqualTo("10");
        assertThat(env.resolvePlaceholders("${spring.datasource.hikari.minimum-idle}")).isEqualTo("2");
        assertThat(env.resolvePlaceholders("${spring.flyway.enabled}")).isEqualTo("true");
        assertThat(env.resolvePlaceholders("${spring.flyway.baseline-on-migrate}")).isEqualTo("true");
        assertThat(env.resolvePlaceholders("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}"))
            .isEqualTo("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
        assertThat(env.resolvePlaceholders("${app.firebase.project-id}"))
            .isEqualTo("repairreach-prod");
        assertThat(env.resolvePlaceholders("${app.cors.allowed-origins}"))
            .isEqualTo("http://localhost:5173,https://repairreach.vercel.app");
        assertThat(env.resolvePlaceholders("${app.business.default-code}")).isEqualTo("SOLAPUR_MAIN");
        assertThat(env.resolvePlaceholders("${management.endpoints.web.exposure.include}")).isEqualTo("health,info,metrics");
    }

    @Test
    @DisplayName("Security: application.yml base config explicitly locks down server.error and binds firebase defaults")
    void shouldLockdownServerErrorInBaseConfig() throws Exception {
        StandardEnvironment env = new StandardEnvironment();
        List<PropertySource<?>> sources = loader.load("application.yml", new ClassPathResource("application.yml"));
        for (PropertySource<?> source : sources) {
            env.getPropertySources().addLast(source);
        }

        assertThat(env.resolvePlaceholders("${server.error.include-stacktrace}")).isEqualTo("never");
        assertThat(env.resolvePlaceholders("${server.error.include-message}")).isEqualTo("never");
        assertThat(env.resolvePlaceholders("${server.error.include-binding-errors}")).isEqualTo("never");
        assertThat(env.resolvePlaceholders("${app.firebase.project-id}")).isEqualTo("repairreach-dev");
        assertThat(env.resolvePlaceholders("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}"))
            .isEqualTo("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
    }

    @Test
    @DisplayName("Placeholders: FIREBASE_PROJECT_ID dynamically configures app.firebase.project-id")
    void shouldComputeFirebaseProjectIdFromEnvVar() throws Exception {
        StandardEnvironment env = loadProdEnvironment(Map.of(
            "FIREBASE_PROJECT_ID", "solapur-prod-xyz987"
        ));

        assertThat(env.resolvePlaceholders("${app.firebase.project-id}"))
            .isEqualTo("solapur-prod-xyz987");
    }

    @Test
    @DisplayName("Placeholders: Explicit SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI overrides Google default JWKS URI")
    void shouldAllowDirectJwksUriOverride() throws Exception {
        StandardEnvironment env = loadProdEnvironment(Map.of(
            "SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI", "https://custom-auth.example.com/.well-known/jwks.json"
        ));

        assertThat(env.resolvePlaceholders("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}"))
            .isEqualTo("https://custom-auth.example.com/.well-known/jwks.json");
    }

    @Test
    @DisplayName("Placeholders: Direct SPRING_DATASOURCE_URL overrides DB_HOST, DB_PORT, DB_NAME")
    void shouldAllowDirectSpringDatasourceUrlOverride() throws Exception {
        StandardEnvironment env = loadProdEnvironment(Map.of(
            "SPRING_DATASOURCE_URL", "jdbc:postgresql://db.projref.supabase.co:5432/postgres?sslmode=require",
            "SPRING_DATASOURCE_USERNAME", "postgres.projref",
            "SPRING_DATASOURCE_PASSWORD", "SuperSecurePassword123!",
            "PORT", "10000",
            "DB_POOL_MAX", "15",
            "DB_POOL_MIN_IDLE", "3",
            "CORS_ALLOWED_ORIGINS", "https://custom.repairreach.in,https://admin.repairreach.in",
            "FIREBASE_PROJECT_ID", "custom-project-id"
        ));

        assertThat(env.resolvePlaceholders("${server.port}")).isEqualTo("10000");
        assertThat(env.resolvePlaceholders("${spring.datasource.url}"))
            .isEqualTo("jdbc:postgresql://db.projref.supabase.co:5432/postgres?sslmode=require");
        assertThat(env.resolvePlaceholders("${spring.datasource.username}")).isEqualTo("postgres.projref");
        assertThat(env.resolvePlaceholders("${spring.datasource.password}")).isEqualTo("SuperSecurePassword123!");
        assertThat(env.resolvePlaceholders("${spring.datasource.hikari.maximum-pool-size}")).isEqualTo("15");
        assertThat(env.resolvePlaceholders("${spring.datasource.hikari.minimum-idle}")).isEqualTo("3");
        assertThat(env.resolvePlaceholders("${app.cors.allowed-origins}"))
            .isEqualTo("https://custom.repairreach.in,https://admin.repairreach.in");
        assertThat(env.resolvePlaceholders("${app.firebase.project-id}")).isEqualTo("custom-project-id");
    }

    @Test
    @DisplayName("Placeholders: Composite DB_HOST, DB_PORT, DB_NAME fallback resolves correctly")
    void shouldResolveCompositeDatabaseUrl() throws Exception {
        StandardEnvironment env = loadProdEnvironment(Map.of(
            "DB_HOST", "db.custom-supabase.internal",
            "DB_PORT", "6543",
            "DB_NAME", "repairreach_production"
        ));

        assertThat(env.resolvePlaceholders("${spring.datasource.url}"))
            .isEqualTo("jdbc:postgresql://db.custom-supabase.internal:6543/repairreach_production?sslmode=require");
    }
}
