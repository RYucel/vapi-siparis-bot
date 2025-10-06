// server.js - ADIM 3 KODU

require('dotenv').config(); // .env dosyasındaki değişkenleri yükler
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

// Twilio Client'ını .env dosyasındaki bilgilerle başlat
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => res.json({ status: 'ÇALIŞIYOR', servis: 'WhatsApp Sipariş Bot' }));
app.get('/health', (req, res) => res.json({ durum: 'saglikli' }));

// Ana webhook'umuz
app.post('/whatsapp/webhook', async (req, res) => {
  const gelenMesaj = req.body.Body; // Müşterinin yazdığı mesaj
  const kimden = req.body.From;     // Müşterinin WhatsApp numarası (whatsapp:+905...)
  
  console.log(`Yeni mesaj geldi -> Kimden: ${kimden}, Mesaj: "${gelenMesaj}"`);

  // ---- YENİ KOD BAŞLANGICI ----
  // Bu kod, Twilio'nun API'ını kullanarak interaktif bir mesaj gönderecek.
  // Bu nedenle artık TwiML ile değil, doğrudan API çağrısı ile cevap veriyoruz.
  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER, // Bizim Twilio numaramız
      to: kimden, // Müşterinin numarası
      body: 'Lütfen aşağıdaki listeden ilgilendiğiniz ürün kategorisini seçin.', // Bu metin, liste desteklenmeyen eski telefonlarda görünür.
      
      // İşte interaktif kısım burası!
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: 'Ürün Kategorileri'
        },
        body: {
          text: 'SIBA LTD olarak size en kaliteli ürünleri sunuyoruz. Hangi ürün grubumuzla ilgileniyorsunuz?'
        },
        footer: {
          text: 'Seçiminizi yapabilirsiniz'
        },
        action: {
          button: 'Kategorileri Görüntüle',
          sections: [
            {
              title: 'Araç ve Yaşam Alanı Çözümleri',
              rows: [
                {
                  id: 'kategori_klima', // Bu ID'yi daha sonra kullanacağız
                  title: 'Klimalar',
                  description: 'GREE marka son teknoloji klimalar'
                },
                {
                  id: 'kategori_jakuzi',
                  title: 'Jakuziler',
                  description: 'SIBA marka lüks spa ve jakuziler'
                },
                {
                  id: 'kategori_earaba',
                  title: 'Elektrikli Arabalar',
                  description: 'Dongfeng ve Ridarra marka elektrikli araçlar'
                }
              ]
            }
          ]
        }
      }
    });
    console.log('Kategori seçim listesi başarıyla gönderildi.');
  } catch (error) {
    console.error('Mesaj gönderilirken hata oluştu:', error);
  }
  // ---- YENİ KOD SONU ----

  // Twilio'ya webhook'un başarılı olduğunu bildirmek için boş bir 200 OK yanıtı dönüyoruz.
  res.status(200).send();
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log('🚀 WhatsApp Bot Sunucusu Başlatıldı!');
  console.log(`👂 Webhook Adresi: /whatsapp/webhook`);
});