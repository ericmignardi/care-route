# ==========================================
# Stage 1: Build the application
# ==========================================
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Copy the pom.xml to cache dependencies
COPY pom.xml .

# Download dependencies offline (helps speed up subsequent builds)
RUN mvn dependency:go-offline -B

# Copy source code and build package (skipping tests for build speed/isolation)
COPY src ./src
RUN mvn clean package -DskipTests

# ==========================================
# Stage 2: Runtime image
# ==========================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy target JAR file from builder
COPY --from=builder /app/target/demo-*.jar app.jar

# Expose port (default Spring Boot port)
EXPOSE 8080

# Run the jar file
ENTRYPOINT ["java", "-jar", "app.jar"]
