# Mini-ERP Docker & DevOps Setup

## 1. Mục tiêu

Tài liệu này cung cấp cấu hình Docker hoàn chỉnh cho hệ thống Mini-ERP Modular Monolith.

Bao gồm:

* PostgreSQL
* Redis
* MinIO
* Mailpit
* Backend API
* PgAdmin
* Docker Compose
* Environment variables
* Development workflow

---

# 2. Recommended Project Structure

```text
mini-erp/
  apps/
    api/
      Dockerfile
      .dockerignore

  infrastructure/
    docker/
      postgres/
      redis/
      minio/

  docker-compose.yml
  .env
```

---

# 3. .env

## Root .env

```env
# APP
APP_NAME=mini-erp
APP_PORT=3000
NODE_ENV=development

# DATABASE
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=mini_erp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mini_erp

# REDIS
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=super-secret-jwt-key
JWT_REFRESH_SECRET=super-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# MINIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET=mini-erp-files

# MAIL
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=

# PGADMIN
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=admin
```

---

# 4. docker-compose.yml

```yaml
version: '3.9'

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: mini-erp-api
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - '3000:3000'
    depends_on:
      - postgres
      - redis
      - minio
    volumes:
      - ./:/app
      - /app/node_modules
    networks:
      - mini-erp-network

  postgres:
    image: postgres:16
    container_name: mini-erp-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - mini-erp-network

  redis:
    image: redis:7
    container_name: mini-erp-redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    networks:
      - mini-erp-network

  minio:
    image: minio/minio:latest
    container_name: mini-erp-minio
    restart: unless-stopped
    command: server /data --console-address ':9001'
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data
    networks:
      - mini-erp-network

  mailpit:
    image: axllent/mailpit
    container_name: mini-erp-mailpit
    restart: unless-stopped
    ports:
      - '1025:1025'
      - '8025:8025'
    networks:
      - mini-erp-network

  pgadmin:
    image: dpage/pgadmin4
    container_name: mini-erp-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_DEFAULT_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_DEFAULT_PASSWORD}
    ports:
      - '5050:80'
    depends_on:
      - postgres
    networks:
      - mini-erp-network

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  mini-erp-network:
    driver: bridge
```

---

# 5. Backend Dockerfile

## apps/api/Dockerfile

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
```

---

# 6. .dockerignore

## apps/api/.dockerignore

```text
node_modules
npm-debug.log
Dockerfile
.git
.gitignore
.env
coverage
dist
```

---

# 7. PostgreSQL Setup

## Create Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

# 8. Redis Usage

## Recommended Usage

Redis dùng cho:

* session cache
* refresh token blacklist
* notification queue
* reporting cache
* rate limiting
* feature flags cache

---

# 9. MinIO Usage

## Recommended Buckets

```text
mini-erp-files
mini-erp-reports
mini-erp-temp
```

## File Types

* invoice PDFs
* quotation PDFs
* contracts
* product images
* exports

---

# 10. Mailpit Usage

## Mailpit URLs

```text
SMTP: localhost:1025
Web UI: http://localhost:8025
```

## Purpose

* local email testing
* reset password emails
* notification testing
* verification emails

---

# 11. PgAdmin Access

## Access

```text
URL: http://localhost:5050
Email: admin@example.com
Password: admin
```

## PostgreSQL Connection

```text
Host: postgres
Port: 5432
User: postgres
Password: postgres
Database: mini_erp
```

---

# 12. Start Project

## Build & Start

```bash
docker compose up --build
```

## Detached Mode

```bash
docker compose up -d
```

## Stop

```bash
docker compose down
```

## Remove Volumes

```bash
docker compose down -v
```

---

# 13. Database Migration Workflow

## Prisma Example

```bash
npx prisma migrate dev
```

## Seed

```bash
psql -U postgres -d mini_erp -f seed.sql
```

---

# 14. Recommended Health Checks

## PostgreSQL

```yaml
healthcheck:
  test: ['CMD-SHELL', 'pg_isready -U postgres']
  interval: 10s
  timeout: 5s
  retries: 5
```

## Redis

```yaml
healthcheck:
  test: ['CMD', 'redis-cli', 'ping']
  interval: 10s
  timeout: 5s
  retries: 5
```

---

# 15. Production Recommendations

## Do NOT use defaults

Production cần:

* strong passwords
* secret manager
* TLS/HTTPS
* managed PostgreSQL
* managed Redis
* object storage backup

---

# 16. Recommended Production Stack

## Infrastructure

```text
Nginx
Node.js API
PostgreSQL
Redis
MinIO/S3
RabbitMQ (optional)
```

---

# 17. Optional Services

## RabbitMQ

```yaml
rabbitmq:
  image: rabbitmq:3-management
  ports:
    - '5672:5672'
    - '15672:15672'
```

## Elasticsearch

```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
```

---

# 18. Recommended Docker Commands

## View Logs

```bash
docker compose logs -f api
```

## Enter Container

```bash
docker exec -it mini-erp-api sh
```

## PostgreSQL CLI

```bash
docker exec -it mini-erp-postgres psql -U postgres -d mini_erp
```

---

# 19. Backup Strategy

## PostgreSQL Backup

```bash
docker exec mini-erp-postgres pg_dump -U postgres mini_erp > backup.sql
```

## Restore

```bash
cat backup.sql | docker exec -i mini-erp-postgres psql -U postgres mini_erp
```

---

# 20. Security Recommendations

## Required

* JWT secret rotation
* DB password rotation
* private Docker network
* limit exposed ports
* signed URLs for attachments
* encrypted backups

## Avoid

* exposing PostgreSQL publicly
* storing raw secrets in Git
* using default admin passwords

---

# 21. Suggested Future Improvements

## DevOps Roadmap

* CI/CD pipeline
* GitHub Actions
* Docker registry
* Kubernetes deployment
* Helm charts
* centralized logging
* Prometheus/Grafana
* OpenTelemetry

---

# 22. Final Notes

Docker stack này phù hợp cho:

* local development
* BMAD code generation
* integration testing
* staging environment nhỏ
* demo environment

Sau bước này nên tiếp tục:

1. Prisma/Drizzle schema
2. migration strategy
3. CI/CD pipeline
4. Nginx reverse proxy
5. production deployment
6. monitoring/logging stack
7. backup automation
