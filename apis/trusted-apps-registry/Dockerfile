# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:16.20.0-alpine3.17@sha256:f1657204d3463bce763cefa5b25e48c28af6fe0cdb0f68b354f0f8225ef61be7

# Fix vulnerable dependencies
# Note: after upgrading the base image, remove this and check if the vulnerabilities are still present
RUN apk update && \
  apk upgrade && \
  apk add --no-cache \
  libcrypto3=3.0.8-r4 \
  libssl3=3.0.8-r4

WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy TAR API
COPY --from=builder /app/apis/trusted-apps-registry/package.json ./apis/trusted-apps-registry/package.json
COPY --from=builder /app/apis/trusted-apps-registry/dist ./apis/trusted-apps-registry/dist
COPY --from=builder /app/apis/trusted-apps-registry/api ./apis/trusted-apps-registry/api
# Copy Bootstrap SC
COPY --from=builder /app/contracts/bootstrap/package.json ./contracts/bootstrap/package.json
COPY --from=builder /app/contracts/bootstrap/dist ./contracts/bootstrap/dist
COPY --from=builder /app/contracts/bootstrap/artifacts ./contracts/bootstrap/artifacts
# Copy DID Registry SC
COPY --from=builder /app/contracts/did-registry/package.json ./contracts/did-registry/package.json
COPY --from=builder /app/contracts/did-registry/dist ./contracts/did-registry/dist
COPY --from=builder /app/contracts/did-registry/artifacts ./contracts/did-registry/artifacts
# Copy TPR SC
COPY --from=builder /app/contracts/trusted-policies-registry/package.json ./contracts/trusted-policies-registry/package.json
COPY --from=builder /app/contracts/trusted-policies-registry/dist ./contracts/trusted-policies-registry/dist
COPY --from=builder /app/contracts/trusted-policies-registry/artifacts ./contracts/trusted-policies-registry/artifacts
# Copy TAR SC
COPY --from=builder /app/contracts/trusted-apps-registry/package.json ./contracts/trusted-apps-registry/package.json
COPY --from=builder /app/contracts/trusted-apps-registry/dist ./contracts/trusted-apps-registry/dist
COPY --from=builder /app/contracts/trusted-apps-registry/artifacts ./contracts/trusted-apps-registry/artifacts
# Copy shared code
COPY --from=builder /app/apis/shared/package.json ./apis/shared/package.json
COPY --from=builder /app/apis/shared/dist ./apis/shared/dist
# Define ENV
ENV NODE_ENV=production
# Install prod dependencies
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean
ARG DOCKER_TAG
RUN echo "DOCKER_TAG=$DOCKER_TAG" >> .env.default
RUN chown node:node /app
USER node
CMD [ "node", "apis/trusted-apps-registry/dist/main" ]
