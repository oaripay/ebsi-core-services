FROM node:12.16.1-alpine
WORKDIR /api
COPY package.json yarn.lock /api/
RUN yarn install --frozen-lockfile --production && yarn cache clean
COPY . /api
RUN chown node:node /api
USER node
EXPOSE 8080
ENV NODE_ENV production
CMD yarn run start
