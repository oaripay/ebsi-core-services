FROM node:10.16.0-alpine@sha256:07897ec27318d8e43cfc6b1762e7a28ed01479ba4927aca0cdff53c1de9ea6fd AS build

RUN apk --no-cache add --update \
    --virtual .build_deps \
    build-base git python

COPY package*.json ./

ENV NODE_ENV=production

RUN npm config set scripts-prepend-node-path true
RUN npm ci

ENV PUBLIC_URL=http://localhost:${PORT}

RUN npm prune --production

COPY . ./

RUN touch .env
ENV PORT=3000
EXPOSE ${PORT}
CMD [ "npm", "start"]
