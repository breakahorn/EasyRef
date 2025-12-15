# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20
ARG VITE_API_BASE_URL=/api

FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 4173

CMD ["nginx", "-g", "daemon off;"]
