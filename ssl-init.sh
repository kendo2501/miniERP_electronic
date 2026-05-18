#!/bin/sh
# Run this ONCE on the VPS after setting DNS A record to your server IP.
# Usage: ./ssl-init.sh yourdomain.com your@email.com
#
# What it does:
#   1. Starts nginx in HTTP-only mode (no SSL yet)
#   2. Issues Let's Encrypt cert via webroot challenge
#   3. Replaces DOMAIN_PLACEHOLDER in nginx config with your domain
#   4. Reloads nginx with HTTPS config

set -e

DOMAIN=${1:?Usage: $0 <domain> <email>}
EMAIL=${2:?Usage: $0 <domain> <email>}

echo "==> Replacing DOMAIN_PLACEHOLDER with $DOMAIN in nginx config..."
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" backend/infrastructure/nginx/default.conf

echo "==> Starting stack in HTTP-only mode for ACME challenge..."
# Temporarily use a plain HTTP nginx config
cat > /tmp/acme-only.conf << 'NGINX'
server {
  listen 80;
  server_name _;
  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }
  location / { return 200 'ok'; }
}
NGINX

docker run -d --rm --name acme-nginx \
  -p 80:80 \
  -v certbot_www:/var/www/certbot \
  -v /tmp/acme-only.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine

echo "==> Requesting certificate for $DOMAIN..."
docker run --rm \
  -v certbot_www:/var/www/certbot \
  -v certbot_certs:/etc/letsencrypt \
  certbot/certbot certonly \
    --webroot -w /var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

docker stop acme-nginx

echo "==> Certificate issued. Starting full stack..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "Done! https://$DOMAIN should be live."
echo "Cert auto-renews every 12h via the certbot container."
