# Use Node.js 18 LTS on Alpine Linux for a small footprint
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies (if any are needed for native modules)
# python3 make g++ are often needed for node-gyp
RUN apk add --no-cache python3 make g++

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Create uploads directory and ensure permissions
RUN mkdir -p uploads && chown -R node:node uploads

# Switch to non-root user for security
USER node

# Expose the API port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
