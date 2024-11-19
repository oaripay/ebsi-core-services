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
# Copy Authoristion API v4
COPY --from=builder /app/apis/authorisation-v4/package.json ./apis/authorisation-v4/package.json
COPY --from=builder /app/apis/authorisation-v4/dist ./apis/authorisation-v4/dist
COPY --from=builder /app/apis/authorisation-v4/api ./apis/authorisation-v4/api
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
CMD [ "node", "apis/authorisation-v4/dist/main" ]
