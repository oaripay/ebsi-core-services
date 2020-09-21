FROM node:12.18.4-alpine3.11@sha256:757574c5a2102627de54971a0083d4ecd24eb48fdf06b234d063f19f7bbc22fb
WORKDIR /api
COPY package.json yarn.lock /api/
RUN yarn install --frozen-lockfile --production && yarn cache clean
COPY . /api
RUN chown node:node /api
USER node
EXPOSE 8080
ENV NODE_ENV production
CMD [ "node", "src/start.js" ]
