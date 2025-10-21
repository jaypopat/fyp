FROM oven/bun:1 AS builder

WORKDIR /app

# Install turbo globally
RUN bun install -g turbo

# Copy repo
COPY . .

# Prune the monorepo to only server app + dependencies
RUN turbo prune --scope=@shipyard/server --docker

# Install dependencies from pruned workspace
FROM oven/bun:1 AS installer

WORKDIR /app

# Copy pruned lockfile and package.json files
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/bun.lockb ./bun.lockb

# Install dependencies
RUN bun install --frozen-lockfile

# Copy pruned source code
COPY --from=builder /app/out/full/ .

# Build server (bundles everything into dist/index.js)
RUN bun --cwd apps/server run build.ts

# Production image - use slim for smaller size
FROM oven/bun:1-slim

WORKDIR /app

# Copy bundled output
COPY --from=installer /app/apps/server/dist ./dist

# Copy examples if needed at runtime
COPY --from=installer /app/examples ./examples

# Install only runtime dependency (onnxruntime-node)
COPY --from=installer /app/apps/server/package.json ./package.json
RUN bun install --production --no-save

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["bun", "dist/index.js"]
