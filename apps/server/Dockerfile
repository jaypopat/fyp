FROM oven/bun:1 AS builder

WORKDIR /app

# Copy everything (use .dockerignore to exclude node_modules, etc.)
COPY . .

# Install dependencies
RUN bun install --frozen-lockfile

# Build (bundles everything into dist/index.js)
RUN bun --cwd apps/server run build.ts

# Production - minimal image
FROM oven/bun:1-slim

WORKDIR /app

# Only need the bundled output
COPY --from=builder /app/apps/server/dist/index.js ./dist/index.js

# Install single runtime dependency
RUN echo '{"type":"module","dependencies":{"onnxruntime-node":"^1.23.0"}}' > package.json
RUN bun install --production

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["bun", "dist/index.js"]
