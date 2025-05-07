FROM node:18-slim

WORKDIR /app

# Install dependencies first (for better layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Create volume mount points
VOLUME ["/app/sessions"]

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run application
CMD ["node", "src/index.js"]