FROM node:24-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Unprivileged variant: runs as uid 101, listens on 8080, keeps its pid and
# temp files under /tmp so the root filesystem can be mounted read-only.
FROM nginxinc/nginx-unprivileged:alpine

COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
