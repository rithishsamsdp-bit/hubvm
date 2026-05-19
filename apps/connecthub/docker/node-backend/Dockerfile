FROM node:18-alpine

WORKDIR /app

COPY node-backend/package*.json ./

RUN npm install

COPY node-backend/ .

EXPOSE 3000

CMD ["npm", "start"]
