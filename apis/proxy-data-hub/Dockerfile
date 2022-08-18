FROM node:16.14.2-alpine3.15@sha256:32f64135e74ec4dc5d63cc36318444f1d801cd23c44253124f7eccb52c4b89c5 as base
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --silent --production && yarn cache clean

FROM base as builder
RUN yarn install --frozen-lockfile --silent && yarn cache clean
COPY nest-cli.json tsconfig*.json ./
COPY src src
RUN yarn build

FROM base
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist dist
# Image version tag is extracted from the following file
COPY .ci .ci
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
