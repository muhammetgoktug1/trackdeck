# Geliştirme imajı: kaynak kodu compose üzerinden bind-mount edilir,
# burada yalnızca bağımlılıklar hazırlanır.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

EXPOSE 5173

# --host: konteyner dışından (host tarayıcı) erişim için 0.0.0.0'e bağlanır
CMD ["npm", "run", "dev", "--", "--host"]
