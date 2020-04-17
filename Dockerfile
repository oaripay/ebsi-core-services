FROM node:12.16.1-alpine

RUN mkdir -p /api
WORKDIR /api
COPY . /api

RUN chown node:node /api
USER node

RUN npm install

EXPOSE 8080
CMD npm run start
