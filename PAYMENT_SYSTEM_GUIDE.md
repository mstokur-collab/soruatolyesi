# Sabit Link Ödeme Sistemi Kullanım Kılavuzu

## 📋 Genel Bakış

Bu sistem **Iyzico sabit linkleri** kullanarak basit bir ödeme sistemi sağlar.
- ❌ Dinamik link oluşturma YOKTUR
- ✅ Önceden oluşturulmuş sabit linkler kullanılır
- ✅ Basit, hızlı ve güvenilir yapı

## 🚀 Ne Değişti?

### Eski Sistem (KALDIRILDI ❌)
- `functions/src/api.ts` → createPaymentLink endpoint
- `functions/src/api.ts` → checkOrderStatus endpoint  
- `functions/src/iyzico.ts` → createIyzicoPaymentLink fonksiyonu
- `functions/src/iyzico.ts` → checkIyzicoOrderStatus fonksiyonu
- `functions/src/index.ts` → createPaymentLink fonksiyonu
- `functions/src/index.ts` → getOrderStatus fonksiyonu
- Dinamik link oluşturma için API çağrıları
- Polling (sürekli status kontrolü)

### Yeni Sistem (✅)
- `services/payments.ts` → PAYMENT_LINKS objesi (sabit linkler)
- `services/payments.ts` → redirectToPayment() (yönlendirme)
- `services/payments.ts` → hasPaymentLink() (kontrol)
- `functions/src/index.ts` → iyzicoWebhook (sadece webhook handler)
- Sabit Iyzico linkleri
- Webhook ile otomatik kredi yükleme

---

## 🔧 Kurulum Adımları

### 1. Iyzico'da Sabit Link Oluşturma

Her paket için Iyzico panelinden sabit link oluşturun:

1. Iyzico hesabınıza giriş yapın
2. **Ödeme Bağlantısı** veya **Payment Link** bölümüne gidin
3. Yeni link oluşturun:
   - **Başlangıç Paketi**: 49 TL, 50 kredi
   - **Büyüme Paketi**: 129 TL, 150 kredi
   - **Pro Abonelik**: 349 TL, 400 kredi (aylık)
4. Oluşturulan linkleri kopyalayın

### 2. Linkleri Sisteme Ekleme

`services/payments.ts` dosyasını açın ve linkleri ekleyin:

```typescript
export const PAYMENT_LINKS: Record<string, string> = {
  'starter': 'https://iyzi.link/XXXXX',        // Başlangıç paketi linkiniz
  'growth': 'https://iyzi.link/YYYYY',         // Büyüme paketi linkiniz
  'pro-monthly': 'https://iyzi.link/ZZZZZ',   // Pro abonelik linkiniz
};
```

**ÖNEMLİ:** 
- Link ID'leri `data/creditPackages.ts` dosyasındaki paket ID'leriyle eşleşmelidir
- Sandbox ortamında test için: `https://sandbox.iyzi.link/XXXXX` formatı kullanın
- Canlı ortamda: `https://iyzi.link/XXXXX` formatı kullanın

### 3. Paket ID Kontrolü

`data/creditPackages.ts` dosyasındaki paket ID'lerini kontrol edin:

```typescript
export const creditPackages: CreditPackage[] = [
    {
        id: 'starter',        // ← Bu ID payment.ts'deki key ile aynı olmalı
        name: 'Başlangıç Paketi',
        credits: 50,
        priceTRY: 49,
    },
    {
        id: 'growth',         // ← Bu ID payment.ts'deki key ile aynı olmalı
        name: 'Büyüme Paketi',
        credits: 150,
        priceTRY: 129,
    },
    {
        id: 'pro-monthly',    // ← Bu ID payment.ts'deki key ile aynı olmalı
        name: 'Pro Abonelik',
        credits: 400,
        priceTRY: 349,
        isSubscription: true,
    },
];
```

### 4. Webhook Desteğini Kontrol Et (KRİTİK!)

**SORU:** Sabit link yönteminde webhook var mı?

**CEVAP:** İyzico'da iki tür sabit link var:

#### A) Ödeme Linki (Payment Link) - ✅ Webhook DESTEKLER
- İyzico panelinde "Ödeme Linki" veya "Payment Link" bölümünden oluşturulan linkler
- **Webhook özelliği VAR** ama manuel yapılandırma gerekir
- Her link için benzersiz token var
- API ile entegre edilebilir

**Webhook nasıl yapılandırılır:**

1. **İyzico Panelinden:**
   - İyzico paneline giriş yapın
   - **Ayarlar** → **Entegrasyon Ayarları** → **İşyeri Bildirimleri** bölümüne gidin
   - Webhook URL'inizi ekleyin:
     ```
     https://YOUR-REGION-YOUR-PROJECT-ID.cloudfunctions.net/iyzicoWebhook
     ```
   - **Kaydet** butonuna tıklayın

2. **Webhook URL Formatı:**
   ```
   https://[REGION]-[PROJECT-ID].cloudfunctions.net/iyzicoWebhook
   
   Örnek:
   https://europe-west1-myproject-123.cloudfunctions.net/iyzicoWebhook
   ```

3. **Firebase Project ID Bulma:**
   ```bash
   # Firebase Console'dan:
   # 1. Project Overview'e tıklayın
   # 2. Project Settings'e girin
   # 3. "Project ID" alanını kopyalayın
   
   # VEYA firebase.json'dan:
   cat firebase.json | grep projectId
   ```

#### B) Toplu Link / Basit Link - ❌ Webhook YOK
- Daha basit, tek kullanımlık linkler
- Webhook desteği YOK
- Manuel takip gerekir

**ÖNEMLİ NOT:** Ekran görüntünüzde görünen "İşyeri Bildirimleri" ayarı, webhook'un DOĞRU yerden yapıldığını gösteriyor. ✅

---

### 5. Webhook'un Çalışıp Çalışmadığını Test Etme

**Adım 1: Test Ödemesi Yapın**
```bash
1. Sandbox ortamında test linkinizle ödeme yapın
2. Ödemeyi tamamlayın
```

**Adım 2: Firebase Logs Kontrol Edin**
```bash
# Firebase Console → Functions → Logs bölümünü açın
# VEYA terminal'den:
firebase functions:log --only iyzicoWebhook

# Şunu görmelisiniz:
# "Iyzico webhook received: {...}"
# "Order found in orders collection"
# "Credits updated: {before: 0, after: 50, added: 50}"
```

**Adım 3: Firestore Kontrol Edin**
```bash
# Firebase Console → Firestore bölümünü açın
# orders veya paymentOrders koleksiyonunu kontrol edin
# Yeni bir sipariş kaydı var mı?
# status: "paid" olarak güncellenmiş mi?
```

**Adım 4: Kullanıcı Kredisi Kontrol Edin**
```bash
# Firestore → users/{userId} → aiCredits alanını kontrol edin
# Krediler artmış mı?
```

### 6. Webhook Çalışmıyorsa Ne Yapmalı?

**Seçenek 1: Manuel Kredi Yükleme Sistemi (Önerilen)**

Bir admin paneli oluşturun:
```typescript
// Admin Panel - Manuel Kredi Yükleme
async function manualCreditLoad(userId: string, credits: number, orderId: string) {
  await db.collection('users').doc(userId).update({
    aiCredits: admin.firestore.FieldValue.increment(credits)
  });
  
  // Transaction log ekle
  await db.collection('users').doc(userId)
    .collection('creditTransactions').add({
      type: 'manual-purchase',
      amount: credits,
      orderId: orderId,
      addedBy: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
}
```

**Seçenek 2: Dekont Sistemi**

Kullanıcıdan ödeme dekontu isteyin:
1. Ödeme sonrası "Dekontunuzu Yükleyin" ekranı gösterin
2. Dekont yüklendikten sonra admin onaylasın
3. Onaylandıktan sonra krediler yüklensin

**Seçenek 3: İyzico API Entegrasyonu (Tam Otomatik)**

Sabit link yerine Iyzico API'sini kullanın:
- Daha karmaşık kurulum
- Webhook %100 çalışır
- Dinamik link oluşturma
- Daha fazla kontrol

---

## 🎯 Nasıl Çalışır?

### Kullanıcı Akışı

1. Kullanıcı "Satın Al" butonuna tıklar
2. `redirectToPayment(productId)` fonksiyonu çağrılır
3. Sistem PAYMENT_LINKS'ten ilgili linki bulur
4. Kullanıcı yeni sekmede Iyzico ödeme sayfasına yönlendirilir
5. Kullanıcı ödemeyi tamamlar
6. **[Webhook varsa]** Iyzico sisteme bildirim gönderir → Krediler otomatik yüklenir
7. **[Webhook yoksa]** Manuel kredi yükleme gerekir

### Kod Örnekleri

#### Basit Kullanım
```typescript
import { redirectToPayment, hasPaymentLink } from '../services/payments';

// Link tanımlı mı kontrol et
if (hasPaymentLink('starter')) {
  // Ödeme sayfasına yönlendir
  redirectToPayment('starter');
}
```

#### Komple Örnek (Buton Handler)
```typescript
const handlePurchase = (productId: string) => {
  // Link varsa yönlendir
  if (hasPaymentLink(productId)) {
    redirectToPayment(productId);
    return;
  }
  
  // Link yoksa alternatif eylem
  alert('Bu paket için ödeme linki henüz tanımlanmamış.');
};
```

---

## 📝 Yeni Paket Ekleme

Yeni bir kredi paketi eklemek için:

### 1. Iyzico'da Link Oluştur
- Iyzico panelinde yeni ödeme linki oluşturun
- Fiyat ve açıklama bilgilerini girin

### 2. payments.ts'ye Ekle
```typescript
export const PAYMENT_LINKS: Record<string, string> = {
  'starter': 'https://iyzi.link/AAA',
  'growth': 'https://iyzi.link/BBB',
  'pro-monthly': 'https://iyzi.link/CCC',
  'premium': 'https://iyzi.link/DDD',  // ← YENİ PAKET
};
```

### 3. creditPackages.ts'ye Ekle
```typescript
{
  id: 'premium',              // ← payments.ts ile aynı
  name: 'Premium Paket',
  credits: 500,
  priceTRY: 399,
  description: 'En büyük paket',
  badge: 'best-value',
}
```

---

## ⚠️ Önemli Notlar

### Sabit Link Sınırlamaları

**Iyzico sabit linkleri kullanırken:**
- Webhook çalışmayabilir (manuel entegrasyon gerekir)
- Her ödeme için benzersiz referans numarası olmayabilir
- Kredi yüklemesi manuel yapılması gerekebilir

**Çözüm Önerileri:**
1. Kullanıcıdan ödeme sonrası dekont/sipariş numarası isteyin
2. Manuel kredi yükleme paneli oluşturun
3. VEYA Iyzico API entegrasyonuna geçin (daha karmaşık ama tam otomatik)

### Link Tanımlanmamışsa Ne Olur?

Link tanımlanmamış paketler için:
1. `hasPaymentLink(productId)` → `false` döner
2. Fallback olarak:
   - Destek e-postası linki açılır
   - VEYA WhatsApp destek hattı açılır

### Webhook Entegrasyonu

Ödeme tamamlandığında (webhook çalışırsa):
- Iyzico webhook ile `functions/src/index.ts` → `iyzicoWebhook` fonksiyonuna bildirim gönderir
- Webhook handler ödemeyi doğrular
- Krediler otomatik olarak kullanıcı hesabına eklenir

**Webhook URL:** `https://YOUR-PROJECT.cloudfunctions.net/iyzicoWebhook`

### Sandbox vs Production

**Sandbox (Test) Ortamı:**
```typescript
'starter': 'https://sandbox.iyzi.link/AAHXqA'
```

**Production (Canlı) Ortamı:**
```typescript
'starter': 'https://iyzi.link/XXXXX'
```

---

## 🔍 Sorun Giderme

### Link Açılmıyor
- PAYMENT_LINKS objesinde linkin tanımlı olduğundan emin olun
- Link formatının doğru olduğunu kontrol edin
- Tarayıcı popup blocker'ı kontrol edin

### Paket ID Eşleşmiyor
- `data/creditPackages.ts` → `id` alanı
- `services/payments.ts` → `PAYMENT_LINKS` key'i
- İkisi de **tam olarak aynı** olmalı (büyük/küçük harf duyarlı)

### Webhook Çalışmıyor
- **Normal:** Sabit linklerle webhook çalışmayabilir
- Manuel kredi yükleme sistemi kullanın
- VEYA Iyzico API entegrasyonuna geçin

### Krediler Yüklenmiyor
1. Firestore'da sipariş kaydı var mı kontrol edin (orders/paymentOrders koleksiyonu)
2. Webhook loglarını kontrol edin (Firebase Functions logları)
3. Manuel olarak kredi yükleyin

---

## 📞 Destek

Sorun yaşarsanız:
- WhatsApp: +90 532 516 9135
- E-posta: mstokur@hotmail.com

---

## ✅ Kontrol Listesi

Kurulumu tamamlamak için:

- [ ] Tüm paketler için Iyzico'da sabit linkler oluşturuldu
- [ ] Linkler `services/payments.ts` dosyasına eklendi
- [ ] Paket ID'leri `creditPackages.ts` ile eşleşiyor
- [ ] Sandbox ortamında test edildi
- [ ] Production linkleri eklendi
- [ ] Webhook URL'i Iyzico'ya tanımlandı (opsiyonel)
- [ ] Manuel kredi yükleme sistemi hazır (gerekirse)

---

## 📚 İlgili Dosyalar

### Frontend (Sabit Link Sistemi)
```
services/
  └── payments.ts              # ✅ Sabit linkler ve yönlendirme

data/
  └── creditPackages.ts        # Paket tanımları

components/
  ├── CreditResources.tsx      # Kredi satın alma UI
  └── SubscriptionManager.tsx  # Abonelik yönetimi UI
```

### Backend (Sadece Webhook)
```
functions/src/
  ├── index.ts                 # ✅ iyzicoWebhook (tek aktif endpoint)
  ├── iyzico.ts                # ✅ Webhook helper fonksiyonlar
  ├── api.ts                   # ❌ ARTIK KULLANILMIYOR (boş dosya)
  └── subscriptionRenewal.ts   # Abonelik yenileme (ayrı sistem)
```

### Kaldırılan Dosyalar/Fonksiyonlar
- `api.ts` → createPaymentLink endpoint ❌
- `api.ts` → checkOrderStatus endpoint ❌
- `iyzico.ts` → createIyzicoPaymentLink ❌
- `iyzico.ts` → checkIyzicoOrderStatus ❌
- `index.ts` → createPaymentLink ❌
- `index.ts` → getOrderStatus ❌
- `index.ts` → callIyziPaymentLink ❌

---

## 🎓 Sonuç

Bu sistem **basitlik** odaklıdır:
- ✅ Sabit linkler kullanır
- ✅ Hızlı kurulum
- ✅ Az kod
- ⚠️ Manuel kredi yüklemesi gerekebilir (webhook yoksa)

Eğer **tam otomatik** bir sistem istiyorsanız, Iyzico API entegrasyonuna geçmelisiniz (daha karmaşık).
