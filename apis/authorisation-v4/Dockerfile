# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

# Create deployment
# See https://pnpm.io/cli/deploy
FROM node:24.13.0-alpine3.23@sha256:931d7d57f8c1fd0e2179dbff7cc7da4c9dd100998bc2b32afc85142d8efbc213 AS api-builder
WORKDIR /app
COPY --from=builder /app/ ./
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN --mount=type=cache,target=/pnpm/store \
  pnpm --filter="@ebsiint-api/authorisation-api-v4" deploy --prod --no-optional pruned

# Create tiny runtime image
# See https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#smaller-images-without-npmyarn
FROM alpine:3.23@sha256:25109184c71bdad752c8312a8623239686a9a2071e8825f20acb8f2198c3f659
WORKDIR /usr/src/app
# Add required binaries and create "node" user
RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
  apk add libstdc++ dumb-init && \
  addgroup -g 1000 node && adduser -u 1000 -G node -s /bin/sh -D node && \
  chown node:node ./
COPY --from=api-builder /usr/local/bin/node /usr/local/bin/
COPY --from=api-builder /usr/local/bin/docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]
# Switch to "node" user
USER node
# Only import what's necessary
COPY --from=api-builder /app/pruned/api api
COPY --from=api-builder /app/pruned/dist dist
COPY --from=api-builder /app/pruned/node_modules node_modules
# Create .env.default file with docker tag
ARG DOCKER_TAG
RUN echo "DOCKER_TAG=$DOCKER_TAG" >> .env.default
# Define environment variables
ENV NODE_ENV=production
# Run with dumb-init to not start node with PID=1, since Node.js was not designed to run as PID 1
CMD [ "dumb-init", "node", "dist/main.js" ]
