# Create reference to core-services
ARG TAG=latest
FROM ebsi/core-services:$TAG as builder

FROM node:16.17.1-alpine3.16@sha256:4e36c3dee7c32cef5bfce5bc1b5013d1c3cc542cfdefde2a545ec641e7c94243
WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy TPR API
COPY --from=builder /app/apis/trusted-policies-registry/package.json ./apis/trusted-policies-registry/package.json
COPY --from=builder /app/apis/trusted-policies-registry/dist ./apis/trusted-policies-registry/dist
# Copy Bootstrap SC
COPY --from=builder /app/contracts/bootstrap/package.json ./contracts/bootstrap/package.json
COPY --from=builder /app/contracts/bootstrap/dist ./contracts/bootstrap/dist
COPY --from=builder /app/contracts/bootstrap/artifacts ./contracts/bootstrap/artifacts
# Copy TPR SC
COPY --from=builder /app/contracts/trusted-policies-registry/package.json ./contracts/trusted-policies-registry/package.json
COPY --from=builder /app/contracts/trusted-policies-registry/dist ./contracts/trusted-policies-registry/dist
COPY --from=builder /app/contracts/trusted-policies-registry/artifacts ./contracts/trusted-policies-registry/artifacts
# Define ENV
ENV NODE_ENV=production
ENV DOCKER_TAG=$TAG
# Install prod dependencies
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean
RUN chown node:node /app
USER node
CMD [ "node", "apis/trusted-policies-registry/dist/main" ]
