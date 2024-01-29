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
# Copy TAR API v4
COPY --from=builder /app/apis/trusted-apps-registry-v4/package.json ./apis/trusted-apps-registry-v4/package.json
COPY --from=builder /app/apis/trusted-apps-registry-v4/dist ./apis/trusted-apps-registry-v4/dist
COPY --from=builder /app/apis/trusted-apps-registry-v4/api ./apis/trusted-apps-registry-v4/api
# Copy Bootstrap SC v2
COPY --from=builder /app/contracts/bootstrap-v2/package.json ./contracts/bootstrap-v2/package.json
COPY --from=builder /app/contracts/bootstrap-v2/dist ./contracts/bootstrap-v2/dist
COPY --from=builder /app/contracts/bootstrap-v2/artifacts ./contracts/bootstrap-v2/artifacts
# Copy DID Registry SC v3
COPY --from=builder /app/contracts/did-registry-v3/package.json ./contracts/did-registry-v3/package.json
COPY --from=builder /app/contracts/did-registry-v3/dist ./contracts/did-registry-v3/dist
COPY --from=builder /app/contracts/did-registry-v3/artifacts ./contracts/did-registry-v3/artifacts
# Copy TPR SC v2
COPY --from=builder /app/contracts/trusted-policies-registry-v2/package.json ./contracts/trusted-policies-registry-v2/package.json
COPY --from=builder /app/contracts/trusted-policies-registry-v2/dist ./contracts/trusted-policies-registry-v2/dist
COPY --from=builder /app/contracts/trusted-policies-registry-v2/artifacts ./contracts/trusted-policies-registry-v2/artifacts
# Copy TAR SC v3
COPY --from=builder /app/contracts/trusted-apps-registry-v3/package.json ./contracts/trusted-apps-registry-v3/package.json
COPY --from=builder /app/contracts/trusted-apps-registry-v3/dist ./contracts/trusted-apps-registry-v3/dist
COPY --from=builder /app/contracts/trusted-apps-registry-v3/artifacts ./contracts/trusted-apps-registry-v3/artifacts
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
CMD [ "node", "apis/trusted-apps-registry-v4/dist/main" ]
