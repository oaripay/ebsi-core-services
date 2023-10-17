# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:18.17.1-alpine3.18@sha256:3482a20c97e401b56ac50ba8920cc7b5b2022bfc6aa7d4e4c231755770cf892f

# Update dependencies
RUN apk update && apk upgrade

WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy TIR API v5
COPY --from=builder /app/apis/trusted-issuers-registry-v5/package.json ./apis/trusted-issuers-registry-v5/package.json
COPY --from=builder /app/apis/trusted-issuers-registry-v5/dist ./apis/trusted-issuers-registry-v5/dist
COPY --from=builder /app/apis/trusted-issuers-registry-v5/api ./apis/trusted-issuers-registry-v5/api
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
# Copy TIR SC
COPY --from=builder /app/contracts/trusted-issuers-registry-v3/package.json ./contracts/trusted-issuers-registry-v3/package.json
COPY --from=builder /app/contracts/trusted-issuers-registry-v3/dist ./contracts/trusted-issuers-registry-v3/dist
COPY --from=builder /app/contracts/trusted-issuers-registry-v3/artifacts ./contracts/trusted-issuers-registry-v3/artifacts
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
CMD [ "node", "apis/trusted-issuers-registry-v5/dist/main" ]
