FROM node:14.15.4-alpine3.12@sha256:55bf28ea11b18fd914e1242835ea3299ec76f5a034e8c6e42b2ede70064e338c as base
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
ENV NODE_ENV=production
COPY --from=builder /app/dist dist
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
