// server.js - ADIM 4 KODU

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

// Ana webhook'umuz - GÜNCELLENMİŞ HALİ
app.post('/whatsapp/webhook', async (req, res) => {
  const gelenMesaj = req.body.Body.trim(); // .trim() ile başındaki/sonundaki boşlukları alırız
  const kimden = req.body.From;
  
  const interactiveReply = req.body.interactive;

  console.log(`Gelen veri: ${JSON.stringify(req.body, null, 2)}`);

  // --- YENİ MANTIK BAŞLANGICI ---
  let secilenId = null;

  // 1. Önce gerçek bir interaktif cevap var mı diye bak (Canlıda bu çalışacak)
  if (interactiveReply && interactiveReply.type === 'list_reply') {
    secilenId = interactiveReply.list_reply.id;
    console.log(`Kullanıcı interaktif listeden seçti: ${secilenId}`);
  
  // 2. EĞER İNTERAKTİF CEVAP YOKSA, GELEN MESAJ BİR KATEGORİ ID'Sİ Mİ DİYE KONTROL ET (Sandbox testimiz için)
  } else if (gelenMesaj.startsWith('kategori_')) {
    secilenId = gelenMesaj;
    console.log(`Kullanıcı manuel olarak kategori ID'si girdi: ${secilenId}`);
  }
  // --- YENİ MANTIK SONU ---


  // EĞER BİR KATEGORİ SEÇİLDİYSE (ister interaktif, ister manuel)
  if (secilenId) {
    if (secilenId === 'kategori_klima') {
      await sendProductList(kimden, 'Klima Kataloğu', [
        { title: 'Klimalar', product_items: [
            { product_retailer_id: 'klima_fairy_12000' },
            { product_retailer_id: 'klima_clivia_18000_siyah' },
            { product_retailer_id: 'klima_bora_24000' }
          ]
        }
      ]);
    } else if (secilenId === 'kategori_jakuzi') {
      // Jakuzi ürün listesini gönderme kodunu buraya ekleyeceğiz
      console.log("Jakuzi ürünleri listelenecek...");
    } else if (secilenId === 'kategori_earaba') {
      // Araba ürün listesini gönderme kodunu buraya ekleyeceğiz
      console.log("Araba ürünleri listelenecek...");
    }

  // HİÇBİR KATEGORİ SEÇİLMEDİYSE (normal sohbet mesajı)
  } else {
    console.log(`Kullanıcı sohbet başlattı: "${gelenMesaj}"`);
    await sendCategoryList(kimden);
  }
  
  res.status(200).send();
});

// Kategori listesini gönderen fonksiyon (Adım 3'teki kod)
async function sendCategoryList(kime) {
  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: kime,
      body: 'Lütfen ilgilendiğiniz ürün kategorisini seçin.',
      interactive: {
        type: 'list',
        header: { type: 'text', text: 'Ürün Kategorileri' },
        body: { text: 'SIBA LTD olarak size en kaliteli ürünleri sunuyoruz.' },
        action: {
          button: 'Kategorileri Görüntüle',
          sections: [{
            title: 'Ana Kategoriler',
            rows: [
              { id: 'kategori_klima', title: 'Klimalar' },
              { id: 'kategori_jakuzi', title: 'Jakuziler' },
              { id: 'kategori_earaba', title: 'Elektrikli Arabalar' }
            ]
          }]
        }
      }
    });
    console.log('Kategori seçim listesi başarıyla gönderildi.');
  } catch (error) {
    console.error('Kategori listesi gönderilirken hata:', error.response ? error.response.data : error.message);
  }
}

// Ürün listesini gönderen YENİ fonksiyon
async function sendProductList(kime, headerText, sections) {
  // Meta Kataloğundaki ürünleri buraya ekleyeceğiz
  const productSections = sections.map(section => ({
    title: section.title,
    product_items: [
      // Örnek: Klima ürünleri. SKU'ların katalogdakiyle aynı olması KRİTİK!
      { product_retailer_id: `${section.sku_prefix}_fairy_12000` },
      { product_retailer_id: `${section.sku_prefix}_clivia_18000_siyah` },
      { product_retailer_id: `${section.sku_prefix}_bora_24000` },
      // ... diğer klimalar
    ]
  }));

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: kime,
      body: 'İşte harika ürünlerimiz!', // Yedek metin
      interactive: {
        type: 'product_list',
        header: {
          type: 'text',
          text: headerText
        },
        body: {
          text: 'Beğendiğiniz ürünleri sepetinize ekleyebilirsiniz.'
        },
        action: {
          catalog_id: process.env.META_CATALOG_ID, // Bu ID'yi Meta'dan alacağız!
          sections: productSections
        }
      }
    });
    console.log('Ürün listesi başarıyla gönderildi.');
  } catch (error) {
    console.error('Ürün listesi gönderilirken hata:', error.response ? error.response.data : error.message);
  }
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log('🚀 WhatsApp Bot Sunucusu Başlatıldı!');
  console.log(`👂 Webhook Adresi: /whatsapp/webhook`);
});