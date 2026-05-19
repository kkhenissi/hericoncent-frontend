# ============================================
# Étape 1 : Build Angular
# ============================================
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build:prod

# ============================================
# Étape 2 : Servir avec Nginx
# ============================================
FROM nginx:alpine

# Config Nginx pour Angular (SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build Angular
COPY --from=build /app/dist/hericonsent-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
