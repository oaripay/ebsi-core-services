# Stage 0: Build the project
FROM maven:3.5-jdk-8-alpine as builder-fabric-api
WORKDIR /api
COPY . /api
RUN mvn install

# Stage 1: Run fabric api
FROM openjdk:8
EXPOSE 8080
RUN mkdir /api
WORKDIR /api
COPY --from=builder-fabric-api /api/target/fabric-0.0.1-SNAPSHOT.jar /api

ENTRYPOINT [ "sh", "-c", "java -Djava.security.egd=file:/dev/./urandom -jar /api/fabric-0.0.1-SNAPSHOT.jar" ]
