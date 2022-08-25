# Create reference to core-services
FROM core-services as builder

FROM node:16.14.2-alpine3.15@sha256:32f64135e74ec4dc5d63cc36318444f1d801cd23c44253124f7eccb52c4b89c5
WORKDIR /app
COPY --from=builder /app/yarn.lock yarn.lock
COPY --from=builder /app/apis/storage/package.json package.json
COPY --from=builder /app/apis/storage/dist dist
COPY --from=builder /app/apis/storage/.ci .ci
ENV NODE_ENV=production
# This is required for nestjs runtime.
RUN yarn install --production --frozen-lockfile --ignore-scripts && yarn cache clean
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
