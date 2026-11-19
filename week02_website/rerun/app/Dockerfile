FROM node:24-alpine
WORKDIR /app
COPY . .
ENV PORT=3100 TEST_MODE=1 DB_PATH=/app/data/app.db
EXPOSE 3100
CMD ["node", "server.js"]
