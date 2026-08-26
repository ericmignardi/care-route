# --- build ------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# npm ci against the lockfile alone, so a source change does not re-resolve the tree.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env at build time, so the API origin is baked into the bundle rather than
# read at runtime. That is why it is a build argument: a container built for one
# environment cannot be re-pointed at another by setting a variable on the running image.
ARG VITE_API_URL=http://localhost:8080/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- run --------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget --quiet --tries=1 --spider http://localhost/healthz || exit 1
