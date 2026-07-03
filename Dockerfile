FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY index.html manifest.webmanifest sw.js ./
COPY assets ./assets
COPY backend ./backend
COPY tests ./tests
EXPOSE 3000
CMD ["npm", "start"]

