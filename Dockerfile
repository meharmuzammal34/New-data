FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./

RUN npm install --omit=dev --no-audit --no-fund

COPY . .

CMD ["node", "server.js"]
