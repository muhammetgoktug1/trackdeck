# Geliştirme imajı: kaynak kodu compose üzerinden bind-mount edilir,
# burada yalnızca bağımlılıklar hazırlanır.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

EXPOSE 40010

# --watch: bind-mount edilen kaynak dosyaları değiştiğinde otomatik yeniden başlar
CMD ["node", "--watch", "src/index.js"]
