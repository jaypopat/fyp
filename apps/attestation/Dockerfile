FROM oven/bun:1 AS base
WORKDIR /app
RUN bun install -g turbo

# Prune the monorepo to only include attestation app and its dependencies
FROM base AS pruner
COPY . .
RUN turbo prune attestation --docker

# Install dependencies for the pruned workspace
FROM base AS installer
WORKDIR /app

# Copy lockfile and package.json files from pruned workspace
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile

# Copy source code from pruned workspace
COPY --from=pruner /app/out/full/ .

# Build only internal packages (not the attestation app itself)
RUN turbo run build --filter=attestation^...

# Production stage
FROM oven/bun:1 AS runner
WORKDIR /app

# Copy everything from installer
COPY --from=installer /app .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run TypeScript directly - no dist needed!
CMD ["bun", "apps/attestation/index.ts"]
