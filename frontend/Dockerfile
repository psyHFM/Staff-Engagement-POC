# syntax=docker/dockerfile:1
# Multi-stage build for the Angular 22 frontend: Node build -> nginx serve.

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /workspace
# Copy only package.json (NOT package-lock.json). The committed lockfile was
# generated on Windows; installing from it on Alpine hits npm/cli#4828, where the
# platform-specific optional native binary @rollup/rollup-linux-x64-musl is not
# installed, breaking the Angular production bundle step. A lockfile-free
# `npm install` resolves the correct platform optional per the build host.
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build -- --configuration=production

# ---- runtime stage ----
FROM nginx:1.27-alpine AS runtime
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]