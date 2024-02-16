# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:20.11.1-alpine3.19@sha256:c0a3badbd8a0a760de903e00cedbca94588e609299820557e72cba2a53dbaa2c

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
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean
ARG DOCKER_TAG
RUN echo "DOCKER_TAG=$DOCKER_TAG" >> .env.default
RUN chown node:node /app
USER node
CMD [ "node", "apis/timestamp/dist/main" ]
