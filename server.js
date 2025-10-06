// server.js - ADIM 1 KODU

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
// Twilio webhook'ları bu formatta veri gönderir
app.use(bodyParser.urlencoded({ extended: false }));

// Sunucunun çalışıp çalışmadığını kontrol etmek için
app.get('/', (req, res) => res.json({ status: 'ÇALIŞIYOR', servis: 'WhatsApp Sipariş Bot' }));
app.get('/health', (req, res) => res.json({ durum: 'saglikli' }));

// Twilio'nun mesaj göndereceği ana webhook'umuz burası
app.post('/whatsapp/webhook', (req, res) => {
  // Gelen mesajın içeriği ve gönderenin numarası
  const gelenMesaj = req.body.Body;
  const kimden = req.body.From;

  console.log(`Yeni mesaj geldi -> Kimden: ${kimden}, Mesaj: "${gelenMesaj}"`);

  // Twilio'ya cevap vermek için bir TwiML nesnesi oluşturuyoruz
  const twiml = new twilio.twiml.MessagingResponse();

  // Cevap mesajımızı hazırlıyoruz
  const yanitMesaji = "Merhaba! 👋 İlk bağlantı başarılı. Botumuz yakında hizmetinizde olacak.";
  twiml.message(yanitMesaji);

  // Twilio'ya cevabı XML formatında gönderiyoruz
  res.type('text/xml');
  res.send(twiml.toString());
});

// Sunucuyu başlatma
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Coolify için bu gerekli
app.listen(PORT, HOST, () => {
  console.log('🚀 WhatsApp Bot Sunucusu Başlatıldı!');
  console.log(`👂 Webhook Adresi: /whatsapp/webhook`);
  console.log(`💻 http://${HOST}:${PORT}`);
});