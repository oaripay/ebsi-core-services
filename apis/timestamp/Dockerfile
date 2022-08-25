# Create reference to core-services
FROM core-services as builder

FROM node:16.14.2-alpine3.15@sha256:32f64135e74ec4dc5d63cc36318444f1d801cd23c44253124f7eccb52c4b89c5
WORKDIR /app
# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
# Copy TAR API
COPY --from=builder /app/apis/timestamp/package.json ./apis/timestamp/package.json
COPY --from=builder /app/apis/timestamp/dist ./apis/timestamp/dist
COPY --from=builder /app/apis/timestamp/.ci ./apis/timestamp/.ci
# Copy Bootstrap SC
COPY --from=builder /app/contracts/bootstrap/package.json ./contracts/bootstrap/package.json
COPY --from=builder /app/contracts/bootstrap/dist ./contracts/bootstrap/dist
COPY --from=builder /app/contracts/bootstrap/artifacts ./contracts/bootstrap/artifacts
# Copy DID Timestamp SC
COPY --from=builder /app/contracts/timestamp/package.json ./contracts/timestamp/package.json
COPY --from=builder /app/contracts/timestamp/dist ./contracts/timestamp/dist
COPY --from=builder /app/contracts/timestamp/artifacts ./contracts/timestamp/artifacts
# Copy TPR SC
COPY --from=builder /app/contracts/trusted-policies-registry/package.json ./contracts/trusted-policies-registry/package.json
COPY --from=builder /app/contracts/trusted-policies-registry/dist ./contracts/trusted-policies-registry/dist
COPY --from=builder /app/contracts/trusted-policies-registry/artifacts ./contracts/trusted-policies-registry/artifacts
# Define ENV
ENV NODE_ENV=production
# Install prod dependencies
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean
RUN chown node:node /app
USER node
CMD [ "node", "apis/timestamp/dist/main" ]
