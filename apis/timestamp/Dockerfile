# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

FROM node:22.16.0-alpine3.21@sha256:9f3ae04faa4d2188825803bf890792f33cc39033c9241fc6bb201149470436ca

# Update dependencies
RUN apk update && apk upgrade

WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy Timestamp API
COPY --from=builder /app/apis/timestamp/package.json ./apis/timestamp/package.json
COPY --from=builder /app/apis/timestamp/dist ./apis/timestamp/dist
COPY --from=builder /app/apis/timestamp/api ./apis/timestamp/api
# Copy Bootstrap SC
COPY --from=builder /app/contracts/bootstrap/package.json ./contracts/bootstrap/package.json
COPY --from=builder /app/contracts/bootstrap/dist ./contracts/bootstrap/dist
COPY --from=builder /app/contracts/bootstrap/artifacts ./contracts/bootstrap/artifacts
# Copy Timestamp SC
COPY --from=builder /app/contracts/timestamp/package.json ./contracts/timestamp/package.json
COPY --from=builder /app/contracts/timestamp/dist ./contracts/timestamp/dist
COPY --from=builder /app/contracts/timestamp/artifacts ./contracts/timestamp/artifacts
# Copy TPR SC
COPY --from=builder /app/contracts/trusted-policies-registry/package.json ./contracts/trusted-policies-registry/package.json
COPY --from=builder /app/contracts/trusted-policies-registry/dist ./contracts/trusted-policies-registry/dist
COPY --from=builder /app/contracts/trusted-policies-registry/artifacts ./contracts/trusted-policies-registry/artifacts
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
CMD [ "node", "apis/timestamp/dist/main" ]
