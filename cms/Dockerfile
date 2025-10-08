FROM node:14

WORKDIR /srv/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm cache clean --force && \
    npm install --only=production

# Copy application source
COPY . .

# Build the admin
RUN npm run build

EXPOSE 1337

CMD ["npm", "start"]
