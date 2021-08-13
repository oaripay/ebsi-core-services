FROM node:14.17.5-alpine3.14@sha256:0d8fdd60f68e0d83a7b23c5c1cef34093330ddd756dbef6c17474c3324007e04 as base
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --silent --production --ignore-scripts && yarn cache clean

FROM base as builder
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
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
