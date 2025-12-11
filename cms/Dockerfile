FROM node:14

WORKDIR /srv/app

# 安裝 libvips 開發庫（sharp 需要）
RUN apt-get update && apt-get install -y \
    libvips-dev \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (include dev dependencies for build)
RUN npm cache clean --force && \
    npm install

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