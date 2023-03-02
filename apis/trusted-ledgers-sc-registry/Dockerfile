# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:16.19.1-alpine3.17@sha256:95a849eafc573ad0d972fd67c569369e7aa94d55a21ede3b972e3137e5f8e43a
WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy TLSR API
COPY --from=builder /app/apis/trusted-ledgers-sc-registry/package.json ./apis/trusted-ledgers-sc-registry/package.json
COPY --from=builder /app/apis/trusted-ledgers-sc-registry/dist ./apis/trusted-ledgers-sc-registry/dist
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
COPY --from=builder /app/contracts/trusted-ledgers-sc-registry/package.json ./contracts/trusted-ledgers-sc-registry/package.json
COPY --from=builder /app/contracts/trusted-ledgers-sc-registry/dist ./contracts/trusted-ledgers-sc-registry/dist
COPY --from=builder /app/contracts/trusted-ledgers-sc-registry/artifacts ./contracts/trusted-ledgers-sc-registry/artifacts
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
CMD [ "node", "apis/trusted-ledgers-sc-registry/dist/main" ]
