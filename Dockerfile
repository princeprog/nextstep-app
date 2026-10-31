# syntax=docker/dockerfile:1
# Container image for the NextStep web app (the Next.js standalone server), for any host that runs containers.
# API_ORIGIN and NEXT_PUBLIC_SITE_URL are fixed at build time (README, "Container image"). Run it behind an HTTPS proxy
# that sets X-Forwarded-For. Base images are pinned by digest, and Dependabot proposes updates.

FROM node:26-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9 AS build
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

FROM node:26-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 APP_HTTPS=true
# The server code stays owned by root, so code running in the server can't rewrite it; only the cache is writable.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
RUN mkdir -p .next/cache && chown node:node .next/cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
