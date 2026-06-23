# syntax=docker/dockerfile:1
# Multi-stage build for the Angular 22 frontend: Node build -> nginx serve.

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /workspace
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

# ---- runtime stage ----
FROM nginx:1.27-alpine AS runtime
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]