# Stage 0: prepare node alpine image
FROM node:16.17.1-alpine3.16@sha256:4e36c3dee7c32cef5bfce5bc1b5013d1c3cc542cfdefde2a545ec641e7c94243 AS base
RUN apk add --update --no-cache \
  make \
  g++

## Stage 1: build the admin
FROM base AS builder-admin
WORKDIR /usr/src/app
COPY ./package*.json .
# COPY ./yarn.lock .
RUN yarn
COPY ./ .
ARG REACT_APP_REGISTRY_ADDRESS
ARG REACT_APP_EBSI_CHAIN_ID
ARG REACT_APP_DID_REGISTRY_ADDRESS
ARG REACT_APP_TIR_REGISTRY_ADDRESS
ARG REACT_APP_TSR_ADDRESS

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

