FROM node:14.18.1-alpine3.14@sha256:366c71eebb0da62a832729de2ffc974987b5b00ab25ed6a5bd8d707219b65de4 as base
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
