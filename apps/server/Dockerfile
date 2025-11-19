FROM oven/bun:1 as builder

WORKDIR /build
COPY . .

RUN bun install --verbose --frozen-lockfile --ignore-scripts

WORKDIR /build/apps/server

# Debug: Check if migrations exist in builder
RUN echo "=== Builder stage - checking migrations ===" && \
    ls -la /build/apps/server/db/ && \
    ls -la /build/apps/server/db/migrations/ && \
    ls -la /build/apps/server/db/migrations/meta/ && \
    cat /build/apps/server/db/migrations/meta/_journal.json

RUN bun run build.ts

FROM oven/bun:1

WORKDIR /app

COPY --from=builder /build/apps/server/dist ./dist
COPY --from=builder /build/examples ./examples
COPY --from=builder /build/apps/server/db/migrations ./db/migrations

# Debug: Verify migrations were copied
RUN echo "=== Final stage - checking migrations ===" && \
    ls -la /app/db/ && \
    ls -la /app/db/migrations/ && \
    ls -la /app/db/migrations/meta/ && \
    cat /app/db/migrations/meta/_journal.json || echo "ERROR: _journal.json not found"

RUN echo '{"type":"module","dependencies":{"onnxruntime-node":"^1.23.0"}}' > package.json
RUN bun install --production

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["bun", "dist/index.js"]
