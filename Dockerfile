FROM node:14.17.2-alpine3.13@sha256:1da7e178428d5e0d009f1aee2427593f57fdebb223d35a492d70e1259a16721f as base
WORKDIR /app
COPY .yarnrc package.json yarn.lock ./
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean

FROM base as builder
COPY submodules submodules
COPY hardhat.config.ts ./
RUN yarn install --frozen-lockfile --silent && yarn cache clean
COPY nest-cli.json tsconfig*.json ./
COPY src src
RUN yarn build

FROM base
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist dist
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
