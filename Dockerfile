FROM node:14.16.0-alpine3.12@sha256:b16524cf535a6010663d63e8f871c7efc7d87f14d7fcb38298a40f7a521743f8 as base
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
