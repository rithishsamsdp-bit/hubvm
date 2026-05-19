# Step 1: Use Node.js 22 as the base image for building the React app
FROM node:22-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy only package.json and package-lock.json for caching dependencies
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY frontend/ .

# Build the React app for production
RUN npm run build
 
# Step 2: Use Nginx to serve the built files
FROM nginx:alpine

# Copy custom Nginx configuration
COPY frontend/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy the build output to Nginx's html directory
# NOTE: Vite uses 'dist' by default, React CRA uses 'build'
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 to serve the app
EXPOSE 80

# Start Nginx in the 
CMD ["nginx", "-g", "daemon off;"]