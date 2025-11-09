FROM oven/bun:1 as builder

WORKDIR /build
COPY . .
RUN bun install --verbose --frozen-lockfile --ignore-scripts
WORKDIR /build/apps/server
RUN bun run build.ts

# Using nodejs due to naapi modules incompatibility with bun runtime

FROM node:20-alpine

WORKDIR /app
COPY --from=builder /build/apps/server/dist ./dist
COPY --from=builder /build/examples ./examples
COPY --from=builder /build/package.json ./package.json
RUN npm install --omit=dev
RUN mkdir -p /app/data
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
CMD ["node", "dist/index.js"]