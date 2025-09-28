FROM node:20-alpine

# Install wget and procps for health checks
RUN apk add --no-cache wget procps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Start scheduler service
CMD ["npm", "run", "dev"]