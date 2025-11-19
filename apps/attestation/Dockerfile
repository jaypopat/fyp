FROM oven/bun:1.2 AS base
WORKDIR /build

COPY . .

RUN bun install --frozen-lockfile

WORKDIR /build/apps/attestation

FROM oven/bun:1.2 AS runner
WORKDIR /app

COPY --from=base /build/apps/attestation ./
COPY --from=base /build/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "index.ts"]
