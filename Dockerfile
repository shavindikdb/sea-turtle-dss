# Enterprise Node.js Server & Application Dockerfile for Sea Turtle Conservation DSS
FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions and install production packages
COPY package*.json ./
RUN npm install --production

# Copy application code and assets
COPY . .

# Expose Web Server Port
EXPOSE 80

ENV PORT=80
ENV NODE_ENV=production

# Launch Node.js Server
CMD ["node", "server.js"]
