# Use Node.js 20 runtime
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Install FFmpeg for audio format conversion
RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --production

# Copy the server code
COPY server.js ./

# Create a non-root user
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser
RUN chown -R nodeuser:nodeuser /app
USER nodeuser

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the server
CMD ["node", "server.js"]