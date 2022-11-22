# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:16.17.1-alpine3.16@sha256:4e36c3dee7c32cef5bfce5bc1b5013d1c3cc542cfdefde2a545ec641e7c94243
WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy DID Registry API v4
COPY --from=builder /app/apis/did-registry-v4/package.json ./apis/did-registry-v4/package.json
COPY --from=builder /app/apis/did-registry-v4/dist ./apis/did-registry-v4/dist
# Copy Bootstrap SC
COPY --from=builder /app/contracts/bootstrap/package.json ./contracts/bootstrap/package.json
COPY --from=builder /app/contracts/bootstrap/dist ./contracts/bootstrap/dist
COPY --from=builder /app/contracts/bootstrap/artifacts ./contracts/bootstrap/artifacts
# Copy DID Registry SC v4
COPY --from=builder /app/contracts/did-registry-v4/package.json ./contracts/did-registry-v4/package.json
COPY --from=builder /app/contracts/did-registry-v4/dist ./contracts/did-registry-v4/dist
COPY --from=builder /app/contracts/did-registry-v4/artifacts ./contracts/did-registry-v4/artifacts
# Copy TPR SC
COPY --from=builder /app/contracts/trusted-policies-registry/package.json ./contracts/trusted-policies-registry/package.json
COPY --from=builder /app/contracts/trusted-policies-registry/dist ./contracts/trusted-policies-registry/dist
COPY --from=builder /app/contracts/trusted-policies-registry/artifacts ./contracts/trusted-policies-registry/artifacts
# Define ENV
ENV NODE_ENV=production
# Install prod dependencies
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean
ARG DOCKER_TAG
RUN echo "DOCKER_TAG=$DOCKER_TAG" >> .env.default
RUN chown node:node /app
USER node
CMD [ "node", "apis/did-registry-v4/dist/main" ]
