# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

FROM node:20.16.0-alpine3.20@sha256:eb8101caae9ac02229bd64c024919fe3d4504ff7f329da79ca60a04db08cef52

# Update dependencies
RUN apk update && apk upgrade

WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy TSR API v4
COPY --from=builder /app/apis/trusted-schemas-registry-v4/package.json ./apis/trusted-schemas-registry-v4/package.json
COPY --from=builder /app/apis/trusted-schemas-registry-v4/dist ./apis/trusted-schemas-registry-v4/dist
COPY --from=builder /app/apis/trusted-schemas-registry-v4/.graphclient ./apis/trusted-schemas-registry-v4/.graphclient
COPY --from=builder /app/apis/trusted-schemas-registry-v4/api ./apis/trusted-schemas-registry-v4/api
# Copy TPR SC v3
COPY --from=builder /app/contracts/trusted-policies-registry-v3/package.json ./contracts/trusted-policies-registry-v3/package.json
COPY --from=builder /app/contracts/trusted-policies-registry-v3/dist ./contracts/trusted-policies-registry-v3/dist
COPY --from=builder /app/contracts/trusted-policies-registry-v3/artifacts ./contracts/trusted-policies-registry-v3/artifacts
# Copy TSR SC v3
COPY --from=builder /app/contracts/trusted-schemas-registry-v3/package.json ./contracts/trusted-schemas-registry-v3/package.json
COPY --from=builder /app/contracts/trusted-schemas-registry-v3/dist ./contracts/trusted-schemas-registry-v3/dist
COPY --from=builder /app/contracts/trusted-schemas-registry-v3/artifacts ./contracts/trusted-schemas-registry-v3/artifacts
# Copy TSR SC v3 subgraph
COPY --from=builder /app/subgraphs/trusted-schemas-registry-v3/package.json ./subgraphs/trusted-schemas-registry-v3/package.json
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
CMD [ "node", "apis/trusted-schemas-registry-v4/dist/main" ]
