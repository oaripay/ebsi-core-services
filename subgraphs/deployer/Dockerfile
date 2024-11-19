# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

FROM node:20.18.0-alpine3.20@sha256:b1e0880c3af955867bc2f1944b49d20187beb7afa3f30173e15a97149ab7f5f1

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
# Copy DID Registry SC v4
COPY --from=builder /app/contracts/did-registry-v4 ./contracts/did-registry-v4
# Copy DID Registry SC v4 subgraph
COPY --from=builder /app/subgraphs/did-registry-v4 ./subgraphs/did-registry-v4
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
