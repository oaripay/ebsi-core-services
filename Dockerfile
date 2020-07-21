# Stage 0: prepare node alpine image
FROM node:12-alpine AS base
RUN apk add --update --no-cache \
  python \
  make \
  g++

## Stage 1: build the admin
FROM base AS builder-admin
WORKDIR /usr/src/app
COPY ./package*.json /usr/src/app/
COPY ./yarn.lock /usr/src/app/
RUN yarn
COPY ./ /usr/src/app/
ARG REACT_APP_PROVIDER
ARG REACT_APP_REGISTRY_ADDRESS
ARG REACT_APP_TAW_TX_URI
ARG REACT_APP_REDIRECT_URL
ARG REACT_APP_WALLET_WEB_CLIENT_URL
ARG REACT_APP_WALLET_API


RUN yarn build

# Stage 2: run nginx
FROM nginx
RUN mkdir -p /app
WORKDIR /app

RUN touch /var/run/nginx.pid && \
  chown -R nginx:nginx /var/run/nginx.pid
COPY --from=builder-admin /usr/src/app/build /app/admin
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R nginx:nginx /app && chmod -R 755 /app && \
  chown -R nginx:nginx /var/cache/nginx && \
  chown -R nginx:nginx /var/log/nginx && \
  chown -R nginx:nginx /etc/nginx/conf.d
USER nginx


EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

