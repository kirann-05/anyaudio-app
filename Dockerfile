# Build Stage for Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY client/ ./client/
RUN cd client && npm install && npm run build

# Final Stage
FROM node:20-slim
WORKDIR /app

# Install Puppeteer dependencies + Python (for yt-dlp)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp for streaming platform support (YouTube, SoundCloud, etc.)
RUN pip3 install --break-system-packages yt-dlp

# Install dependencies for server
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy server code
COPY server/ ./server/

# Copy built frontend to server's public directory
COPY --from=frontend-build /app/client/dist ./server/public

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Start the server
CMD ["node", "server/index.js"]
