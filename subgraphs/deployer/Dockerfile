# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

FROM node:22.15.0-alpine3.21@sha256:ad1aedbcc1b0575074a91ac146d6956476c1f9985994810e4ee02efd932a68fd

# Install build dependencies
RUN apk update && \
  apk upgrade && \
  apk add --no-cache build-base git py3-pip

WORKDIR /app

# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json

# Copy contracts
COPY --from=builder /app/contracts/bootstrap-v2 ./contracts/bootstrap-v2
COPY --from=builder /app/contracts/did-registry-v3 ./contracts/did-registry-v3
COPY --from=builder /app/contracts/timestamp-v2 ./contracts/timestamp-v2
COPY --from=builder /app/contracts/track-and-trace ./contracts/track-and-trace
COPY --from=builder /app/contracts/trusted-issuers-registry-v3 ./contracts/trusted-issuers-registry-v3
COPY --from=builder /app/contracts/trusted-policies-registry-v2 ./contracts/trusted-policies-registry-v2
COPY --from=builder /app/contracts/trusted-schemas-registry-v2 ./contracts/trusted-schemas-registry-v2

# Copy subgraphs
COPY --from=builder /app/subgraphs/did-registry-v3 ./subgraphs/did-registry-v3
COPY --from=builder /app/subgraphs/timestamp-v2 ./subgraphs/timestamp-v2
COPY --from=builder /app/subgraphs/track-and-trace-v1 ./subgraphs/track-and-trace-v1
COPY --from=builder /app/subgraphs/trusted-issuers-registry-v3 ./subgraphs/trusted-issuers-registry-v3
COPY --from=builder /app/subgraphs/trusted-policies-registry-v2 ./subgraphs/trusted-policies-registry-v2
COPY --from=builder /app/subgraphs/trusted-schemas-registry-v2 ./subgraphs/trusted-schemas-registry-v2

# Install all the dependencies
RUN --mount=type=cache,target=/app/.yarn-cache YARN_CACHE_FOLDER=/app/.yarn-cache yarn install --frozen-lockfile --silent

RUN chown -R node:node /app
USER node

# Deploy
CMD [ "sh", "-c", "yarn nx run-many -t deploy -p @ebsiint-subgraph/*" ]
