FROM oven/bun:latest as builder

WORKDIR /build
COPY . .

RUN bun install --frozen-lockfile

WORKDIR /build/apps/server
RUN bun run build.ts

FROM oven/bun:latest

WORKDIR /app

COPY --from=builder /build/apps/server/dist ./dist
COPY --from=builder /build/examples ./examples
COPY --from=builder /build/apps/server/db/migrations ./db/migrations

#  Create minimal package.json
RUN echo '{"type":"module","dependencies":{"onnxruntime-node":"^1.23.0"}}' > package.json

# Install onnxruntime-node fresh
RUN bun install --production

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["bun", "dist/index.js"]
