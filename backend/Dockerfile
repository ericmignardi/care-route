# --- build ------------------------------------------------------------------
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Resolve dependencies against the pom alone, so a source change does not re-download
# the tree on every build.
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src

# Tests run in CI against real services; the image build only needs the artifact.
RUN mvn clean package -DskipTests

# --- run --------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Nothing the app does needs root, so drop to an unprivileged user before it runs.
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Globbed so the version in the artifact name does not have to be repeated here.
COPY --from=build /app/target/careroute-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
