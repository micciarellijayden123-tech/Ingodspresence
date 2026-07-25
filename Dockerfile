FROM node:20-slim

WORKDIR /usr/src/app/server

COPY server/package*.json ./
RUN npm install --production

COPY server ./

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
