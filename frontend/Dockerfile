# Multi-stage: build the static bundle, then serve it with nginx.
# Not `npm start` in a container — that ships a development server as if it were
# production, which is the single most common giveaway of an untested Dockerfile.

FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Create React App inlines env vars at build time, so these are baked in here.
# An empty API base makes every request relative, and nginx proxies it to the
# backend — same origin, so no CORS and no hardcoded hostname in the bundle.
ENV REACT_APP_API_URL=""
RUN npm run build


FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
