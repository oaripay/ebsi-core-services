FROM node:12.18.4-alpine3.11@sha256:757574c5a2102627de54971a0083d4ecd24eb48fdf06b234d063f19f7bbc22fb AS base
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --silent --production && yarn cache clean

FROM base AS builder
RUN yarn install --frozen-lockfile --silent
COPY . .
RUN yarn build

FROM base
WORKDIR /usr/src/app
COPY --from=builder dist dist
COPY api api
RUN  mkdir log && chown -R node:node log
USER node
EXPOSE 9000/tcp
ENV NODE_ENV production
CMD [ "node", "dist/start.js" ]
