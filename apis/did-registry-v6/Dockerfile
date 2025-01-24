# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

FROM node:22.11.0-alpine3.20@sha256:b64ced2e7cd0a4816699fe308ce6e8a08ccba463c757c00c14cd372e3d2c763e

# Update dependencies
RUN apk update && apk upgrade

WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy DID Registry API v6
COPY --from=builder /app/apis/did-registry-v6/package.json ./apis/did-registry-v6/package.json
COPY --from=builder /app/apis/did-registry-v6/dist ./apis/did-registry-v6/dist
COPY --from=builder /app/apis/did-registry-v6/.graphclient ./apis/did-registry-v6/.graphclient
COPY --from=builder /app/apis/did-registry-v6/api ./apis/did-registry-v6/api
# Copy Bootstrap SC v2
COPY --from=builder /app/contracts/bootstrap-v2/package.json ./contracts/bootstrap-v2/package.json
COPY --from=builder /app/contracts/bootstrap-v2/dist ./contracts/bootstrap-v2/dist
COPY --from=builder /app/contracts/bootstrap-v2/artifacts ./contracts/bootstrap-v2/artifacts
# Copy DID Registry SC v4
COPY --from=builder /app/contracts/did-registry-v4/package.json ./contracts/did-registry-v4/package.json
COPY --from=builder /app/contracts/did-registry-v4/dist ./contracts/did-registry-v4/dist
COPY --from=builder /app/contracts/did-registry-v4/artifacts ./contracts/did-registry-v4/artifacts
# Copy DID Registry SC v4 subgraph
COPY --from=builder /app/subgraphs/did-registry-v4/package.json ./subgraphs/did-registry-v4/package.json
# Copy TPR SC v3
COPY --from=builder /app/contracts/trusted-policies-registry-v3/package.json ./contracts/trusted-policies-registry-v3/package.json
COPY --from=builder /app/contracts/trusted-policies-registry-v3/dist ./contracts/trusted-policies-registry-v3/dist
COPY --from=builder /app/contracts/trusted-policies-registry-v3/artifacts ./contracts/trusted-policies-registry-v3/artifacts
# Copy shared code
COPY --from=builder /app/apis/shared/package.json ./apis/shared/package.json
COPY --from=builder /app/apis/shared/dist ./apis/shared/dist
# Define ENV
ENV NODE_ENV=production
# Install prod dependencies
RUN --mount=type=cache,target=/app/.yarn-cache YARN_CACHE_FOLDER=/app/.yarn-cache yarn install --frozen-lockfile --silent --production --ignore-scripts
ARG DOCKER_TAG
RUN echo "DOCKER_TAG=$DOCKER_TAG" >> .env.default
RUN chown node:node /app
USER node
CMD [ "node", "apis/did-registry-v6/dist/main" ]
