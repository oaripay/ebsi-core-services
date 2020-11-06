FROM node:14.15.0-alpine3.12@sha256:6864724c9f8437ad7fa9fa9c16a1e7e4d985b8418524c297481d7a7ee59fdd77 as base
WORKDIR /app
COPY package.json yarn.lock ./
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
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
