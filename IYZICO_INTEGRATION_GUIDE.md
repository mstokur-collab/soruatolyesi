# İyzico Link Yöntemi Entegrasyon Rehberi

## 📋 ChatGPT İçin Sistem Durumu Özeti

### ✅ HAZIR OLAN BÖLÜMLER

#### 1. Frontend - Payment Servisi (`services/payments.ts`)
**Durum:** HAZIR ✅  
**İçerik:**
```typescript
// Bu fonksiyonlar zaten var ve çalışır durumda:
- createPaymentLink(payload) → Backend'e istek atar
- pollOrderStatus(orderId) → Sipariş durumu sorgular
- Firebase Auth token'ı otomatik ekler
```

**Kullanım:**
```typescript
const { paymentLinkUrl, orderId } = await createPaymentLink({
  productId: 'pro-monthly',
  amount: 349,
  credits: 400,
  description: 'Pro Abonelik - Aylık'
});
```

---

#### 2. Frontend - UI Bileşeni (`components/SubscriptionManager.tsx`)
**Durum:** HAZIR ✅  
**Özellikler:**
- Abonelik satın alma butonu ve akışı
- Ödeme sayfası popup
- 3 saniyede bir polling (60 saniye timeout)
- Başarılı ödeme sonrası otomatik abonelik oluşturma
- İptal/yeniden aktifleştirme UI
- Abonelik bilgileri gösterimi

**Kullanılan Fonksiyonlar:**
```typescript
handleSubscribe() → createPaymentLink() + pollOrderStatus() + createSubscription()
handleCancel() → cancelSubscription()
handleReactivate() → reactivateSubscription()
```

---

#### 3. Firestore Servisleri (`services/firestoreService.ts`)
**Durum:** TAM ✅  
**Tüm abonelik fonksiyonları hazır:**

```typescript
✅ createSubscription(uid, planId) → Yeni abonelik oluştur
   - Firestore'a subscription doc ekler
   - User'a Pro status verir
   - İlk 400 kredyi yükler
   - Credit transaction loglar

✅ getUserSubscription(uid) → Aktif aboneliği getir
✅ onSubscriptionChanges(uid, callback) → Real-time dinle
✅ cancelSubscription(subscriptionId) → İptal et
✅ reactivateSubscription(subscriptionId) → Yeniden aktifleştir
✅ renewSubscription(subscriptionId) → Aylık yenileme yap
✅ markSubscriptionPastDue(subscriptionId) → Ödeme hatası işaretle
```

---

#### 4. Cloud Functions - Scheduled Task (`functions/src/subscriptionRenewal.ts`)
**Durum:** HAZIR ✅  
**Fonksiyon:**
```typescript
dailySubscriptionCheck
- Her gün saat 02:00'de çalışır
- nextBillingDate'i geçmiş abonelikleri bulur
- Otomatik yenileme yapar (ödeme gateway'i entegre edilecek)
- Kredileri yükler
- Cancelled ise expire eder
```

---

### ❌ EKSİK OLAN BÖLÜMLER (YAPILACAKLAR)

#### 1. Backend API Endpoints (**YOK - YAZILACAK**)

**İhtiyaç:** 2 adet Cloud Function HTTP endpoint

**Dosya:** `functions/src/api.ts` (oluşturulacak)

**Endpoint 1: Ödeme Linki Oluştur**
```typescript
POST /createPaymentLink
Headers: Authorization: Bearer {firebase-token}
Body: {
  productId: 'pro-monthly',
  amount: 349,
  credits: 400,
  description: string
}
Response: {
  paymentLinkUrl: string,  // İyzico'dan dönen URL
  orderId: string          // Takip için ID
}

Görevler:
1. Firebase Auth token doğrula
2. User bilgilerini al (email, name vb)
3. İyzico API'ye payment link request gönder
4. Response'u frontend'e döndür
```

**Endpoint 2: Sipariş Durumu Sorgula**
```typescript
GET /checkOrderStatus?orderId={orderId}
Response: {
  status: 'pending' | 'paid' | 'failed' | 'expired'
}

Görevler:
1. İyzico API'den order status sorgula
2. Durumu frontend'e döndür
```

---

#### 2. İyzico API Wrapper (**YOK - YAZILACAK**)

**Dosya:** `functions/src/iyzico.ts` (oluşturulacak)

**NPM Paketi:** `iyzipay` (kurulacak)
```bash
cd functions
npm install iyzipay
```

**İçerik:**
```typescript
// İyzico API configuration
import Iyzipay from 'iyzipay';

const iyzico = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY,
  secretKey: process.env.IYZICO_SECRET_KEY,
  uri: process.env.IYZICO_BASE_URL // sandbox veya production
});

// Fonksiyon 1: Payment Link Oluştur
export async function createIyzicoPaymentLink(params: {
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  description: string;
  orderId: string;
}) {
  const request = {
    locale: 'tr',
    conversationId: params.orderId,
    price: params.amount,
    paidPrice: params.amount,
    currency: 'TRY',
    basketId: params.orderId,
    paymentGroup: 'SUBSCRIPTION',
    callbackUrl: `https://YOUR-DOMAIN/payment-callback`,
    enabledInstallments: [1],
    buyer: {
      id: params.userId,
      name: params.userName,
      surname: params.userName,
      email: params.userEmail,
      identityNumber: '11111111111',
      registrationAddress: 'Turkey',
      city: 'Istanbul',
      country: 'Turkey',
    },
    billingAddress: {
      contactName: params.userName,
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Turkey',
    },
    basketItems: [{
      id: 'pro-monthly',
      name: params.description,
      category1: 'Subscription',
      itemType: 'VIRTUAL',
      price: params.amount
    }]
  };

  return new Promise((resolve, reject) => {
    iyzico.paymentLink.create(request, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Fonksiyon 2: Order Status Kontrol
export async function checkIyzicoOrderStatus(orderId: string) {
  return new Promise((resolve, reject) => {
    iyzico.paymentLink.retrieve(orderId, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Fonksiyon 3: Webhook Signature Verify
export function verifyIyzicoWebhook(signature: string, payload: string): boolean {
  const crypto = require('crypto');
  const secretKey = process.env.IYZICO_SECRET_KEY;
  
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('base64');
    
  return hash === signature;
}
```

---

#### 3. Webhook Handler (**SKELETON VAR - DOLDURULACAK**)

**Dosya:** `functions/src/subscriptionRenewal.ts`  
**Fonksiyon:** `handlePaymentWebhook`

**Mevcut Durum:** Sadece iskelet var, içi boş
**Yapılacak:** Event handling ve signature verification eklenecek

```typescript
export const handlePaymentWebhook = functions
  .region('europe-west1')
  .https
  .onRequest(async (req, res) => {
    // 1. Webhook signature doğrula
    const signature = req.headers['x-iyzico-signature'];
    const payload = JSON.stringify(req.body);
    
    if (!verifyIyzicoWebhook(signature, payload)) {
      res.status(401).send({ error: 'Invalid signature' });
      return;
    }

    // 2. Event type'a göre işlem yap
    const event = req.body;
    
    try {
      switch (event.status) {
        case 'SUCCESS':
          // Ödeme başarılı → Abonelik oluştur veya yenile
          await handlePaymentSuccess(event);
          break;
          
        case 'FAILURE':
          // Ödeme başarısız → past_due işaretle
          await handlePaymentFailure(event);
          break;
          
        default:
          console.log(`Unhandled event status: ${event.status}`);
      }
      
      res.status(200).send({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send({ error: 'Processing failed' });
    }
  });

// Bu fonksiyonlar zaten var:
async function handlePaymentSuccess(data: any) {
  // subscriptionId ve userId'yi data'dan al
  // renewSubscription() çağır (ZATen VAR)
}

async function handlePaymentFailure(data: any) {
  // subscriptionId'yi data'dan al
  // markSubscriptionPastDue() çağır (ZATEN VAR)
}
```

---

#### 4. Environment Variables (**EKSİK - EKLENECEKVeya**)

**Dosya:** `.env` (root'ta)
```bash
IYZICO_API_KEY=sandbox-xxx veya xxx
IYZICO_SECRET_KEY=sandbox-yyy veya yyy
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com # Test için
# IYZICO_BASE_URL=https://api.iyzipay.com # Production için
```

**Firebase Functions Config'e Ekle:**
```bash
cd functions
firebase functions:config:set \
  iyzico.api_key="sandbox-xxx" \
  iyzico.secret_key="sandbox-yyy" \
  iyzico.base_url="https://sandbox-api.iyzipay.com"
```

**functions/src'de kullanım:**
```typescript
const config = functions.config();
const IYZICO_API_KEY = config.iyzico.api_key;
const IYZICO_SECRET_KEY = config.iyzico.secret_key;
const IYZICO_BASE_URL = config.iyzico.base_url;
```

---

## 🚀 CHATGPT İÇİN ADIM ADIM YAPILACAKLAR

### ADIM 1: İyzico API Wrapper Oluştur
```
Dosya: functions/src/iyzico.ts
Görev: 
- iyzipay npm paketi kur
- Configuration yap
- createIyzicoPaymentLink() fonksiyonu yaz
- checkIyzicoOrderStatus() fonksiyonu yaz
- verifyIyzicoWebhook() fonksiyonu yaz
```

### ADIM 2: HTTP Endpoints Oluştur
```
Dosya: functions/src/api.ts (yeni)
Görev:
- createPaymentLink endpoint yaz (POST)
  * Auth token doğrula
  * User bilgisi al
  * İyzico'ya istek at
  * Response döndür
  
- checkOrderStatus endpoint yaz (GET)
  * Order ID al
  * İyzico'dan status sorgula
  * Status map et (pending/paid/failed/expired)
  * Response döndür
```

### ADIM 3: Webhook Handler'ı Tamamla
```
Dosya: functions/src/subscriptionRenewal.ts
Görev:
- handlePaymentWebhook içini doldur
- Signature verification ekle
- Event handling ekle
- handlePaymentSuccess ve handlePaymentFailure'ı implement et
```

### ADIM 4: Environment Variables Ayarla
```
Görev:
- .env dosyası oluştur
- İyzico credentials ekle
- Firebase Functions config'e yükle
```

### ADIM 5: Functions'ı Deploy Et
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### ADIM 6: İyzico Panel Ayarları
```
Görev:
- Webhook URL'i ekle: https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/handlePaymentWebhook
- Callback URL'i ayarla
- Test modunda dene
```

### ADIM 7: Test Et
```
Görev:
1. Frontend'den "Pro'ya Geç" butonuna tıkla
2. İyzico ödeme sayfası açılsın
3. Test kartı ile ödeme yap:
   - Kart: 5528 7900 0000 0001
   - CVC: 123
   - Tarih: 12/30
4. Otomatik abonelik oluşsun
5. 400 kredi yüklensin
```

---

## 📊 VERİ AKIŞ DİYAGRAMI

```
1. USER CLICKS "Pro'ya Geç"
   ↓
2. Frontend: createPaymentLink()
   ↓
3. Backend Endpoint: /createPaymentLink
   ↓
4. İyzico API: Create Payment Link
   ↓
5. Backend: Return paymentLinkUrl + orderId
   ↓
6. Frontend: Open popup + Start polling
   ↓
7. USER: Pays on İyzico page
   ↓
8. İyzico: Sends webhook to handlePaymentWebhook
   ↓
9. Backend: Verify signature + Process event
   ↓
10. Backend: Call renewSubscription() veya createSubscription()
    ↓
11. Firestore: Update subscription + Add credits
    ↓
12. Frontend Polling: Detects "paid" status
    ↓
13. Frontend: Calls createSubscription() (if new)
    ↓
14. SUCCESS: User is now Pro with 400 credits
```

---

## 🔑 ÖNEMLİ NOTLAR

### İyzico API Endpoints
- **Sandbox:** `https://sandbox-api.iyzipay.com`
- **Production:** `https://api.iyzipay.com`

### İyzico Test Kartları
```
Başarılı: 5528 7900 0000 0001 | CVC: 123 | 12/30
Başarısız: 4111 1111 1111 1129 | CVC: 123 | 12/30
3D Secure: 5526 0800 0000 0006 | CVC: 123 | 12/30
```

### Webhook Security
- Her webhook request'i signature ile doğrula
- Invalid signature = 401 döndür
- İdempotency için processed webhooks logla

### Ödeme Durumları (İyzico)
```
SUCCESS → paid
FAILURE → failed
INIT_THREEDS → pending (3D Secure)
CALLBACK_THREEDS → pending (3D verification)
```

---

## 📝 CHATGPT'YE VERİLECEK PROMPT ÖRNEĞİ

```
Merhaba! Firebase + React + İyzico ile Pro abonelik sistemi kuruyorum.

HAZIR OLANLAR:
✅ Frontend payment servisi (createPaymentLink, pollOrderStatus)
✅ SubscriptionManager UI bileşeni
✅ Firestore servisleri (createSubscription, renewSubscription, vb)
✅ Cloud Function scheduled task (günlük renewal check)
✅ Webhook skeleton

EKSİK OLANLAR:
❌ Backend HTTP endpoints (/createPaymentLink, /checkOrderStatus)
❌ İyzico API wrapper (functions/src/iyzico.ts)
❌ Webhook handler implementation
❌ Environment variables setup

Lütfen şu dosyaları oluştur:
1. functions/src/iyzico.ts → İyzico API wrapper (createPaymentLink, checkOrderStatus, verifyWebhook)
2. functions/src/api.ts → HTTP endpoints (createPaymentLink, checkOrderStatus)
3. Webhook handler'ı tamamla (handlePaymentWebhook içi)

İyzico dokümantasyonu: https://dev.iyzipay.com
npm paketi: iyzipay

Hazır fonksiyonlarım:
- createSubscription(uid) → Yeni abonelik oluşturur
- renewSubscription(subscriptionId) → Aboneliği yeniler
- markSubscriptionPastDue(subscriptionId) → Ödeme hatası işaretler
```

---

## 🎯 BAŞARI KRİTERLERİ

### ✅ Sistem Hazır Olduğunda:
1. User "Pro'ya Geç" butonuna tıklayabilmeli
2. İyzico ödeme sayfası açılmalı
3. Ödeme sonrası otomatik abonelik oluşmalı
4. 400 kredi yüklenmeli
5. Her ay otomatik yenileme olmalı
6. İptal/yeniden aktifleştirme çalışmalı
7. Webhook'lar güvenli şekilde işlenmeli

---

**BAŞARILAR! 🚀**
