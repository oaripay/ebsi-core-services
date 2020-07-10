# Stage 0: Build the project
FROM maven:3.5-jdk-8-alpine as builder-fabric-api
WORKDIR /api
COPY . /api
RUN mvn install

# Stage 1: Run fabric api
FROM openjdk:8
EXPOSE 8081
WORKDIR /api
RUN mkdir /api/fabric
COPY --from=builder-fabric-api /api/target/fabric-0.0.1-SNAPSHOT.jar /api
COPY src/main/resources/server.jks /app/server.jks
COPY ssl/tlsca.pem /api/fabric/tlsca.pem

ENTRYPOINT [ "sh", "-c", "java -Djava.security.egd=file:/dev/./urandom -jar /api/fabric-0.0.1-SNAPSHOT.jar" ]
