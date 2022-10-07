# Create reference to core-services
ARG TAG=latest
FROM ebsi/core-services:$TAG as builder

FROM node:16.17.1-alpine3.16@sha256:4e36c3dee7c32cef5bfce5bc1b5013d1c3cc542cfdefde2a545ec641e7c94243
WORKDIR /app
COPY --from=builder /app/yarn.lock yarn.lock
COPY --from=builder /app/apis/authorisation/package.json package.json
COPY --from=builder /app/apis/authorisation/dist dist
ENV NODE_ENV=production
ENV DOCKER_TAG=$TAG
# This is required for nestjs runtime.
RUN yarn install --production --frozen-lockfile --ignore-scripts && yarn cache clean
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
