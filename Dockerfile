# Stage 1 - building node_modules and dist folder
FROM node:12.16.1-alpine as builder
RUN apk add python make g++ && apk update
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# Stage 2
FROM node:12.16.1-alpine
WORKDIR /usr/src/app
COPY --from=builder node_modules node_modules
COPY --from=builder dist dist
COPY api api
COPY package*.json ./
RUN npm prune --production && \
  mkdir log && \
  chown -R node:node log
USER node
EXPOSE 9000/tcp
CMD [ "node", "dist/start.js" ]