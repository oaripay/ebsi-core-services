# OnBoarding Web Client
#
# Multi-stage build that:
#   - creates a production build of the frontend
#   - serves the build with nginx
#
# Required ARG variables:
#   - PUBLIC_URL
#   - REACT_APP_EBSI_ENV ("local", "test", "conformance", "pilot", "prod")
#   - REACT_APP_CAPTCHA_KEY
#

## Stage 1: install dependencies and copy files
FROM node:16.14.2-alpine3.15@sha256:32f64135e74ec4dc5d63cc36318444f1d801cd23c44253124f7eccb52c4b89c5 as base
WORKDIR /usr/src/app
COPY ./package.json /usr/src/app/package.json
COPY ./yarn.lock /usr/src/app/yarn.lock
RUN yarn install --frozen-lockfile --silent && yarn cache clean
COPY . /usr/src/app/
ARG PUBLIC_URL
ARG REACT_APP_EBSI_ENV
ARG REACT_APP_CAPTCHA_KEY
RUN yarn build && yarn compress

# Stage 2: run nginx
FROM nginx:1.19.6-alpine@sha256:c2ce58e024275728b00a554ac25628af25c54782865b3487b11c21cafb7fabda
RUN mkdir -p /app
WORKDIR /app
RUN chown -R nginx:nginx /app && chmod -R 755 /app && \
  chown -R nginx:nginx /var/cache/nginx && \
  chown -R nginx:nginx /var/log/nginx && \
  chown -R nginx:nginx /etc/nginx/conf.d && \
  touch /var/run/nginx.pid && \
  chown -R nginx:nginx /var/run/nginx.pid
USER nginx
COPY --from=base /usr/src/app/build /app/users-onboarding/v2
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
