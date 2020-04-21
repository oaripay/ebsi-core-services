FROM node:12.16.1-alpine

RUN mkdir -p /api/files
WORKDIR /api
COPY . /api

RUN chown node:node /api/node_modules
RUN chown node:node /api
USER node

RUN npm install

EXPOSE 8080
CMD npm run start
