FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY public ./public
ENV PORT=3100 DB_PATH=/data/app.db
EXPOSE 3100
CMD ["node", "server.js"]
