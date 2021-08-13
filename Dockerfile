FROM node:14.17.4-alpine3.13@sha256:827464075192dd324a0460429c48baa6d9b4589db7d3bb3bd57921471e8b3a62 as base
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
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
