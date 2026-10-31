# syntax=docker/dockerfile:1
# Container image for the NextStep web app (the Next.js standalone server), for any host that runs containers.
# API_ORIGIN and NEXT_PUBLIC_SITE_URL are fixed at build time (README, "Container image"). Run it behind an HTTPS proxy
# that sets X-Forwarded-For. Base images are pinned by digest, and Dependabot proposes updates.

FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.8.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY . .
ARG API_ORIGIN
ARG NEXT_PUBLIC_SITE_URL
RUN if [ -z "$API_ORIGIN" ] || [ -z "$NEXT_PUBLIC_SITE_URL" ]; then \
      echo "Build with --build-arg API_ORIGIN=<the API's private address> --build-arg NEXT_PUBLIC_SITE_URL=<the website's origin>"; \
      exit 1; \
    fi \
    && NEXT_OUTPUT=standalone pnpm build

FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 APP_HTTPS=true
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
