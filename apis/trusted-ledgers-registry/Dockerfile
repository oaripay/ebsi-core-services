# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:16.17.1-alpine3.16@sha256:4e36c3dee7c32cef5bfce5bc1b5013d1c3cc542cfdefde2a545ec641e7c94243
WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy TLSR API
COPY --from=builder /app/apis/trusted-ledgers-registry/package.json ./apis/trusted-ledgers-registry/package.json
COPY --from=builder /app/apis/trusted-ledgers-registry/dist ./apis/trusted-ledgers-registry/dist
COPY --from=builder /app/apis/trusted-ledgers-registry/.ci ./apis/trusted-ledgers-registry/.ci
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
# Copy TLSR SC
COPY --from=builder /app/contracts/trusted-ledgers-registry/package.json ./contracts/trusted-ledgers-registry/package.json
COPY --from=builder /app/contracts/trusted-ledgers-registry/dist ./contracts/trusted-ledgers-registry/dist
COPY --from=builder /app/contracts/trusted-ledgers-registry/artifacts ./contracts/trusted-ledgers-registry/artifacts
# Define ENV
ENV NODE_ENV=production
# Install prod dependencies
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean
RUN chown node:node /app
USER node
CMD [ "node", "apis/trusted-ledgers-registry/dist/main" ]
