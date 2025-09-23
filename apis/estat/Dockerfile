# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

FROM node:22.18.0-alpine3.22@sha256:1b2479dd35a99687d6638f5976fd235e26c5b37e8122f786fcd5fe231d63de5b

# Update dependencies
RUN apk update && apk upgrade

WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy TnT API v1
COPY --from=builder /app/apis/estat/package.json ./apis/estat/package.json
COPY --from=builder /app/apis/estat/dist ./apis/estat/dist
COPY --from=builder /app/apis/estat/api ./apis/estat/api
# Copy Bootstrap SC v2
COPY --from=builder /app/contracts/bootstrap-v2/package.json ./contracts/bootstrap-v2/package.json
COPY --from=builder /app/contracts/bootstrap-v2/dist ./contracts/bootstrap-v2/dist
COPY --from=builder /app/contracts/bootstrap-v2/artifacts ./contracts/bootstrap-v2/artifacts
# Copy TPR SC v3
COPY --from=builder /app/contracts/trusted-policies-registry-v3/package.json ./contracts/trusted-policies-registry-v3/package.json
COPY --from=builder /app/contracts/trusted-policies-registry-v3/dist ./contracts/trusted-policies-registry-v3/dist
COPY --from=builder /app/contracts/trusted-policies-registry-v3/artifacts ./contracts/trusted-policies-registry-v3/artifacts
# Copy DID Registry SC v5
COPY --from=builder /app/contracts/did-registry-v5/package.json ./contracts/did-registry-v5/package.json
COPY --from=builder /app/contracts/did-registry-v5/dist ./contracts/did-registry-v5/dist
COPY --from=builder /app/contracts/did-registry-v5/artifacts ./contracts/did-registry-v5/artifacts
# Copy Track and Trace SC v1
COPY --from=builder /app/contracts/track-and-trace/package.json ./contracts/track-and-trace/package.json
COPY --from=builder /app/contracts/track-and-trace/dist ./contracts/track-and-trace/dist
COPY --from=builder /app/contracts/track-and-trace/artifacts ./contracts/track-and-trace/artifacts
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
CMD [ "node", "apis/estat/dist/main" ]
