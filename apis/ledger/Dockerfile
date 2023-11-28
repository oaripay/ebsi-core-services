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
# Copy Ledger API v3
COPY --from=builder /app/apis/ledger/package.json ./apis/ledger/package.json
COPY --from=builder /app/apis/ledger/dist ./apis/ledger/dist
COPY --from=builder /app/apis/ledger/api ./apis/ledger/api
# Copy shared code
COPY --from=builder /app/apis/shared/package.json ./apis/shared/package.json
COPY --from=builder /app/apis/shared/dist ./apis/shared/dist
# Define ENV
ENV NODE_ENV=production
# This is required for nestjs runtime.
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean
ARG DOCKER_TAG
RUN echo "DOCKER_TAG=$DOCKER_TAG" >> .env.default
RUN chown node:node /app
USER node
CMD [ "node", "apis/ledger/dist/main" ]
