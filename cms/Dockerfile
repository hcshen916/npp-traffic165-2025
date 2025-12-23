FROM node:14-bullseye

WORKDIR /srv/app

# 安裝 libvips 開發庫（sharp 需要）
RUN apt-get update && apt-get install -y \
    libvips-dev \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# 設定 npm 配置以提高穩定性
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Install dependencies (include dev dependencies for build)
RUN npm cache clean --force && \
    npm install --legacy-peer-deps || \
    (sleep 5 && npm install --legacy-peer-deps) || \
    (sleep 10 && npm install --legacy-peer-deps)

# Copy application source
COPY . .

# Set NODE_ENV to production for build
ENV NODE_ENV=production

# Build the admin panel with increased memory limit
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

EXPOSE 1337

CMD ["npm", "start"]
