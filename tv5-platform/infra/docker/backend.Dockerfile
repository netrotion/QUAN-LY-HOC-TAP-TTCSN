# Multi-stage build for Spring Boot Backend
FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /workspace

# Copy POM files first for dependency resolution
COPY pom.xml .
COPY tv5-platform/contracts/pom.xml tv5-platform/contracts/
COPY tv1-ai/pom.xml tv1-ai/
COPY tv4-academic/pom.xml tv4-academic/
COPY tv5-platform/app/pom.xml tv5-platform/app/

# Copy sources of internal modules
COPY tv5-platform/contracts/src tv5-platform/contracts/src
COPY tv1-ai/src tv1-ai/src
COPY tv4-academic/src tv4-academic/src
COPY tv5-platform/app/src tv5-platform/app/src

# Build reactor packages
RUN mvn -B clean package -DskipTests

# Runtime Stage
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN useradd -m -u 1001 appuser
USER appuser

COPY --from=builder /workspace/tv5-platform/app/target/haui-platform-app-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
