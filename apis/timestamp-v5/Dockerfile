# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

FROM node:20.18.0-alpine3.20@sha256:b1e0880c3af955867bc2f1944b49d20187beb7afa3f30173e15a97149ab7f5f1

# Update dependencies
RUN apk update && apk upgrade

WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy Timestamp API v5
COPY --from=builder /app/apis/timestamp-v5/package.json ./apis/timestamp-v5/package.json
COPY --from=builder /app/apis/timestamp-v5/dist ./apis/timestamp-v5/dist
COPY --from=builder /app/apis/timestamp-v5/.graphclient ./apis/timestamp-v5/.graphclient
COPY --from=builder /app/apis/timestamp-v5/api ./apis/timestamp-v5/api
# Copy Bootstrap SC v2
COPY --from=builder /app/contracts/bootstrap-v2/package.json ./contracts/bootstrap-v2/package.json
COPY --from=builder /app/contracts/bootstrap-v2/dist ./contracts/bootstrap-v2/dist
COPY --from=builder /app/contracts/bootstrap-v2/artifacts ./contracts/bootstrap-v2/artifacts
# Copy Timestamp SC v3
COPY --from=builder /app/contracts/timestamp-v3/package.json ./contracts/timestamp-v3/package.json
COPY --from=builder /app/contracts/timestamp-v3/dist ./contracts/timestamp-v3/dist
COPY --from=builder /app/contracts/timestamp-v3/artifacts ./contracts/timestamp-v3/artifacts
# Copy Timestamp SC v3 subgraph
COPY --from=builder /app/subgraphs/timestamp-v3/package.json ./subgraphs/timestamp-v3/package.json
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
CMD [ "node", "apis/timestamp-v5/dist/main" ]
