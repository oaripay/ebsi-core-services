FROM node:16.13.0-alpine3.14@sha256:3bca55259ada636e5fee8f2836aba7fa01fed7afd0652e12773ad44af95868b9 as base
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
