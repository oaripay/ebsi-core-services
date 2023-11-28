# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

FROM node:20.10.0-alpine3.18@sha256:b1789b7be6aa16afd642eaaaccdeeeb33bd8f08e69b3d27d931aa9665b731f01

# Update dependencies
RUN apk update && apk upgrade

WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy TSR API v3
COPY --from=builder /app/apis/trusted-schemas-registry-v3/package.json ./apis/trusted-schemas-registry-v3/package.json
COPY --from=builder /app/apis/trusted-schemas-registry-v3/dist ./apis/trusted-schemas-registry-v3/dist
COPY --from=builder /app/apis/trusted-schemas-registry-v3/api ./apis/trusted-schemas-registry-v3/api
# Copy Bootstrap SC v2
COPY --from=builder /app/contracts/bootstrap-v2/package.json ./contracts/bootstrap-v2/package.json
COPY --from=builder /app/contracts/bootstrap-v2/dist ./contracts/bootstrap-v2/dist
COPY --from=builder /app/contracts/bootstrap-v2/artifacts ./contracts/bootstrap-v2/artifacts
# Copy TPR SC v2
COPY --from=builder /app/contracts/trusted-policies-registry-v2/package.json ./contracts/trusted-policies-registry-v2/package.json
COPY --from=builder /app/contracts/trusted-policies-registry-v2/dist ./contracts/trusted-policies-registry-v2/dist
COPY --from=builder /app/contracts/trusted-policies-registry-v2/artifacts ./contracts/trusted-policies-registry-v2/artifacts
# Copy TSR SC v2
COPY --from=builder /app/contracts/trusted-schemas-registry-v2/package.json ./contracts/trusted-schemas-registry-v2/package.json
COPY --from=builder /app/contracts/trusted-schemas-registry-v2/dist ./contracts/trusted-schemas-registry-v2/dist
COPY --from=builder /app/contracts/trusted-schemas-registry-v2/artifacts ./contracts/trusted-schemas-registry-v2/artifacts
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
CMD [ "node", "apis/trusted-schemas-registry-v3/dist/main" ]
