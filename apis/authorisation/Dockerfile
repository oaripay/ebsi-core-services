FROM core-services as builder

FROM builder as preparer
WORKDIR /app
COPY --from=builder /workspace/apis/authorisation/package.json package.json
COPY --from=builder /workspace/apis/authorisation/dist dist
COPY --from=builder /workspace/apis/authorisation/.ci .ci

FROM preparer as runner
WORKDIR /app
ENV NODE_ENV=production
# This is required for nestjs runtime.
RUN yarn install && yarn cache clean
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
