FROM node:12.16.1-alpine as builder
WORKDIR /app
RUN apk add python make g++ && apk update
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig.build.json ./
COPY tsconfig.json ./
RUN npm install @nestjs/cli && npm i --only=production --quiet --no-progress
COPY src src
RUN npm run build


FROM node:12.16.1-alpine
WORKDIR /app
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/dist dist


ENV APP_PORT=3000

RUN chown node:node /app
USER node

EXPOSE 3000/tcp

CMD [ "node", "dist/main" ]
