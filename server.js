// server.js - FİNAL VE TAM KOD

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
  const gelenMesaj = req.body.Body ? req.body.Body.trim() : '';
  const kimden = req.body.From;
  const interactiveReply = req.body.interactive;

  console.log(`Gelen veri: ${JSON.stringify(req.body, null, 2)}`);

  let secilenId = null;

  // 1. Önce kullanıcı bir SİPARİŞ mi gönderdi diye bak
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
  
  // Yukarıdaki koşulların hiçbiri doğru değilse ve gelen normal bir mesajsa
  } else {
      console.log(`Kullanıcı sohbet başlattı: "${gelenMesaj}"`);
      await sendCategoryList(kimden);
  }

  // Eğer bir kategori seçildiyse (manuel veya interaktif), ürünleri listele
  if (secilenId) {
    if (secilenId === 'kategori_klima') {
        await sendProductList(kimden, 'Klima Kataloğu', [{ title: 'Klimalar', sku_prefix: 'klima' }]);
    } else if (secilenId === 'kategori_jakuzi') {
        await sendProductList(kimden, 'Jakuzi Kataloğu', [{ title: 'Jakuziler', sku_prefix: 'jakuzi' }]);
    } else if (secilenId === 'kategori_earaba') {
        await sendProductList(kimden, 'Elektrikli Araç Kataloğu', [{ title: 'Elektrikli Arabalar', sku_prefix: 'earaba' }]);
    }
  }
  
  res.status(200).send();
});

// --- EKSİK OLAN FONKSİYONLAR BURADA ---

// Kategori listesini gönderen fonksiyon
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

// Ürün listesini gönderen fonksiyon
async function sendProductList(kime, headerText, sections) {
    // BU LİSTEYİ KENDİ ÜRÜN SKU'LARINIZLA DOLDURUN
    const productSKUs = {
        klima: ['klima_fairy_12000', 'klima_clivia_18000_siyah', 'klima_bora_24000'],
        jakuzi: ['jakuzi_spa356', 'jakuzi_spa663', 'jakuzi_spa337', 'jakuzi_spa631', 'jakuzi_spa662'],
        earaba: ['earaba_dongfeng_box_e2', 'earaba_dongfeng_epi007', 'earaba_ridarra_rd6']
    };

    const productSections = sections.map(section => ({
        title: section.title,
        product_items: productSKUs[section.sku_prefix].map(sku => ({ product_retailer_id: sku }))
    }));

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: kime,
      body: 'İşte harika ürünlerimiz!',
      interactive: {
        type: 'product_list',
        header: { type: 'text', text: headerText },
        body: { text: 'Beğendiğiniz ürünleri sepetinize ekleyebilirsiniz.' },
        action: {
          catalog_id: process.env.META_CATALOG_ID,
          sections: productSections
        }
      }
    });
    console.log('Ürün listesi başarıyla gönderildi.');
  } catch (error) {
    console.error('Ürün listesi gönderilirken hata:', error.response ? error.response.data : error.message);
  }
}

// Siparişi işleyen ve onay butonlarını gönderen fonksiyon
async function handleOrder(kime, order) {
  let toplamFiyatUSD = 0;
  let toplamFiyatGBP = 0;
  let siparisOzeti = "Siparişiniz harika görünüyor! Lütfen aşağıdaki özeti kontrol edip onaylayın:\n\n";

  order.product_items.forEach(item => {
    const adet = parseInt(item.quantity);
    const fiyat = parseFloat(item.item_price);
    const satirToplam = adet * fiyat;
    
    if (item.currency === 'USD') {
        toplamFiyatUSD += satirToplam;
    } else if (item.currency === 'GBP') {
        toplamFiyatGBP += satirToplam;
    }
    
    siparisOzeti += `Ürün Kodu: ${item.product_retailer_id}\n`;
    siparisOzeti += `Adet: ${adet}\n\n`;
  });

  if (toplamFiyatUSD > 0) siparisOzeti += `*ARA TOPLAM: ${toplamFiyatUSD.toFixed(2)} USD*\n`;
  if (toplamFiyatGBP > 0) siparisOzeti += `*ARA TOPLAM: ${toplamFiyatGBP.toFixed(2)} GBP*\n`;

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: kime,
      body: 'Lütfen siparişinizi onaylayın.',
      interactive: {
        type: 'button',
        body: { text: siparisOzeti },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'onayla_evet', title: '✅ Onayla' }},
            { type: 'reply', reply: { id: 'onayla_hayir', title: '❌ İptal Et' }}
          ]
        }
      }
    });
    console.log('Sipariş özeti ve onay butonları gönderildi.');
  } catch (error) {
    console.error('Onay mesajı gönderilirken hata:', error.response ? error.response.data : error.message);
  }
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log('🚀 WhatsApp Bot Sunucusu Başlatıldı!');
  console.log(`👂 Webhook Adresi: /whatsapp/webhook`);
});