FROM oven/bun:1 as builder

WORKDIR /build
COPY . .

RUN bun install --verbose --frozen-lockfile --ignore-scripts

WORKDIR /build/apps/attestation

RUN bun run build.ts

FROM oven/bun:1
WORKDIR /app

# Copy only the built bundle
COPY --from=builder /build/apps/attestation/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "dist/index.js"]
