FROM node:12.16.1-alpine as base
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
ENV APP_PORT=3000
RUN chown node:node /app
USER node
EXPOSE 3000/tcp
CMD [ "node", "dist/main" ]
