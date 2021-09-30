FROM node:14.18.0-alpine3.14@sha256:a77940ba7f575ec0eda68b6f0eb3d6ad3103650b4195f3e9d76ea6a0789aa2ee AS base
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
RUN mkdir -p /app/wallet
# Uncomment the following line to run Ledger API locally
# COPY wallet wallet
RUN chown -R node:node /app
USER node
CMD [ "node", "dist/main" ]
