FROM node:16.14.2-alpine3.15@sha256:32f64135e74ec4dc5d63cc36318444f1d801cd23c44253124f7eccb52c4b89c5 as base
WORKDIR /workspace
COPY . .

FROM base as builder
WORKDIR /workspace
# git+https://github.com/ethereumjs/ethereumjs-abi.git in yarn.lock
RUN apk add --no-cache git g++ make py3-pip python3
RUN yarn install --frozen-lockfile --silent && yarn cache clean
RUN yarn build
