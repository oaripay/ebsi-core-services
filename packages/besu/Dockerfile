FROM node:12.16.1-alpine as base
RUN apk add --update --no-cache \
  python \
  make \
  g++
WORKDIR /api
COPY api/besu/package*.json /api/
RUN npm ci --only=production

FROM node:12.16.1-alpine
WORKDIR /api
COPY --from=base /api/node_modules /api/node_modules
COPY ./api/besu /api
RUN chown node:node /api
USER node
EXPOSE 8080
ENV NODE_ENV production
CMD npm run start