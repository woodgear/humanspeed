FROM m.daocloud.io/docker.io/node:20-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

# Install Playwright browsers and system dependencies
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Expose ports
# 3000 - API Server
# 5900 - VNC Server
# 6080 - NoVNC Web Interface
EXPOSE 3000 5900 6080

# Set environment variables
ENV NODE_ENV=production \
    DISPLAY=:99 \
    VNC_PORT=5900 \
    NOVNC_PORT=6080 \
    PORT=3000

# Start the application
CMD ["npm", "start"]
