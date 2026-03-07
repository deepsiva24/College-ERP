# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the built application using Nginx
FROM nginx:alpine

# Copy the build output to replace the default nginx contents.
# Vite outputs to /dist by default
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port (Cloud Run sets the PORT env var, we'll map to it if needed, but 80 is Nginx default)
EXPOSE 80

# Configure Nginx to route all requests to index.html for React Router
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html =404; \
    } \
}' > /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
