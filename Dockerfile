FROM node:12.16.1-alpine

RUN mkdir -p /api
WORKDIR /api
COPY ./api/besu /api

RUN chown node:node /api/node_modules
USER node

RUN npm install

EXPOSE 8080
CMD npm run start
