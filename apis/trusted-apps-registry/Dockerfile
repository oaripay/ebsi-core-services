FROM node:16.14.2-alpine3.15@sha256:32f64135e74ec4dc5d63cc36318444f1d801cd23c44253124f7eccb52c4b89c5 as base
ENV DEBIAN_FRONTEND=noninteractive
RUN apk update && apk add --no-cache jq=1.6-r1

WORKDIR /app

# Copy original and correct paths to build artifacts from workspace dependencies.
COPY package.json ./package-copy.json
RUN < ./package-copy.json jq '.dependencies."@ebsiint-sc/bootstrap" = "file:./contracts/bootstrap" | .dependencies."@ebsiint-sc/trusted-apps-registry" = "file:./contracts/trusted-apps-registry"' > ./package.json

COPY contracts ./contracts
RUN yarn install --silent --production --ignore-scripts && yarn cache clean

FROM base as builder
COPY hardhat.config.ts ./
RUN yarn install --silent && yarn cache clean
COPY nest-cli.json tsconfig*.json ./
COPY src src
RUN yarn build

FROM base
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist dist
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
