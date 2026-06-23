# syntax=docker/dockerfile:1
# Multi-stage Maven build for the Staff Engagement backend (Java 21 / Spring Boot).
# Tests run in CI, not during the image build, so the build stage skips them.

# ---- build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY mvnw mvnw.cmd pom.xml ./
COPY .mvn .mvn
RUN ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q clean package -DskipTests \
    && mv target/backend-*.jar target/app.jar

# ---- runtime stage ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
RUN useradd --system --uid 10001 staffeng
COPY --from=build /workspace/target/app.jar /app/app.jar
USER staffeng
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]