FROM node:14.15.3-alpine3.12@sha256:3fcd65a94320827a74eacd80da24a190f2c3e65ce0f66e4fe7764629f11afde3 as base
WORKDIR /app
# Some dependencies need git to be installed (see yarn.lock)
RUN apk add --no-cache --virtual .build-deps git=2.26.2-r0
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean

FROM base as builder
COPY submodules submodules
RUN yarn install --frozen-lockfile --silent
COPY nest-cli.json tsconfig*.json ./
COPY src src
RUN yarn build

FROM base
WORKDIR /app
# Remove git
RUN apk del .build-deps
ENV NODE_ENV=production
COPY --from=builder /app/dist dist
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
