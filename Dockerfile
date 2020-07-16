# Stage 1: Build Fabric API
FROM maven:3.5-jdk-8-alpine as builder-fabric-api
WORKDIR /api
COPY ./packages/fabric /api
RUN mvn install

# Stage 2: RUN Besu and Fabric APIs
FROM node:12.16.1-alpine
WORKDIR /usr/src/api
RUN apk add --update --no-cache \
  openjdk8-jre-base \
  libc6-compat && \
  mkdir /usr/src/api/besu && \
  mkdir /usr/src/api/fabric

# Besu Files
COPY ./packages/besu/package.json ./packages/besu/yarn.lock /usr/src/api/besu/
RUN cd /usr/src/api/besu/ && yarn install --frozen-lockfile --production && yarn cache clean
COPY ./packages/besu /usr/src/api/besu/

# Fabric Files
COPY --from=builder-fabric-api /api/target/fabric-0.0.1-SNAPSHOT.jar /usr/src/api/fabric
COPY packages/fabric/src/main/resources/server.jks /usr/src/api/fabric/server.jks
COPY packages/fabric/ssl/tlsca.pem /usr/src/api/fabric/tlsca.pem

COPY ./start.sh /usr/src/api

RUN chown -R node:node /usr/src/api
USER node
CMD /usr/src/api/start.sh

EXPOSE 8080
EXPOSE 8081
