# build stage
FROM node:20-alpine3.20 AS builder
WORKDIR /usr/src/app
RUN apk update && apk upgrade --no-cache
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# runtime stage
FROM node:20-alpine3.20 AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production
RUN apk update && apk upgrade --no-cache
COPY package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
