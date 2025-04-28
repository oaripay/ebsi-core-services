# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

FROM node:22.15.0-alpine3.21@sha256:ad1aedbcc1b0575074a91ac146d6956476c1f9985994810e4ee02efd932a68fd

# Update dependencies
RUN apk update && apk upgrade

WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy Ledger API v4
COPY --from=builder /app/apis/ledger-v4/package.json ./apis/ledger-v4/package.json
COPY --from=builder /app/apis/ledger-v4/dist ./apis/ledger-v4/dist
COPY --from=builder /app/apis/ledger-v4/api ./apis/ledger-v4/api
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
CMD [ "node", "apis/ledger-v4/dist/main" ]
