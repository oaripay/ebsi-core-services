FROM node:12.19.1-alpine3.12@sha256:3ae30348acd445501758896f691106cbc32111f3525651c7256a7df75aa8a97d AS base
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
