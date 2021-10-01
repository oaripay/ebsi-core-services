FROM node:14.18.0-alpine3.14@sha256:a77940ba7f575ec0eda68b6f0eb3d6ad3103650b4195f3e9d76ea6a0789aa2ee AS base
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
