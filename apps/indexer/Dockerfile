FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc && cp src/db/schema.sql dist/db/schema.sql

CMD ["node", "dist/index.js"]
