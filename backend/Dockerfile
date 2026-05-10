FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# Dependencies
FROM base AS deps
COPY package.json ./
RUN npm install --production && npm cache clean --force

# Production
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p logs

ENV NODE_ENV=production
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

USER node
CMD ["node", "src/app.js"]
