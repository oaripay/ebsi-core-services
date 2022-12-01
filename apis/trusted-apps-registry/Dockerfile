# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:16.18.1-alpine3.16@sha256:15dd66f723aab8b367abc7ac6ed25594ca4653f2ce49ad1505bfbe740ad5190e
WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy TAR API
COPY --from=builder /app/apis/trusted-apps-registry/package.json ./apis/trusted-apps-registry/package.json
COPY --from=builder /app/apis/trusted-apps-registry/dist ./apis/trusted-apps-registry/dist
# Copy Bootstrap SC
COPY --from=builder /app/contracts/bootstrap/package.json ./contracts/bootstrap/package.json
COPY --from=builder /app/contracts/bootstrap/dist ./contracts/bootstrap/dist
COPY --from=builder /app/contracts/bootstrap/artifacts ./contracts/bootstrap/artifacts
# Copy DID Registry SC
COPY --from=builder /app/contracts/did-registry/package.json ./contracts/did-registry/package.json
COPY --from=builder /app/contracts/did-registry/dist ./contracts/did-registry/dist
COPY --from=builder /app/contracts/did-registry/artifacts ./contracts/did-registry/artifacts
# Copy TPR SC
COPY --from=builder /app/contracts/trusted-policies-registry/package.json ./contracts/trusted-policies-registry/package.json
COPY --from=builder /app/contracts/trusted-policies-registry/dist ./contracts/trusted-policies-registry/dist
COPY --from=builder /app/contracts/trusted-policies-registry/artifacts ./contracts/trusted-policies-registry/artifacts
# Copy TAR SC
COPY --from=builder /app/contracts/trusted-apps-registry/package.json ./contracts/trusted-apps-registry/package.json
COPY --from=builder /app/contracts/trusted-apps-registry/dist ./contracts/trusted-apps-registry/dist
COPY --from=builder /app/contracts/trusted-apps-registry/artifacts ./contracts/trusted-apps-registry/artifacts
# Copy shared code
COPY --from=builder /app/apis/shared/package.json ./apis/shared/package.json
COPY --from=builder /app/apis/shared/src ./apis/shared/src
# Define ENV
ENV NODE_ENV=production
# Install prod dependencies
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean
ARG DOCKER_TAG
RUN echo "DOCKER_TAG=$DOCKER_TAG" >> .env.default
RUN chown node:node /app
USER node
CMD [ "node", "apis/trusted-apps-registry/dist/main" ]
