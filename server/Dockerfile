# Use Node.js LTS version
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the server code
COPY . .

# Expose backend port (adjust if you use a different one)
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
