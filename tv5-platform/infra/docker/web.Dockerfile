# Multi-stage build for React Frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package.json and workspace package.json files
COPY package.json package-lock.json ./
COPY tv3-planner-ui/package.json ./tv3-planner-ui/
COPY tv2-web/package.json ./tv2-web/

# Install dependencies via npm ci
RUN npm ci

# Copy sources
COPY tv3-planner-ui/ ./tv3-planner-ui/
COPY tv2-web/ ./tv2-web/

# Build packages
RUN npm run build

# Runtime Stage with Nginx
FROM nginx:alpine
COPY --from=builder /app/tv2-web/dist /usr/share/nginx/html

# Custom nginx config to support SPA routing and /api proxy
RUN echo 'server { \
    listen 5173; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:8080/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
