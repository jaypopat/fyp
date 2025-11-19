FROM oven/bun:1 as builder

WORKDIR /build
COPY . .

RUN bun install --verbose --frozen-lockfile --ignore-scripts

WORKDIR /build/apps/server

RUN bun run build.ts

FROM oven/bun:1

WORKDIR /app

COPY --from=builder /build/apps/server/dist ./dist
COPY --from=builder /build/examples ./examples
COPY --from=builder /build/apps/server/db/migrations ./dist/migrations
COPY --from=builder /build/apps/server/db/migrations ./db/migrations


RUN echo '{"type":"module","dependencies":{"onnxruntime-node":"^1.23.0"}}' > package.json
RUN bun install --production

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["bun", "dist/index.js"]
