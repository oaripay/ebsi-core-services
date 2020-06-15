FROM node:12 AS builder
WORKDIR /usr/src/app
COPY package*.json /usr/src/app/
RUN npm ci --quiet --no-progress
COPY . .
RUN npm run build && npm prune --production

FROM node:12.16.1-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules /usr/src/app/node_modules
COPY --from=builder /usr/src/app/dist /usr/src/app/dist
COPY package*.json /usr/src/app/
COPY scripts/start.sh /usr/src/app/scripts/start.sh
USER node
EXPOSE 9000
ENV NODE_ENV production
CMD sh scripts/start.sh
