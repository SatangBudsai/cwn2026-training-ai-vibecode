# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
RUN apk add --no-cache tzdata
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --include=optional

FROM node:24-alpine AS build
RUN apk add --no-cache tzdata
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ห้ามต่อฐานข้อมูลตอน build: Pool สร้างตอนเรียกใช้ครั้งแรก และทุกหน้าที่อ่าน DB เป็น force-dynamic
RUN npm run build

FROM node:24-alpine AS run
RUN apk add --no-cache tzdata
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV TZ=Asia/Bangkok
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# ผู้ใช้ non-root ต้องเขียน .next/cache ได้ ไม่งั้นรูปจาก next/image ไม่ขึ้น
RUN mkdir -p .next/cache/images && chown -R nextjs:nodejs .next/cache
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
