# Ödeme Sistemi - Düello Bilet Entegrasyonu

## ✅ Tamamlanan İşlemler

### 1. Paket Tanımlamaları (data/creditPackages.ts)
- ✅ Kredi paketlerine `packageType: 'credit'` eklendi
- ✅ Düello bilet paketleri oluşturuldu:
  - `duel-mini`: 3 bilet (₺29)
  - `duel-team`: 8 bilet (₺59)
  - `duel-tournament`: 15 bilet (₺95)

### 2. Ödeme Linkleri (services/payments.ts)
- ✅ Düello bilet paketleri için ödeme linki alanları eklendi
- ✅ `initiatePayment()` fonksiyonu eklendi:
  - Order oluşturma
  - PackageType belirleme
  - Credits/tickets ayrımı
  - Ödeme linkine yönlendirme

### 3. Webhook Güncellemesi (functions/src/index.ts)
- ✅ Order veri tipine yeni alanlar eklendi:
  - `packageType`: 'credit' | 'duel-ticket'
  - `tickets`: number
  - `packageId`: string
  - `packageName`: string
- ✅ Webhook'ta packageType kontrolü eklendi
- ✅ Düello bileti için `duelTickets` alanını güncelleme mantığı
- ✅ Transaction log'larda paket bilgileri

### 4. Type Definitions (types.ts)
- ✅ `CreditPackage` interface'ine `packageType` eklendi

## 🔄 Sistem Çalışma Akışı

### Kullanıcı Akışı:
```
1. Kullanıcı paketi seçer (Kredi veya Düello Bileti)
   ↓
2. Frontend: initiatePayment(userId, packageData) çağrılır
   ↓
3. Firestore'da order kaydı oluşturulur:
   {
     userId: "xxx",
     packageId: "duel-mini",
     packageType: "duel-ticket",
     tickets: 3,
     credits: 0,
     status: "pending"
   }
   ↓
4. Kullanıcı İyzico ödeme sayfasına yönlendirilir
   ↓
5. Kullanıcı ödemeyi tamamlar
   ↓
6. İyzico webhook'u tetikler
   ↓
7. Backend: Order bulunur ve packageType kontrol edilir
   ↓
8. packageType === 'duel-ticket' ise:
   - user.duelTickets += tickets
   - Transaction log: 'duel-ticket-purchase'
   
   packageType === 'credit' ise:
   - user.aiCredits += credits
   - Transaction log: 'purchase'
   ↓
9. Order status: 'paid' olarak güncellenir
```

## 📋 Frontend Entegrasyonu için TODO

Frontend'de şu değişiklikler yapılmalı:

### 1. CreditResources.tsx veya ilgili component'te:

```typescript
import { initiatePayment } from '../services/payments';
import { creditPackages, duelTicketPackages } from '../data/creditPackages';

// Satın alma butonu tıklandığında:
const handlePurchase = async (packageData: CreditPackage) => {
  if (!currentUser) {
    alert('Lütfen giriş yapın');
    return;
  }
  
  try {
    const orderId = await initiatePayment(currentUser.uid, packageData);
    
    if (orderId) {
      console.log('Order oluşturuldu:', orderId);
      // Ödeme sayfası otomatik açıldı
    } else {
      alert('Ödeme linki bulunamadı. Lütfen destek ile iletişime geçin.');
    }
  } catch (error) {
    console.error('Payment error:', error);
    alert('Bir hata oluştu. Lütfen tekrar deneyin.');
  }
};
```

### 2. Düello Bilet Paketlerini Gösterme:

```typescript
import { duelTicketPackages } from '../data/creditPackages';

// Component içinde:
<div className="duel-packages">
  <h3>Düello Biletleri</h3>
  {duelTicketPackages.map(pkg => (
    <div key={pkg.id} className="package-card">
      <h4>{pkg.name}</h4>
      <p>{pkg.credits} bilet</p>
      <p>{pkg.priceTRY} TL</p>
      <button onClick={() => handlePurchase(pkg)}>
        Satın Al
      </button>
    </div>
  ))}
</div>
```

## ⚠️ Önemli Notlar

1. **İyzico Linkleri**: `services/payments.ts` dosyasındaki boş linklerin İyzico'dan alınıp doldurulması gerekiyor:
   - `growth`: Büyüme Paketi linki
   - `pro-monthly`: Pro Abonelik linki
   - `duel-mini`: Mini Seri linki
   - `duel-team`: Takım Paketi linki
   - `duel-tournament`: Turnuva linki

2. **Webhook URL**: İyzico'da webhook URL'i şu şekilde ayarlanmalı:
   ```
   https://us-central1-mustafa1-c956c.cloudfunctions.net/iyzicoWebhook
   ```

3. **Order ID Matching**: İyzico'da order oluştururken `conversationId` veya `merchantOrderId` olarak Firestore'daki order ID'yi kullanmalısınız.

## 🧪 Test Senaryoları

### 1. Kredi Paketi Testi:
- Starter paketini satın al
- Webhook tetiklenmeli
- `aiCredits` artmalı
- Transaction log oluşmalı

### 2. Düello Bileti Testi:
- Mini Seri paketini satın al
- Webhook tetiklenmeli
- `duelTickets` artmalı
- Transaction log type: 'duel-ticket-purchase' olmalı

### 3. Hata Durumları:
- Order bulunamadığında: unprocessedWebhooks'a log
- Kullanıcı bulunamadığında: error
- Zaten ödenmiş order: skip

## 📊 Veritabanı Şeması

### orders collection:
```typescript
{
  userId: string,
  packageId: string,
  packageName: string,
  packageType: 'credit' | 'duel-ticket',
  credits: number,
  tickets: number,
  priceTRY: number,
  status: 'pending' | 'paid' | 'failed' | 'expired',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  paymentId?: string,
  iyziToken?: string
}
```

### users/{userId}/creditTransactions:
```typescript
{
  type: 'purchase' | 'duel-ticket-purchase',
  amount: number,
  before: number,
  after: number,
  metadata: {
    orderId: string,
    provider: 'iyzico-link',
    packageId: string,
    packageName: string
  },
  createdAt: Timestamp
}
```

## 🚀 Deployment

- ✅ Frontend build: Başarılı
- ✅ Firebase deploy: Başarılı
- ✅ Functions güncellendi
- ✅ Hosting güncellendi

**Hosting URL**: https://mustafa1-c956c.web.app

## 📝 Sonraki Adımlar

1. İyzico'dan ödeme linklerini alıp `payments.ts`'ye ekleyin
2. Frontend'de düello bilet paketlerini gösterin
3. `initiatePayment()` fonksiyonunu satın alma butonlarına bağlayın
4. Test ödemeleri yapın (sandbox modunda)
5. Canlıya geçmeden önce tüm akışı test edin
