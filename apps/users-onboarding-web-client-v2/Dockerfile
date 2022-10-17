# Onboarding Web Client
#
# Required ENV variables:
#   - REACT_APP_CAPTCHA_KEY
#   - REACT_APP_EBSI_API_DOMAIN
#   - REACT_APP_EBSI_APP_DOMAIN
#   - REACT_APP_EULOGIN
#

# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG as builder

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
# Copy webapp
COPY --from=builder /app/apps/users-onboarding-web-client-v2/build /app/users-onboarding/v2
# Copy nginx conf template. The ${X} variables will be automatically substituted.
COPY --from=builder /app/apps/users-onboarding-web-client-v2/nginx/templates/default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
