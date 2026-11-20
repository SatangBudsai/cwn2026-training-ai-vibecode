# e-Service กลาง · เทศบาลนครตัวอย่าง (B01) — Node.js ไม่มี dependency ภายนอก (ใช้ node:sqlite ในตัว)
FROM node:22-alpine
ENV NODE_ENV=production PORT=3100 DB_PATH=/data/app.db TZ=Asia/Bangkok NODE_NO_WARNINGS=1
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY public ./public
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 3100
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=10 \
  CMD wget -qO- http://127.0.0.1:3100/api/health || exit 1
CMD ["node", "server.js"]
