FROM node:18-alpine

# Healthcheck için 'curl' paketini kuruyoruz. Bu en önemli adımdır.
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

# NOT: 'pino' kütüphanesini eklediysen package.json'a dahil olduğundan emin ol
RUN npm install --production

COPY . .

EXPOSE 3000

# SAĞLIK KONTROLÜ: Artık 'node' yerine 'curl' kullanıyoruz.
# Bu komut, 'localhost:3000/health' adresine istek atar ve başarılı olursa (status 200),
# konteyneri sağlıklı olarak işaretler.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]