FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json

RUN pnpm install --frozen-lockfile --filter ./backend...

COPY backend ./backend
COPY shared ./shared

WORKDIR /app/backend

RUN pnpm exec prisma generate

EXPOSE 3000

CMD ["sh", "-c", "mkdir -p logs && pnpm start 2>&1 | tee logs/app.log"]
