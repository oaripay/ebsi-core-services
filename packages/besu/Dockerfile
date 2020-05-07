# Stage 0: prepare node alpine image
FROM node:12-alpine AS base
RUN apk add --update --no-cache \
  python \
  make \
  g++

# Stage 1: Besu api
FROM base AS besu-api
WORKDIR /usr/src/api
COPY ./package*.json /usr/src/api/
RUN npm ci --quiet --no-progress
COPY . /usr/src/api/

# Stage 3: run light api
FROM node:12-alpine
WORKDIR /usr/src/api
COPY --from=besu-api /usr/src/api/node_modules /usr/src/api/node_modules
COPY --from=besu-api /usr/src/api/src /usr/src/api/dist
COPY ./package*.json /usr/src/api/
RUN npm prune --production
RUN chown -R node:node /usr/src/api
USER node
CMD npm run start
