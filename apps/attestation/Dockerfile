FROM oven/bun:1.2
WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile --production

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

WORKDIR /app/apps/attestation
CMD ["bun", "run", "index.ts"]
