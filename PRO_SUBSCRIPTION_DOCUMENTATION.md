# 🎯 Pro Abonelik Sistemi - Tam Dokümantasyon

## 📋 İçindekiler
1. [Genel Bakış](#genel-bakış)
2. [Teknik Mimari](#teknik-mimari)
3. [Kullanım Kılavuzu](#kullanım-kılavuzu)
4. [API Referansı](#api-referansı)
5. [Deployment Adımları](#deployment-adımları)
6. [Ödeme Entegrasyonu](#ödeme-entegrasyonu)
7. [Güvenlik](#güvenlik)
8. [Sorun Giderme](#sorun-giderme)

---

## Genel Bakış

### Sistem Özellikleri
- ✅ **Aylık Abonelik Modeli**: 349 TL/ay
- ✅ **Aylık 400 Kredi**: Her ay otomatik yüklenir
- ✅ **Kredi Birikimi**: Kullanılmayan krediler kaybolmaz
- ✅ **Pro Özellikleri**: Kütüphanem, Yazılı Hazırla, ve gelecekteki özellikler
- ✅ **Otomatik Yenileme**: Cloud function ile her gün kontrol
- ✅ **İptal Esnekliği**: Dilediğiniz zaman iptal, dönem sonuna kadar kullanım

### Abonelik Durumları
| Durum | Açıklama | Pro Erişimi | Kredi Yükleme |
|-------|----------|-------------|---------------|
| `active` | Normal abonelik | ✅ Var | ✅ Aylık |
| `cancelled` | İptal edilmiş, dönem sonuna kadar devam | ✅ Var | ❌ Yok |
| `expired` | Süresi dolmuş | ❌ Yok | ❌ Yok |
| `past_due` | Ödeme başarısız | ⚠️ Geçici | ❌ Yok |

---

## Teknik Mimari

### Veri Modeli

#### 1. **Subscription Collection** (`/subscriptions/{subscriptionId}`)
```typescript
{
  id: string;                    // Document ID
  userId: string;                // Kullanıcı ID
  planId: 'pro-monthly';        // Plan türü
  status: SubscriptionStatus;    // Durum
  currentPeriodStart: Timestamp; // Dönem başlangıcı
  currentPeriodEnd: Timestamp;   // Dönem sonu
  cancelAtPeriodEnd: boolean;    // İptal bayrağı
  creditsPerPeriod: 400;        // Aylık kredi
  pricePerPeriod: 349;          // Aylık ücret
  nextBillingDate: Timestamp;   // Sonraki ödeme tarihi
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastPaymentDate: Timestamp;   // Son başarılı ödeme
  failedPaymentAttempts: number; // Başarısız deneme sayısı
}
```

#### 2. **User Updates** (`/users/{userId}`)
```typescript
{
  creditPlan: 'free' | 'pro';   // Plan durumu
  entitlements: {
    examGenerator: boolean;      // Pro özellik erişimi
  }
}
```

#### 3. **Credit Transaction Log** (`/users/{userId}/creditTransactions/{txId}`)
```typescript
{
  type: 'subscription_start' | 'subscription_renewal';
  amount: 400;
  before: number;
  after: number;
  metadata: {
    subscriptionId: string;
    planId: string;
  };
  createdAt: Timestamp;
}
```

### Dosya Yapısı
```
project/
├── types.ts                              # Type tanımları
├── data/creditPackages.ts                # Paket bilgileri
├── services/firestoreService.ts          # Abonelik servisleri
├── components/SubscriptionManager.tsx    # UI bileşeni
├── firestore.rules                       # Güvenlik kuralları
└── functions/src/
    ├── index.ts                          # Function exports
    └── subscriptionRenewal.ts            # Yenileme logic
```

---

## Kullanım Kılavuzu

### Frontend Entegrasyonu

#### 1. **Profile/Settings Sayfasına Ekle**
```tsx
import { SubscriptionManager } from './components/SubscriptionManager';

function ProfileScreen() {
  return (
    <div>
      <h1>Profilim</h1>
      {/* Diğer sekmeler... */}
      <SubscriptionManager />
    </div>
  );
}
```

#### 2. **Pro Özellik Kontrolü**
```tsx
import { useData } from './contexts/AppContext';

function ExamGenerator() {
  const { userData } = useData();
  
  // Pro kontrolü
  const hasProAccess = userData?.creditPlan === 'pro';
  
  if (!hasProAccess) {
    return <UpgradePrompt />;
  }
  
  return <ExamGeneratorContent />;
}
```

#### 3. **Abonelik Durumu Gösterme**
```tsx
import { useEffect, useState } from 'react';
import { onSubscriptionChanges } from './services/firestoreService';

function SubscriptionStatus() {
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = onSubscriptionChanges(
      currentUser.uid,
      setSubscription
    );
    
    return unsubscribe;
  }, [currentUser]);
  
  if (!subscription) {
    return <div>Abonelik yok</div>;
  }
  
  return (
    <div>
      <p>Durum: {subscription.status}</p>
      <p>Sonraki ödeme: {formatDate(subscription.nextBillingDate)}</p>
    </div>
  );
}
```

---

## API Referansı

### Firestore Service Functions

#### `createSubscription(uid, planId?)`
Yeni abonelik oluşturur ve ilk kredileri yükler.

```typescript
const subscriptionId = await createSubscription(
  currentUser.uid,
  'pro-monthly'
);
```

**Returns:** `Promise<string>` - Subscription ID

---

#### `getUserSubscription(uid)`
Kullanıcının aktif aboneliğini getirir.

```typescript
const subscription = await getUserSubscription(currentUser.uid);
if (subscription?.status === 'active') {
  // Pro özelliklere erişim ver
}
```

**Returns:** `Promise<Subscription | null>`

---

#### `onSubscriptionChanges(uid, callback)`
Abonelik değişikliklerini real-time dinler.

```typescript
const unsubscribe = onSubscriptionChanges(
  currentUser.uid,
  (subscription) => {
    console.log('Subscription updated:', subscription);
  }
);

// Cleanup
return () => unsubscribe();
```

**Returns:** `() => void` - Unsubscribe function

---

#### `cancelSubscription(subscriptionId)`
Aboneliği iptal eder (dönem sonunda kapanır).

```typescript
await cancelSubscription(subscription.id);
// Dönem sonuna kadar Pro özellikler açık kalır
```

---

#### `reactivateSubscription(subscriptionId)`
İptal edilmiş aboneliği yeniden aktifleştirir.

```typescript
await reactivateSubscription(subscription.id);
// Otomatik yenileme tekrar başlar
```

---

#### `hasActiveProSubscription(uid)`
Kullanıcının aktif Pro aboneliği olup olmadığını kontrol eder.

```typescript
const isPro = await hasActiveProSubscription(currentUser.uid);
```

**Returns:** `Promise<boolean>`

---

## Deployment Adımları

### 1. Firebase Console Ayarları

#### Firestore Index Oluştur
```bash
# Firebase CLI ile
firebase deploy --only firestore:indexes
```

Veya Console'dan manuel:
- Collection: `subscriptions`
- Fields:
  - `userId` (Ascending)
  - `status` (Ascending)
  - `createdAt` (Descending)

---

### 2. Cloud Functions Deploy

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:dailySubscriptionCheck,functions:handlePaymentWebhook
```

---

### 3. Firestore Rules Deploy

```bash
firebase deploy --only firestore:rules
```

---

### 4. Environment Variables

Firebase Functions config:
```bash
# Ödeme gateway ayarları (örnek: Stripe)
firebase functions:config:set \
  stripe.secret_key="sk_live_..." \
  stripe.webhook_secret="whsec_..."

# Veya iyzico için
firebase functions:config:set \
  iyzi.api_key="..." \
  iyzi.secret_key="..."
```

---

## Ödeme Entegrasyonu

### Stripe Entegrasyonu (Önerilen)

#### 1. **Install Stripe**
```bash
npm install stripe
```

#### 2. **Ödeme Intent Oluştur**
```typescript
// functions/src/subscriptionRenewal.ts içinde

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function processPayment(subscription: any) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: subscription.pricePerPeriod * 100, // Kuruş cinsinden
      currency: 'try',
      customer: subscription.stripeCustomerId,
      description: `Pro Abonelik - ${subscription.planId}`,
      metadata: {
        subscriptionId: subscription.id,
        userId: subscription.userId,
      },
    });
    
    return paymentIntent;
  } catch (error) {
    throw new Error('Ödeme işlemi başarısız');
  }
}
```

#### 3. **Webhook Handler Güncelle**
```typescript
export const handlePaymentWebhook = functions
  .https
  .onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    try {
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          await renewSubscription(event.data.object.metadata.subscriptionId);
          break;
          
        case 'payment_intent.payment_failed':
          await markSubscriptionPastDue(event.data.object.metadata.subscriptionId);
          break;
      }
      
      res.json({ received: true });
    } catch (error) {
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });
```

---

### iyzico Entegrasyonu (Türkiye)

Mevcut `createPaymentLink` fonksiyonunu kullanarak:

```typescript
// Abonelik için ödeme linki oluştur
const response = await fetch('/api/createPaymentLink', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    productId: 'pro-monthly',
    amount: 349,
    credits: 400,
    description: 'Pro Abonelik - Aylık',
  }),
});

const { paymentLinkUrl } = await response.json();
// Kullanıcıyı ödeme sayfasına yönlendir
window.location.href = paymentLinkUrl;
```

---

## Güvenlik

### Firestore Security Rules

```javascript
// ✅ Abonelikler sadece kullanıcı okuyabilir
match /subscriptions/{subscriptionId} {
  allow read: if request.auth != null && 
    resource.data.userId == request.auth.uid;
  allow write: if false; // Sadece cloud functions
}

// ✅ Kullanıcılar kendi verisini güncelleyebilir
match /users/{userId} {
  allow read: if request.auth != null;
  allow update: if request.auth.uid == userId;
}
```

### Cloud Function Security

- ✅ Webhook signature doğrulama
- ✅ Authentication kontrolleri
- ✅ Transaction kullanımı (atomik işlemler)
- ✅ Rate limiting (Firebase quotas)

---

## Sorun Giderme

### Yaygın Hatalar

#### 1. **"Abonelik bulunamadı"**
```typescript
// Çözüm: Subscription oluşturulmuş mu kontrol et
const subscription = await getUserSubscription(uid);
if (!subscription) {
  // Yeni abonelik oluştur
  await createSubscription(uid);
}
```

#### 2. **"Ödeme başarısız"**
```typescript
// past_due durumunu kontrol et
if (subscription.status === 'past_due') {
  // Kullanıcıyı bilgilendir
  showToast('Ödemeniz alınamadı. Lütfen ödeme bilgilerinizi güncelleyin.');
}
```

#### 3. **"Krediler yüklenmiyor"**
```typescript
// Credit transaction logunu kontrol et
const transactions = await listCreditTransactions(uid);
const lastSubscriptionTx = transactions.find(
  tx => tx.type === 'subscription_renewal'
);
```

### Debug Modu

```typescript
// Abonelik durumunu loglama
console.log('Subscription Debug:', {
  id: subscription.id,
  status: subscription.status,
  nextBilling: subscription.nextBillingDate,
  cancelAtEnd: subscription.cancelAtPeriodEnd,
  failedAttempts: subscription.failedPaymentAttempts,
});
```

---

## Test Senaryoları

### 1. **Yeni Abonelik**
```bash
# Test kullanıcısı oluştur
# Pro abonelik başlat
# Kontrol: creditPlan === 'pro'
# Kontrol: aiCredits artmış mı (400)?
```

### 2. **Aylık Yenileme**
```bash
# Cloud function'ı manuel tetikle
firebase functions:shell
> dailySubscriptionCheck()

# Kontrol: Krediler eklendi mi?
# Kontrol: nextBillingDate güncellendi mi?
```

### 3. **İptal ve Yeniden Aktivasyon**
```bash
# Aboneliği iptal et
# Kontrol: status === 'cancelled'
# Kontrol: Pro erişimi hala var mı?

# Yeniden aktifleştir
# Kontrol: status === 'active'
```

---

## Gelecek Geliştirmeler

### Planlar
- [ ] Yıllık abonelik seçeneği (indirimli)
- [ ] Aile paketi (5 kullanıcı)
- [ ] Kurumsal paket
- [ ] Promosyon kodları
- [ ] Referans sistemi
- [ ] Abonelik duraklatma özelliği

---

## Destek

### İletişim
- **E-posta**: support@example.com
- **Dokümantasyon**: https://docs.example.com
- **GitHub Issues**: https://github.com/project/issues

### Loglar
Cloud Functions loglarını izle:
```bash
firebase functions:log --only dailySubscriptionCheck
```

---

## Versiyon Geçmişi

### v1.0.0 (2025-11-12)
- ✅ İlk release
- ✅ Aylık abonelik sistemi
- ✅ Otomatik yenileme
- ✅ UI komponenti
- ✅ Cloud functions
- ✅ Firestore rules

---

**Son Güncelleme**: 12 Kasım 2025
**Yazar**: Cline AI Assistant
**Lisans**: MIT
