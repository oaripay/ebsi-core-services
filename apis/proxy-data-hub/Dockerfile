# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:16.18.1-alpine3.16@sha256:15dd66f723aab8b367abc7ac6ed25594ca4653f2ce49ad1505bfbe740ad5190e
WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy Proxy Data Hub API
COPY --from=builder /app/apis/proxy-data-hub/package.json ./apis/proxy-data-hub/package.json
COPY --from=builder /app/apis/proxy-data-hub/dist ./apis/proxy-data-hub/dist
# Copy shared code
COPY --from=builder /app/apis/shared/package.json ./apis/shared/package.json
COPY --from=builder /app/apis/shared/src ./apis/shared/src
# Define ENV
ENV NODE_ENV=production
# This is required for nestjs runtime.
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean
ARG DOCKER_TAG
RUN echo "DOCKER_TAG=$DOCKER_TAG" >> .env.default
RUN chown node:node /app
USER node
CMD [ "node", "apis/proxy-data-hub/dist/main" ]
