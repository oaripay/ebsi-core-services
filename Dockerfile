# Stage 1 - building node_modules
FROM node:12.16.1-alpine as builder
RUN apk add python make g++ && apk update
COPY package*.json ./
RUN npm ci --only=production

# Stage 2
FROM node:12.16.1-alpine
WORKDIR /usr/src/app
COPY --from=builder node_modules node_modules
COPY src ./src
COPY api ./api
USER node
RUN npm run build
EXPOSE 8080/tcp
CMD [ "node", "start.js" ]