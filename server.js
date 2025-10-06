// Gerekli modülleri import et
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
// Profesyonel loglama için 'pino' kütüphanesini ekliyoruz
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Express uygulamasını oluştur
const app = express();

// Konfigürasyon değişkenlerini tanımla
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Docker için '0.0.0.0' en iyisidir

// Middleware'leri kullan
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Gelen her isteği loglamak için middleware
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path, ip: req.ip }, 'Gelen istek');
  next();
});

// Ana sayfa endpoint'i
app.get('/', (req, res) => {
  res.json({
    status: 'ÇALIŞIYOR',
    servis: 'Vapi Sipariş Bot',
    zaman: new Date().toISOString()
  });
});

// Sağlık kontrolü endpoint'i
app.get('/health', (req, res) => {
  res.json({ durum: 'saglikli' });
});

// VAPI WEBHOOK endpoint'i
app.post('/vapi/webhook', async (req, res) => {
  const { body } = req;
  logger.info({ body }, '🔔 VAPI WEBHOOK ÇAĞRILDI');

  try {
    if (body.message?.type === 'function-call') {
      const { functionCall } = body.message;
      const { name, parameters } = functionCall;

      logger.info({ functionName: name, parameters }, '🎯 FUNCTION CALL TESPİT EDİLDİ!');

      if (name === 'kaydet_siparis') {
        logger.info(parameters, '✅ SİPARİŞ KAYDET FUNCTION ÇAĞRILDI!');
        
        // Sipariş numarası oluştur
        const siparisNo = 'SIP' + Date.now();
        
        // Vapi'ye gönderilecek yanıtı hazırla
        const yanit = {
          results: [{
            toolCallId: body.message.toolCallId,
            result: `Harika! Siparişiniz başarıyla kaydedildi. Sipariş numaranız: ${siparisNo}. Yaklaşık 30 dakika içinde kapınızda olacak. Afiyet olsun!`
          }]
        };
        
        logger.info({ yanit }, '✅ Vapi\'ye başarılı yanıt gönderildi');
        return res.json(yanit);
      }
      
      // Bilinmeyen bir function çağrılırsa
      logger.warn({ functionName: name }, '⚠️ Bilinmeyen function çağrıldı');
      return res.json({
        results: [{
          toolCallId: body.message.toolCallId,
          result: 'İşlem tamamlandı'
        }]
      });
    }

    logger.info('ℹ️ Function call değil, boş yanıt dönülüyor');
    return res.json({});

  } catch (error) {
    logger.error({ err: error }, '❌ WEBHOOK İŞLEME SIRASINDA HATA OLUŞTU!');
    return res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// 404 - Sayfa bulunamadı middleware'i
app.use((req, res) => {
  logger.warn({ path: req.path }, '⚠️ 404 - Sayfa bulunamadı');
  res.status(404).json({ hata: 'Bu endpoint bulunamadı' });
});

// Genel hata yakalama middleware'i
app.use((err, req, res, next) => {
  logger.error({ err }, '❌ KRİTİK SUNUCU HATASI!');
  res.status(500).json({ hata: 'Bir şeyler ters gitti' });
});

// Sunucuyu başlat
app.listen(PORT, HOST, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   🚀 SUNUCU BAŞLATILDI!               ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`📡 Host: ${HOST} | Port: ${PORT}`);
  console.log(`🌐 Webhook URL: /vapi/webhook`);
  console.log(`❤️  Health Check: /health`);
  console.log(`\n⏳ İstekleri bekliyorum...\n`);
});