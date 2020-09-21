FROM node:12.18.4-alpine3.11@sha256:757574c5a2102627de54971a0083d4ecd24eb48fdf06b234d063f19f7bbc22fb as base
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --silent --production && yarn cache clean

FROM base as builder
RUN yarn install --frozen-lockfile --silent
COPY . .
RUN yarn build

FROM base
WORKDIR /usr/src/app
COPY --from=builder dist dist
COPY scripts/start.sh scripts/start.sh
USER node
EXPOSE 9000
ENV NODE_ENV production
CMD [ "sh", "scripts/start.sh" ]
