# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

FROM node:22.14.0-alpine3.21@sha256:9bef0ef1e268f60627da9ba7d7605e8831d5b56ad07487d24d1aa386336d1944

# Install build dependencies
RUN apk update && \
  apk upgrade && \
  apk add --no-cache build-base git py3-pip

WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy Bootstrap SC v2
COPY --from=builder /app/contracts/bootstrap-v2 ./contracts/bootstrap-v2
# Copy DID Registry SC v3
COPY --from=builder /app/contracts/did-registry-v3 ./contracts/did-registry-v3
# Copy DID Registry SC v3 subgraph
COPY --from=builder /app/subgraphs/did-registry-v3 ./subgraphs/did-registry-v3
# Copy DID Registry SC v4
COPY --from=builder /app/contracts/did-registry-v4 ./contracts/did-registry-v4
# Copy DID Registry SC v4 subgraph
COPY --from=builder /app/subgraphs/did-registry-v4 ./subgraphs/did-registry-v4
# Copy Timestamp SC v2
COPY --from=builder /app/contracts/timestamp-v2 ./contracts/timestamp-v2
# Copy Timestamp SC v2 subgraph
COPY --from=builder /app/subgraphs/timestamp-v2 ./subgraphs/timestamp-v2
# Copy Timestamp SC v3
COPY --from=builder /app/contracts/timestamp-v3 ./contracts/timestamp-v3
# Copy Timestamp SC v3 subgraph
COPY --from=builder /app/subgraphs/timestamp-v3 ./subgraphs/timestamp-v3
# Copy TnT SC v2
COPY --from=builder /app/contracts/track-and-trace-v2 ./contracts/track-and-trace-v2
# Copy TnT SC v2 subgraph
COPY --from=builder /app/subgraphs/track-and-trace-v2 ./subgraphs/track-and-trace-v2
# Copy TIR SC v4
COPY --from=builder /app/contracts/trusted-issuers-registry-v4 ./contracts/trusted-issuers-registry-v4
# Copy TIR SC v4 subgraph
COPY --from=builder /app/subgraphs/trusted-issuers-registry-v4 ./subgraphs/trusted-issuers-registry-v4
# Copy TPR SC v2
COPY --from=builder /app/contracts/trusted-policies-registry-v2 ./contracts/trusted-policies-registry-v2
# Copy TPR SC v2 subgraph
COPY --from=builder /app/subgraphs/trusted-policies-registry-v2 ./subgraphs/trusted-policies-registry-v2
# Copy TPR SC v3
COPY --from=builder /app/contracts/trusted-policies-registry-v3 ./contracts/trusted-policies-registry-v3
# Copy TPR SC v3 subgraph
COPY --from=builder /app/subgraphs/trusted-policies-registry-v3 ./subgraphs/trusted-policies-registry-v3
# Copy TSR SC v3
COPY --from=builder /app/contracts/trusted-schemas-registry-v3 ./contracts/trusted-schemas-registry-v3
# Copy TSR SC v3 subgraph
COPY --from=builder /app/subgraphs/trusted-schemas-registry-v3 ./subgraphs/trusted-schemas-registry-v3

# Install all the dependencies
RUN --mount=type=cache,target=/app/.yarn-cache YARN_CACHE_FOLDER=/app/.yarn-cache yarn install --frozen-lockfile --silent

RUN chown -R node:node /app
USER node

# Deploy
CMD [ "sh", "-c", "yarn nx run-many -t deploy -p @ebsiint-subgraph/*" ]
