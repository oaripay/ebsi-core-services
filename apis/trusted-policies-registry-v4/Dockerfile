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
# Copy TPR API v4
COPY --from=builder /app/apis/trusted-policies-registry-v4/package.json ./apis/trusted-policies-registry-v4/package.json
COPY --from=builder /app/apis/trusted-policies-registry-v4/dist ./apis/trusted-policies-registry-v4/dist
COPY --from=builder /app/apis/trusted-policies-registry-v4/api ./apis/trusted-policies-registry-v4/api
COPY --from=builder /app/apis/trusted-policies-registry-v4/.graphclient ./apis/trusted-policies-registry-v4/.graphclient
# Copy TPR SC v3
COPY --from=builder /app/contracts/trusted-policies-registry-v3/package.json ./contracts/trusted-policies-registry-v3/package.json
COPY --from=builder /app/contracts/trusted-policies-registry-v3/dist ./contracts/trusted-policies-registry-v3/dist
COPY --from=builder /app/contracts/trusted-policies-registry-v3/artifacts ./contracts/trusted-policies-registry-v3/artifacts
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
CMD [ "node", "apis/trusted-policies-registry-v4/dist/main" ]
