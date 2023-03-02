# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:16.19.1-alpine3.17@sha256:95a849eafc573ad0d972fd67c569369e7aa94d55a21ede3b972e3137e5f8e43a
WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy Authoristion API v3
COPY --from=builder /app/apis/authorisation-v3/package.json ./apis/authorisation-v3/package.json
COPY --from=builder /app/apis/authorisation-v3/dist ./apis/authorisation-v3/dist
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
CMD [ "node", "apis/authorisation-v3/dist/main" ]
