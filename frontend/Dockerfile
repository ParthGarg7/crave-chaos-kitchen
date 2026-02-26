FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDeps needed for Vite)
RUN npm install

# Copy the rest of the source
COPY . .

# Expose Vite dev port
EXPOSE 3000

# Start Vite dev server bound to all interfaces so Docker can reach it
CMD ["npm", "run", "dev"]
