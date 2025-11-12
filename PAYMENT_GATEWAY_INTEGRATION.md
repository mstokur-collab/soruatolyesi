# Ödeme Gateway Entegrasyonu - İyzico

Bu dokümantasyon, Pro abonelik sisteminin iyzico ödeme gateway'i ile entegrasyonunu açıklar.

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Ödeme Akışı](#ödeme-akışı)
3. [Frontend Entegrasyonu](#frontend-entegrasyonu)
4. [Backend Entegrasyonu](#backend-entegrasyonu)
5. [Webhook Yönetimi](#webhook-yönetimi)
6. [Test Senaryoları](#test-senaryoları)
7. [Güvenlik](#güvenlik)

---

## Genel Bakış

### Kullanılan Servisler

- **Frontend**: `services/payments.ts` - Ödeme linki oluşturma ve polling
- **UI**: `components/SubscriptionManager.tsx` - Kullanıcı arayüzü
- **Backend**: `functions/src/subscriptionRenewal.ts` - Webhook ve abonelik yönetimi
- **Database**: Firestore `subscriptions` collection

### Ödeme Akışı Özeti

```
Kullanıcı → "Pro'ya Geç" → Ödeme Linki → iyzico → Ödeme → Webhook → Abonelik Aktif
```

---

## Ödeme Akışı

### 1. İlk Abonelik Başlatma

```typescript
// SubscriptionManager.tsx
const handleSubscribe = async () => {
    // 1. Ödeme linki oluştur
    const { paymentLinkUrl, orderId } = await createPaymentLink({
        productId: 'pro-monthly',
        amount: 349,
        credits: 400,
        description: 'Pro Abonelik - Aylık'
    });

    // 2. Kullanıcıyı yönlendir
    window.open(paymentLinkUrl, '_blank');

    // 3. Ödeme durumunu kontrol et (polling)
    const checkInterval = setInterval(async () => {
        const { status } = await pollOrderStatus(orderId);
        
        if (status === 'paid') {
            // Abonelik oluştur
            await createSubscription(currentUser.uid);
        }
    }, 3000);
};
```

### 2. Aylık Yenileme (Otomatik)

```typescript
// functions/src/subscriptionRenewal.ts
export const dailySubscriptionCheck = functions
    .pubsub
    .schedule('0 2 * * *')  // Her gün 02:00
    .onRun(async () => {
        // Yenilenmesi gereken abonelikleri bul
        const snapshot = await db.collection('subscriptions')
            .where('status', '==', 'active')
            .where('nextBillingDate', '<=', now)
            .get();

        // Her abonelik için ödeme al
        for (const doc of snapshot.docs) {
            await processSubscriptionPayment(doc);
        }
    });
```

---

## Frontend Entegrasyonu

### SubscriptionManager Bileşeni

```tsx
// components/SubscriptionManager.tsx

export const SubscriptionManager: React.FC = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    
    const handleSubscribe = async () => {
        setIsProcessing(true);
        
        try {
            // Ödeme linki oluştur
            const { paymentLinkUrl, orderId } = await createPaymentLink({
                productId: 'pro-monthly',
                amount: 349,
                credits: 400,
                description: 'Pro Abonelik - Aylık'
            });

            // Yeni pencerede aç
            const paymentWindow = window.open(paymentLinkUrl, '_blank');
            
            // Polling başlat
            const checkInterval = setInterval(async () => {
                const { status } = await pollOrderStatus(orderId);
                
                if (status === 'paid') {
                    clearInterval(checkInterval);
                    paymentWindow?.close();
                    
                    // Abonelik oluştur
                    await firestoreService.createSubscription(currentUser.uid);
                    showToast('Pro abonelik başarıyla başlatıldı!', 'success');
                }
            }, 3000);

            // Timeout
            setTimeout(() => {
                clearInterval(checkInterval);
                showToast('Ödeme zaman aşımına uğradı.', 'error');
            }, 60000);
            
        } catch (error) {
            showToast('Ödeme işlemi başlatılamadı.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <button onClick={handleSubscribe} disabled={isProcessing}>
            {isProcessing ? 'İşleniyor...' : 'Pro Üyeliği Başlat'}
        </button>
    );
};
```

### Payment Service

```typescript
// services/payments.ts

export type CreateLinkPayload = {
    productId: string;
    amount: number;
    credits: number;
    description?: string;
};

export async function createPaymentLink(payload: CreateLinkPayload) {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    
    const res = await fetch('/api/pay/link/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    
    return res.json(); // { paymentLinkUrl, orderId }
}

export async function pollOrderStatus(orderId: string) {
    const res = await fetch(`/api/pay/orders/${orderId}`);
    return res.json(); // { status: 'pending'|'paid'|'failed' }
}
```

---

## Backend Entegrasyonu

### Cloud Functions

```typescript
// functions/src/subscriptionRenewal.ts

// 1. Webhook Handler
export const handlePaymentWebhook = functions
    .https
    .onRequest(async (req, res) => {
        const event = req.body;
        
        switch (event.type) {
            case 'payment.succeeded':
                await handlePaymentSuccess(event.data);
                break;
                
            case 'payment.failed':
                await handlePaymentFailure(event.data);
                break;
        }
        
        res.status(200).send({ received: true });
    });

// 2. Payment Success Handler
async function handlePaymentSuccess(data: any) {
    const { subscriptionId, userId } = data;
    
    const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
    const subscription = await subscriptionRef.get();
    
    // Aboneliği yenile ve kredi ekle
    await renewSubscription(subscriptionId, subscription.data());
}

// 3. Payment Failure Handler
async function handlePaymentFailure(data: any) {
    const { subscriptionId } = data;
    
    // Past due olarak işaretle
    await markSubscriptionPastDue(subscriptionId);
}

// 4. Subscription Renewal
async function renewSubscription(subscriptionId: string, subscription: any) {
    const batch = db.batch();
    
    // Bir ay sonrası için tarihi hesapla
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Aboneliği güncelle
    const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
    batch.update(subscriptionRef, {
        currentPeriodStart: admin.firestore.FieldValue.serverTimestamp(),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(nextMonth),
        nextBillingDate: admin.firestore.Timestamp.fromDate(nextMonth),
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        failedPaymentAttempts: 0
    });
    
    // Kredi ekle
    const userRef = db.collection('users').doc(subscription.userId);
    batch.update(userRef, {
        aiCredits: admin.firestore.FieldValue.increment(subscription.creditsPerPeriod)
    });
    
    await batch.commit();
}
```

---

## Webhook Yönetimi

### Webhook URL Yapılandırması

```
Production: https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/handlePaymentWebhook
Development: http://localhost:5001/YOUR-PROJECT/YOUR-REGION/handlePaymentWebhook
```

### iyzico Webhook Ayarları

1. iyzico Dashboard'a gir
2. Ayarlar → Webhook'lar
3. Webhook URL'i ekle
4. Aşağıdaki event'leri aktif et:
   - `payment.succeeded`
   - `payment.failed`
   - `subscription.cancelled`

### Webhook Event Tipleri

```typescript
interface WebhookEvent {
    type: 'payment.succeeded' | 'payment.failed' | 'subscription.cancelled';
    data: {
        subscriptionId: string;
        userId: string;
        orderId?: string;
        amount?: number;
        failureReason?: string;
    };
    timestamp: string;
}
```

---

## Test Senaryoları

### 1. Başarılı Abonelik Başlatma

```typescript
// Test adımları:
1. ProfileScreen'e git
2. "Pro'ya Geç" butonuna tıkla
3. Ödeme sayfasında test kartı kullan:
   - Kart: 5528 7900 0000 0001
   - CVC: 123
   - Son Kullanma: 12/30
4. Ödemeyi tamamla
5. Abonelik otomatik olarak aktif olmalı
6. 400 kredi eklenmeli
```

### 2. Başarısız Ödeme

```typescript
// Test adımları:
1. Webhook'u manuel tetikle:
   POST /handlePaymentWebhook
   {
       "type": "payment.failed",
       "data": {
           "subscriptionId": "test-sub-id",
           "failureReason": "insufficient_funds"
       }
   }

2. Abonelik "past_due" olarak işaretlenmeli
3. failedPaymentAttempts sayacı artmalı
```

### 3. Aylık Yenileme

```typescript
// Test için tarihi manuel değiştir:
await db.collection('subscriptions').doc(subId).update({
    nextBillingDate: admin.firestore.Timestamp.now()
});

// dailySubscriptionCheck'i manuel çalıştır
// Abonelik yenilenmeli ve kredi eklenmeli
```

---

## Güvenlik

### 1. Webhook Doğrulama

```typescript
// İyzico webhook signature doğrulama
function verifyWebhookSignature(req: Request): boolean {
    const signature = req.headers['x-iyzico-signature'];
    const payload = JSON.stringify(req.body);
    
    const expectedSignature = crypto
        .createHmac('sha256', process.env.IYZICO_SECRET_KEY)
        .update(payload)
        .digest('hex');
    
    return signature === expectedSignature;
}

// Kullanım:
export const handlePaymentWebhook = functions.https.onRequest(async (req, res) => {
    if (!verifyWebhookSignature(req)) {
        res.status(401).send({ error: 'Invalid signature' });
        return;
    }
    
    // Webhook işle...
});
```

### 2. Rate Limiting

```typescript
// Firebase Functions için rate limiting
import * as rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100 // maksimum 100 istek
});

export const handlePaymentWebhook = functions
    .https
    .onRequest(limiter, async (req, res) => {
        // ...
    });
```

### 3. İdempotency

```typescript
// Aynı webhook'un tekrar işlenmesini engelle
async function processWebhookIdempotent(webhookId: string, handler: Function) {
    const webhookRef = db.collection('processedWebhooks').doc(webhookId);
    const webhookDoc = await webhookRef.get();
    
    if (webhookDoc.exists) {
        console.log(`Webhook ${webhookId} already processed`);
        return;
    }
    
    await handler();
    
    await webhookRef.set({
        processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
}
```

---

## Deployment

### 1. Environment Variables

```bash
# .env dosyasına ekle
IYZICO_API_KEY=your_api_key
IYZICO_SECRET_KEY=your_secret_key
IYZICO_BASE_URL=https://api.iyzipay.com
```

### 2. Firebase Functions Deploy

```bash
# Tüm functions'ları deploy et
firebase deploy --only functions

# Sadece subscription functions
firebase deploy --only functions:dailySubscriptionCheck,functions:handlePaymentWebhook
```

### 3. Firestore Rules

```javascript
// firestore.rules
match /subscriptions/{subscriptionId} {
    allow read: if request.auth != null && 
                   request.auth.uid == resource.data.userId;
    
    allow write: if false; // Sadece backend yazabilir
}
```

---

## Sorun Giderme

### 1. Ödeme Başarılı Ama Abonelik Aktif Olmadı

```typescript
// Webhook loglarını kontrol et
firebase functions:log --only handlePaymentWebhook

// Manuel düzeltme:
await createSubscription(userId);
```

### 2. Polling Çalışmıyor

```typescript
// CORS sorunu olabilir - vite.config.ts'yi kontrol et:
export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'https://your-backend.com',
                changeOrigin: true
            }
        }
    }
});
```

### 3. Webhook Gelmedi

```typescript
// 1. Webhook URL'i doğru mu?
// 2. iyzico dashboard'da webhook aktif mi?
// 3. Firewall kuralları?

// Manuel webhook testi:
curl -X POST https://YOUR-FUNCTION-URL/handlePaymentWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment.succeeded",
    "data": {
      "subscriptionId": "test-id",
      "userId": "test-user-id"
    }
  }'
```

---

## API Referansı

### createPaymentLink

```typescript
function createPaymentLink(payload: CreateLinkPayload): Promise<{
    paymentLinkUrl: string;
    orderId: string;
}>
```

**Parameters:**
- `productId`: string - Ürün ID (örn: 'pro-monthly')
- `amount`: number - Tutar (TL)
- `credits`: number - Verilecek kredi miktarı
- `description`: string? - Açıklama (opsiyonel)

**Returns:** Ödeme linki ve sipariş ID

### pollOrderStatus

```typescript
function pollOrderStatus(orderId: string): Promise<{
    status: 'pending' | 'paid' | 'failed' | 'expired';
}>
```

**Parameters:**
- `orderId`: string - Sipariş ID

**Returns:** Ödeme durumu

---

## İletişim ve Destek

Sorular için:
- GitHub Issues: [Link]
- Email: support@example.com
- Dokümantasyon: PRO_SUBSCRIPTION_DOCUMENTATION.md

---

**Son Güncelleme:** 12.11.2025
**Versiyon:** 1.0.0
