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
# Copy TIR API
COPY --from=builder /app/apis/trusted-issuers-registry-v4/package.json ./apis/trusted-issuers-registry-v4/package.json
COPY --from=builder /app/apis/trusted-issuers-registry-v4/dist ./apis/trusted-issuers-registry-v4/dist
COPY --from=builder /app/apis/trusted-issuers-registry-v4/api ./apis/trusted-issuers-registry-v4/api
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
# Copy TIR SC
COPY --from=builder /app/contracts/trusted-issuers-registry/package.json ./contracts/trusted-issuers-registry/package.json
COPY --from=builder /app/contracts/trusted-issuers-registry/dist ./contracts/trusted-issuers-registry/dist
COPY --from=builder /app/contracts/trusted-issuers-registry/artifacts ./contracts/trusted-issuers-registry/artifacts
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
CMD [ "node", "apis/trusted-issuers-registry-v4/dist/main" ]
