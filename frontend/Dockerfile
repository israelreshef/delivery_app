
# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies (including devDependencies for Next.js build)
RUN npm install --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 3000

# Start dev server
CMD ["npm", "run", "dev"]
