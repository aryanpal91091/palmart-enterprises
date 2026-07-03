# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Nginx Stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Custom Nginx configuration mapping React Router fallback to index.html
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $$uri $$uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:5000; \
        proxy_set_header Host $$host; \
        proxy_set_header X-Real-IP $$remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
