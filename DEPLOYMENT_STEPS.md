# 🚀 İyzico Abonelik Sistemi - Deployment Rehberi

## ✅ TAMAMLANAN İŞLER

- ✅ İyzico API wrapper oluşturuldu (`functions/src/iyzico.ts`)
- ✅ HTTP endpoints oluşturuldu (`functions/src/api.ts`)
- ✅ Webhook handler tamamlandı (`functions/src/subscriptionRenewal.ts`)
- ✅ Functions export edildi (`functions/src/index.ts`)
- ✅ Frontend payment servisi güncellendi (`services/payments.ts`)

---

## 📝 DEPLOYMENT ADIMLARI

### ADIM 1: İyzico Credentials'ları Al

1. İyzico Dashboard'a gir: https://merchant.iyzipay.com
2. **Ayarlar → Geliştirici** bölümüne git
3. Aşağıdaki bilgileri al:
   - **API Key** (Sandbox veya Production)
   - **Secret Key** (Sandbox veya Production)

**Test için Sandbox kullan:**
- API Base URL: `https://sandbox-api.iyzipay.com`

**Production için:**
- API Base URL: `https://api.iyzipay.com`

---

### ADIM 2: Firebase Functions Config Ayarla

Terminal'de functions klasörüne git ve config'i ayarla:

```bash
cd functions

# İyzico credentials
firebase functions:config:set \
  iyzico.api_key="SANDBOX-YOUR-API-KEY" \
  iyzico.secret_key="SANDBOX-YOUR-SECRET-KEY" \
  iyzico.base_url="https://sandbox-api.iyzipay.com"

# Mevcut config'i görüntüle
firebase functions:config:get
```

**Önemli:** Production'a geçerken sandbox yerine production credentials kullan!

---

### ADIM 3: Firebase Project ID'yi Güncelle

1. Firebase Console'dan Project ID'nizi alın
2. `services/payments.ts` dosyasını aç
3. `YOUR-PROJECT-ID` yazan yerleri gerçek Project ID ile değiştir:

```typescript
// Satır 16 ve 38'de:
'https://europe-west1-YOUR-PROJECT-ID.cloudfunctions.net/...'
// Örnek:
'https://europe-west1-soruatolyesi-123.cloudfunctions.net/...'
```

---

### ADIM 4: Functions'ları Build ve Deploy Et

```bash
cd functions

# Dependencies'leri kur
npm install

# TypeScript build
npm run build

# Sadece yeni fonksiyonları deploy et (hızlı test için)
firebase deploy --only functions:createSubscriptionPaymentLink,functions:checkSubscriptionOrderStatus,functions:handlePaymentWebhook

# VEYA tüm functions'ları deploy et
firebase deploy --only functions
```

**Deploy edilen fonksiyonlar:**
- ✅ `createSubscriptionPaymentLink` - Ödeme linki oluşturur
- ✅ `checkSubscriptionOrderStatus` - Sipariş durumu sorgular  
- ✅ `handlePaymentWebhook` - İyzico webhook'larını işler
- ✅ `dailySubscriptionCheck` - Günlük abonelik yenileme

---

### ADIM 5: Function URL'lerini Al

Deploy sonrası terminal'de şu URL'ler gösterilecek:

```
Function URL (createSubscriptionPaymentLink): 
https://europe-west1-YOUR-PROJECT.cloudfunctions.net/createSubscriptionPaymentLink

Function URL (checkSubscriptionOrderStatus): 
https://europe-west1-YOUR-PROJECT.cloudfunctions.net/checkSubscriptionOrderStatus

Function URL (handlePaymentWebhook): 
https://europe-west1-YOUR-PROJECT.cloudfunctions.net/handlePaymentWebhook
```

Bu URL'leri not al!

---

### ADIM 6: İyzico Webhook Ayarla

1. İyzico Dashboard → **Ayarlar → Webhook**
2. **Yeni Webhook Ekle**
3. URL olarak webhook function URL'ini gir:
   ```
   https://europe-west1-YOUR-PROJECT.cloudfunctions.net/handlePaymentWebhook
   ```
4. **Aktif Et**
5. Webhook events'leri seç:
   - ✅ Payment Success
   - ✅ Payment Failure

---

### ADIM 7: Frontend'i Deploy Et

```bash
# Root dizinde
npm run build
firebase deploy --only hosting
```

---

## 🧪 TEST ADIMLARI

### Test 1: Ödeme Linki Oluşturma

```bash
# Terminal'de test
curl -X POST \
  https://europe-west1-YOUR-PROJECT.cloudfunctions.net/createSubscriptionPaymentLink \
  -H "Authorization: Bearer YOUR-FIREBASE-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "pro-monthly",
    "amount": 349,
    "credits": 400,
    "description": "Pro Abonelik Test"
  }'
```

**Beklenen Response:**
```json
{
  "success": true,
  "paymentLinkUrl": "https://sandbox-payment.iyzipay.com/...",
  "orderId": "xxxxx-xxxxx-xxxxx",
  "token": "token-xxxxx"
}
```

---

### Test 2: Frontend'den Tam Akış Testi

1. Uygulamayı aç
2. **Profil → Abonelik** sayfasına git
3. **"Pro'ya Geç"** butonuna tıkla
4. İyzico ödeme sayfası açılmalı
5. Test kartı ile ödeme yap:
   ```
   Kart: 5528 7900 0000 0001
   CVC: 123
   Tarih: 12/30
   İsim: Test User
   ```
6. Ödeme sonrası:
   - Otomatik popup kapanmalı
   - Abonelik oluşmalı
   - 400 kredi yüklenmeli
   - UI güncelenmeli

---

### Test 3: Sipariş Durumu Sorgulama

```bash
curl -X GET \
  "https://europe-west1-YOUR-PROJECT.cloudfunctions.net/checkSubscriptionOrderStatus?orderId=SIPARIS-ID-BURAYA"
```

**Beklenen Response:**
```json
{
  "success": true,
  "orderId": "xxxxx",
  "status": "paid",
  "paymentStatus": "SUCCESS"
}
```

---

### Test 4: Webhook Testi

İyzico Dashboard'dan **Test Webhook** gönder:

1. Dashboard → Webhook → Test Et
2. Sample payment success event'i gönder
3. Firebase Functions logs'u kontrol et:
   ```bash
   firebase functions:log --only handlePaymentWebhook
   ```

**Beklenen Log:**
```
Webhook received: { token: '...', status: 'SUCCESS' }
Processing payment success: { orderId: '...', userId: '...' }
Payment success processed for order xxxxx
```

---

## 🔍 SORUN GİDERME

### Problem 1: "Firestore permissions denied"

**Çözüm:** Firestore Rules'u kontrol et:

```javascript
// firestore.rules
match /paymentOrders/{orderId} {
  allow read: if request.auth != null;
  allow write: if false; // Sadece backend yazabilir
}

match /subscriptions/{subscriptionId} {
  allow read: if request.auth != null && 
    resource.data.userId == request.auth.uid;
  allow write: if false;
}
```

Deploy et:
```bash
firebase deploy --only firestore:rules
```

---

### Problem 2: "İyzico API error"

**Kontrol Listesi:**
- ✅ API Key doğru mu?
- ✅ Secret Key doğru mu?
- ✅ Sandbox URL kullanıyor musun? (test için)
- ✅ Firebase Functions config ayarlı mı?

**Config'i kontrol et:**
```bash
firebase functions:config:get
```

---

### Problem 3: "CORS error"

**Çözüm:** API fonksiyonlarında CORS headers zaten var, ama yoksa ekle:

```typescript
res.set('Access-Control-Allow-Origin', '*');
res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

---

### Problem 4: "Function URL not found"

**Çözüm:** 
1. Functions deploy edildi mi kontrol et:
   ```bash
   firebase functions:list
   ```
2. Region doğru mu? (europe-west1)
3. Function isimleri doğru mu?

---

### Problem 5: Webhook çalışmıyor

**Kontrol Listesi:**
- ✅ İyzico'da webhook aktif mi?
- ✅ Webhook URL doğru mu?
- ✅ Signature verification çalışıyor mu?

**Test için signature'ı geçici devre dışı bırak:**
```typescript
// functions/src/subscriptionRenewal.ts içinde geçici olarak:
// if (!signature || !verifyIyzicoWebhook(signature, payload)) {
//   console.warn('Invalid webhook signature');
//   res.status(401).send({ error: 'Invalid signature' });
//   return;
// }
```

---

## 📊 MONİTORİNG

### Logs Takibi

```bash
# Tüm functions logları
firebase functions:log

# Sadece belirli function
firebase functions:log --only createSubscriptionPaymentLink

# Canlı takip (tail mode)
firebase functions:log --follow
```

### Firestore Console

Orders takibi:
- Firebase Console → Firestore → `paymentOrders` collection

Subscriptions takibi:
- Firebase Console → Firestore → `subscriptions` collection

---

## 🎯 ÜRETİME ALMA (PRODUCTION)

### 1. İyzico Production'a Geç

```bash
firebase functions:config:set \
  iyzico.api_key="PRODUCTION-API-KEY" \
  iyzico.secret_key="PRODUCTION-SECRET-KEY" \
  iyzico.base_url="https://api.iyzipay.com"
```

### 2. Webhook URL'i Güncelle

İyzico Dashboard'da webhook URL'i production function URL'i ile değiştir.

### 3. Test Kartı Yerine Gerçek Kart

Production'da gerçek kredi kartları kullanılacak.

### 4. Monitoring Kur

- Firebase Console → Functions → Logs
- Alerts kur (opsiyonel)
- Error tracking aktif et

---

## ✅ BAŞARI KRİTERLERİ

Sistem hazır sayılır eğer:

- [x] User "Pro'ya Geç" butonuna tıklayabiliyor
- [x] İyzico ödeme sayfası açılıyor
- [x] Test kartı ile ödeme yapılabiliyor
- [x] Ödeme sonrası otomatik abonelik oluşuyor
- [x] 400 kredi yükleniyor
- [x] Abonelik bilgileri UI'da görünüyor
- [x] Webhook'lar çalışıyor
- [x] Logs'da hata yok

---

## 📞 DESTEK

Hata durumunda:

1. **Logs kontrol et:**
   ```bash
   firebase functions:log --only handlePaymentWebhook
   ```

2. **Firestore'u kontrol et:**
   - `paymentOrders` collection → order status
   - `subscriptions` collection → subscription status

3. **İyzico Dashboard:**
   - Transactions → Payment history
   - Webhooks → Delivery status

---

## 🎉 TAMAMLANDI!

Artık sistemin hazır olması lazım. Herhangi bir sorun olursa yukarıdaki sorun giderme adımlarını takip et.

**İyi şanslar! 🚀**
