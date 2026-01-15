FROM node:20-alpine

WORKDIR /app

# 启用 corepack/pnpm
RUN corepack enable

# 仅拷贝依赖描述文件以利用缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json

# 只安装 backend 相关依赖
RUN pnpm install --frozen-lockfile --filter ./backend...

# 拷贝 backend 源码与共享 schema
COPY backend ./backend
COPY shared ./shared

WORKDIR /app/backend

EXPOSE 3000

CMD ["pnpm", "start"]
