require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Her isteği logla
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Ana sayfa - Sistem çalışıyor mu kontrol
app.get('/', (req, res) => {
  res.json({ 
    status: 'ÇALIŞIYOR',
    servis: 'Vapi Sipariş Bot',
    zaman: new Date().toISOString()
  });
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
  res.json({ durum: 'saglikli' });
});

// VAPI WEBHOOK - En önemli kısım
app.post('/vapi/webhook', async (req, res) => {
  try {
    console.log('\n════════════════════════════════════════');
    console.log('🔔 VAPI WEBHOOK ÇAĞRILDI');
    console.log('════════════════════════════════════════');
    
    const body = req.body;
    
    // Gelen veriyi tamamen göster
    console.log('Gelen veri:', JSON.stringify(body, null, 2));
    
    // Message var mı kontrol et
    if (!body.message) {
      console.log('⚠️ Message yok, boş yanıt dönüyorum');
      return res.json({});
    }
    
    const messageType = body.message.type;
    console.log('📨 Mesaj tipi:', messageType);
    
    // Function call mı?
    if (messageType === 'function-call') {
      console.log('\n🎯 FUNCTION CALL TESPİT EDİLDİ!');
      
      const functionCall = body.message.functionCall;
      const functionName = functionCall.name;
      const parameters = functionCall.parameters;
      
      console.log('Function adı:', functionName);
      console.log('Parametreler:', JSON.stringify(parameters, null, 2));
      
      // Sipariş kaydetme function'ı mı?
      if (functionName === 'kaydet_siparis') {
        console.log('\n✅ SİPARİŞ KAYDET FUNCTION ÇAĞRILDI!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📦 ÜRÜNLER:');
        
        if (parameters.urunler && Array.isArray(parameters.urunler)) {
          parameters.urunler.forEach((urun, index) => {
            console.log(`   ${index + 1}. ${urun.urun} x${urun.adet} = ${urun.fiyat} TL`);
          });
        }
        
        console.log(`📍 ADRES: ${parameters.adres || 'Belirtilmemiş'}`);
        console.log(`📞 TELEFON: ${parameters.telefon || 'Belirtilmemiş'}`);
        console.log(`💰 TOPLAM: ${parameters.toplam_fiyat || 0} TL`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Sipariş numarası oluştur
        const siparisNo = 'SIP' + Date.now();
        
        // BURAYA VERİTABANI KAYIT KODUNUZu EKLEYERS İNİZ
        // Örnek: await database.siparisKaydet(parameters);
        
        // Vapi'ye başarılı yanıt dön
        const yanit = {
          results: [{
            toolCallId: body.message.toolCallId,
            result: `Harika! Siparişiniz başarıyla kaydedildi. Sipariş numaranız: ${siparisNo}. Yaklaşık 30 dakika içinde kapınızda olacak. Afiyet olsun!`
          }]
        };
        
        console.log('✅ Vapi\'ye başarılı yanıt gönderildi');
        return res.json(yanit);
      }
      
      // Başka bir function çağrıldıysa
      console.log('⚠️ Bilinmeyen function:', functionName);
      return res.json({
        results: [{
          toolCallId: body.message.toolCallId,
          result: 'İşlem tamamlandı'
        }]
      });
    }
    
    // Function call değilse boş yanıt
    console.log('ℹ️ Function call değil, boş yanıt dönüyorum');
    res.json({});
    
  } catch (error) {
    console.error('\n❌ HATA OLUŞTU!');
    console.error('Hata detayı:', error);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// 404 hatası
app.use((req, res) => {
  console.log('⚠️ 404 - Sayfa bulunamadı:', req.path);
  res.status(404).json({ hata: 'Bu endpoint bulunamadı' });
});

// Sunucu hatası
app.use((err, req, res, next) => {
  console.error('❌ Sunucu hatası:', err);
  res.status(500).json({ hata: 'Bir şeyler ters gitti' });
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   🚀 SUNUCU BAŞLATILDI!               ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Webhook URL: /vapi/webhook`);
  console.log(`❤️  Health Check: /health`);
  console.log(`\n⏳ İstekleri bekliyorum...\n`);
});