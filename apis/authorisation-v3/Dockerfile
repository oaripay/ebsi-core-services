# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:20.11.0-alpine3.19@sha256:8e6a472eb9742f4f486ca9ef13321b7fc2e54f2f60814f339eeda2aff3037573

# Update dependencies
RUN apk update && apk upgrade
WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy Authoristion API v3
COPY --from=builder /app/apis/authorisation-v3/package.json ./apis/authorisation-v3/package.json
COPY --from=builder /app/apis/authorisation-v3/dist ./apis/authorisation-v3/dist
COPY --from=builder /app/apis/authorisation-v3/api ./apis/authorisation-v3/api
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
