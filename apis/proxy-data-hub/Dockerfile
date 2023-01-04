# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:16.19.0-alpine3.17@sha256:58e4dfcf063f67d71e608c3cace5a0bcf39e9dbab3047b41e20c15c7132d1d46
WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy Proxy Data Hub API
COPY --from=builder /app/apis/proxy-data-hub/package.json ./apis/proxy-data-hub/package.json
COPY --from=builder /app/apis/proxy-data-hub/dist ./apis/proxy-data-hub/dist
# Copy shared code
COPY --from=builder /app/apis/shared/package.json ./apis/shared/package.json
COPY --from=builder /app/apis/shared/dist ./apis/shared/dist
# Define ENV
ENV NODE_ENV=production
# This is required for nestjs runtime.
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean
ARG DOCKER_TAG
RUN echo "DOCKER_TAG=$DOCKER_TAG" >> .env.default
RUN chown node:node /app
USER node
CMD [ "node", "apis/proxy-data-hub/dist/main" ]
