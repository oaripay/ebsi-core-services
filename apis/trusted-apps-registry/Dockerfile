FROM core-services as builder
ENV DEBIAN_FRONTEND=noninteractive
RUN apk update && apk add --no-cache jq=1.6-r1

FROM builder as preparer
WORKDIR /app
COPY --from=builder /workspace/yarn.lock yarn.lock
COPY --from=builder /workspace/apis/trusted-apps-registry/package.json package.json
# Copy original and correct paths to build artifacts from workspace dependencies.
COPY package.json ./package-copy.json
RUN < ./package-copy.json jq '.dependencies."@ebsiint-sc/bootstrap" = "file:./contracts/bootstrap" | .dependencies."@ebsiint-sc/trusted-apps-registry" = "file:./contracts/trusted-apps-registry"' > package.json

COPY --from=builder /workspace/apis/trusted-apps-registry/dist dist
COPY --from=builder /workspace/apis/trusted-apps-registry/.ci .ci

COPY --from=builder /workspace/contracts/bootstrap/dist contracts/bootstrap/dist
COPY --from=builder /workspace/contracts/bootstrap/artifacts contracts/bootstrap/artifacts

# COPY --from=builder /workspace/contracts/trusted-apps-registry/package.json contracts/trusted-apps-registry/package.json
COPY --from=builder /workspace/contracts/trusted-apps-registry/dist contracts/trusted-apps-registry/dist
RUN echo '{"version":"0.0.0","main":"dist/src/types/index.js","types":"dist/src/types/index.d.ts"}' > contracts/trusted-apps-registry/package.json
COPY --from=builder /workspace/contracts/trusted-apps-registry/artifacts contracts/trusted-apps-registry/artifacts

FROM preparer as runner
WORKDIR /app
ENV NODE_ENV=production
# This is required for nestjs runtime.
RUN yarn install --production --ignore-scripts && yarn cache clean
RUN chown node:node /app
USER node
CMD [ "node", "dist/main" ]
