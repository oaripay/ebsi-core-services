FROM node:16.13.2-alpine3.15@sha256:2f50f4a428f8b5280817c9d4d896dbee03f072e93f4e0c70b90cc84bd1fcfe0d as base
WORKDIR /app
COPY .yarnrc package.json yarn.lock ./
RUN yarn install --frozen-lockfile --silent --production && yarn cache clean

FROM base as builder
RUN yarn install --frozen-lockfile --silent
COPY nest-cli.json tsconfig*.json ./
COPY src src
RUN yarn build

FROM base
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist dist
# Image version tag is extracted from the following file
COPY .ci .ci
RUN mkdir -p /app/wallet
# Uncomment the following line to run Ledger API locally
# COPY wallet wallet
RUN chown -R node:node /app
USER node
CMD [ "node", "dist/main" ]
