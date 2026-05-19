FROM node:24-alpine

WORKDIR /app

COPY hepipe/hepipe.js /app/
COPY hepipe/hep-client.js /app/
COPY hepipe/log-client.js /app/
COPY hepipe/esl-client.js /app/
COPY hepipe/janus-client.js /app/
COPY hepipe/package.json /app/
COPY hepipe/config.js /app/

RUN npm install

# config.js will be passed as volume

CMD ["node", "hepipe.js"]
