// server.js - ADIM 5 KODU (Final)

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => res.json({ status: 'ÇALIŞIYOR', servis: 'WhatsApp Sipariş Bot' }));
app.get('/health', (req, res) => res.json({ durum: 'saglikli' }));

app.post('/whatsapp/webhook', async (req, res) => {
  const gelenMesaj = req.body.Body.trim();
  const kimden = req.body.From;
  const interactiveReply = req.body.interactive;

  console.log(`Gelen veri: ${JSON.stringify(req.body, null, 2)}`);

  let secilenId = null;

  // --- YENİ MANTIK BAŞLANGICI ---
  // 1. Önce kullanıcı bir SİPARİŞ mi gönderdi diye bak (ADIM 5)
  if (interactiveReply && interactiveReply.type === 'order') {
    const order = interactiveReply.order;
    console.log('Kullanıcı bir sipariş sepeti gönderdi!');
    await handleOrder(kimden, order);
    
  // 2. Sipariş değilse, bir KATEGORİ mi seçti diye bak
  } else if (interactiveReply && interactiveReply.type === 'list_reply') {
    secilenId = interactiveReply.list_reply.id;
    console.log(`Kullanıcı interaktif listeden seçti: ${secilenId}`);
  
  // 3. O da değilse, manuel KATEGORİ ID'si mi girdi diye bak (Sandbox Test)
  } else if (gelenMesaj.startsWith('kategori_')) {
    secilenId = gelenMesaj;
    console.log(`Kullanıcı manuel olarak kategori ID'si girdi: ${secilenId}`);
  
  // 4. O da değilse, bir ONAY BUTONUNA mı tıkladı diye bak
  } else if (interactiveReply && interactiveReply.type === 'button_reply') {
    const buttonId = interactiveReply.button_reply.id;
    if (buttonId === 'onayla_evet') {
        await client.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: kimden, body: 'Harika! Siparişiniz alınmıştır. Müşteri temsilcimiz en kısa sürede sizinle iletişime geçecektir. Bizi tercih ettiğiniz için teşekkür ederiz!' });
    } else {
        await client.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: kimden, body: 'Siparişiniz iptal edilmiştir. Yeni bir sipariş vermek isterseniz "merhaba" yazmanız yeterlidir.' });
    }
  }
  // --- YENİ MANTIK SONU ---

  // Eğer bir kategori seçildiyse, ürünleri listele
  if (secilenId) {
    // ... Bu kısım önceki adımla aynı, değişiklik yok ...
    if (secilenId === 'kategori_klima') {
        await sendProductList(kimden, 'Klima Kataloğu', [{ title: 'Klimalar', sku_prefix: 'klima' }]);
    } // ... diğer kategori else if'leri
  
  // Hiçbiri değilse, sohbeti başlat
  } else if (!interactiveReply) { // Sadece interaktif olmayan mesajlara kategori listesi gönder
    console.log(`Kullanıcı sohbet başlattı: "${gelenMesaj}"`);
    await sendCategoryList(kimden);
  }
  
  res.status(200).send();
});

// Siparişi işleyen ve onay butonlarını gönderen YENİ fonksiyon
async function handleOrder(kime, order) {
  let toplamFiyat = 0;
  let siparisOzeti = "Siparişiniz harika görünüyor! Lütfen aşağıdaki özeti kontrol edip onaylayın:\n\n";

  // Veritabanı veya katalogdan ürün isimlerini çekmek en doğrusu olurdu.
  // Şimdilik SKU'ları ve fiyatları kullanarak bir özet oluşturalım.
  order.product_items.forEach(item => {
    const adet = parseInt(item.quantity);
    const fiyat = parseFloat(item.item_price);
    const satirToplam = adet * fiyat;
    toplamFiyat += satirToplam;
    
    siparisOzeti += `Ürün Kodu: ${item.product_retailer_id}\n`;
    siparisOzeti += `Adet: ${adet}\n`;
    siparisOzeti += `Satır Toplamı: ${satirToplam.toFixed(2)} ${item.currency}\n\n`;
  });

  siparisOzeti += `*TOPLAM TUTAR: ${toplamFiyat.toFixed(2)} USD*`;

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: kime,
      body: 'Lütfen siparişinizi onaylayın.', // Yedek metin
      interactive: {
        type: 'button',
        body: {
          text: siparisOzeti
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'onayla_evet',
                title: '✅ Onayla'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'onayla_hayir',
                title: '❌ İptal Et'
              }
            }
          ]
        }
      }
    });
    console.log('Sipariş özeti ve onay butonları gönderildi.');
  } catch (error) {
    console.error('Onay mesajı gönderilirken hata:', error.response ? error.response.data : error.message);
  }
}


// ... sendCategoryList ve sendProductList fonksiyonları önceki adımla aynı, değişiklik yok ...
// ... Sadece sendProductList'i tüm ürünlerinizi içerecek şekilde güncellemeyi unutmayın ...

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log('🚀 WhatsApp Bot Sunucusu Başlatıldı!');
  console.log(`👂 Webhook Adresi: /whatsapp/webhook`);
});