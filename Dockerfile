FROM node:14.15.1-alpine3.12@sha256:5f5c0679611843292161d2374c967f1e04196bc3f5281125c408de65db8284fe as base
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean

FROM base as builder
# Because some dependencies of submodules/trusted-apps-registry-ethereum-sc need to be fetched with git
RUN apk add --no-cache git=2.26.2-r0
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
