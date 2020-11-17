FROM node:12.19.1-alpine3.12@sha256:3ae30348acd445501758896f691106cbc32111f3525651c7256a7df75aa8a97d
WORKDIR /api
COPY package.json yarn.lock /api/
RUN yarn install --frozen-lockfile --production && yarn cache clean
COPY . /api
RUN chown node:node /api
USER node
EXPOSE 8080
ENV NODE_ENV production
CMD [ "node", "src/start.js" ]
