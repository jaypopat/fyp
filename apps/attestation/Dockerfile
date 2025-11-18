FROM oven/bun:1.2 AS base
WORKDIR /app

# Copy root-level dependency metadata
COPY package.json bun.lock bunfig.toml turbo.json biome.json ./

# Copy workspaces (apps + packages)
COPY apps ./apps
COPY packages ./packages

# Install all workspace dependencies (uses bun workspaces)
RUN bun install --frozen-lockfile

# --- Production runtime image ---
FROM oven/bun:1.2 AS runner
WORKDIR /app

# Copy installed deps and source from the base stage
COPY --from=base /app /app

# Environment
ENV NODE_ENV=production
# Hono + Bun default port; change if you configure differently
ENV PORT=3000

# This service requires a private key:
#   ATTESTATION_SERVICE_PRIVATE_KEY=0x...
# You MUST provide it at runtime (docker run -e ...).
ENV ATTESTATION_SERVICE_PRIVATE_KEY=""

# Expose the port the service listens on
EXPOSE 3000

# Run the attestation service (Bun will serve the default export from index.ts)
WORKDIR /app/apps/attestation
CMD ["bun", "run", "index.ts"]