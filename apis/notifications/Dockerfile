FROM core-services as builder

FROM builder as preparer
WORKDIR /app
COPY --from=builder /workspace/yarn.lock yarn.lock
COPY --from=builder /workspace/apis/notifications/package.json package.json
COPY --from=builder /workspace/apis/notifications/dist dist
COPY --from=builder /workspace/apis/notifications/.ci .ci

FROM preparer as runner
WORKDIR /app
ENV NODE_ENV=production
# This is required for nestjs runtime.
RUN yarn install --production --ignore-scripts && yarn cache clean
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
