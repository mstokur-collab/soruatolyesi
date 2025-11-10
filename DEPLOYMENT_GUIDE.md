# Firebase Cloud Functions Deployment Rehberi

## Sorunun Analizi

Uygulamanız şu hatayı veriyordu: "API key not valid. Please pass a valid API key."

**Neden bu hata oluştu?**
- API anahtarı doğrudan istemci tarafı kodunda (services/geminiService.ts) kullanılıyordu
- .env.local dosyasında sadece "PLACEHOLDER_API_KEY" vardı (geçerli bir anahtar değil)
- Bu yapı güvenlik açısından da sorunluydu çünkü API anahtarı tarayıcıda görünebilirdi

## Çözüm: Cloud Functions ile Güvenli Mimari

Artık API anahtarınız **asla tarayıcıya gitmeyecek**. İşte yeni mimari:

```
İstemci (Tarayıcı) → Cloud Function (Sunucu) → Gemini API
                      ↑
                   API Anahtarı burada güvende
```

## Deployment Adımları

### 1. Firebase CLI Kurulumu
Eğer Firebase CLI kurulu değilse:
```bash
npm install -g firebase-tools
```

### 2. Firebase'e Giriş Yapın
```bash
firebase login
```

### 3. Gemini API Anahtarınızı Firebase Functions'a Ekleyin

**ÖNEMLİ:** Gerçek Gemini API anahtarınızı (AIza... ile başlayan) aşağıdaki komutla ekleyin:

```bash
firebase functions:config:set gemini.key="AIzaXXXXXXXXXXXXXXXXXXXXXXXX"
```

(XXXXXXXXX yerine kendi API anahtarınızı yazın)

API anahtarınızı kontrol edin:
```bash
firebase functions:config:get
```

### 4. Functions Kodunu Derleyin
```bash
cd functions
npm run build
```

### 5. Cloud Functions'ı Deploy Edin
Ana dizine geri dönün ve deploy edin:
```bash
cd ..
firebase deploy --only functions
```

İlk deploy biraz zaman alabilir (2-5 dakika). Deploy tamamlandığında şöyle bir çıktı göreceksiniz:
```
✔  functions: Finished running predeploy script.
✔  functions[callGemini(us-central1)] Successful create operation.
```

### 6. Frontend'i Derleyin ve Deploy Edin
```bash
npm run build
firebase deploy --only hosting
```

## Doğrulama

Deploy tamamlandıktan sonra:

1. Uygulamanızı açın (Firebase Hosting URL'niz)
2. Öğretmen paneline gidin
3. "Soru Üret" butonuna tıklayın
4. Artık soru üretilmeli ve hata vermemeli

## Güvenlik Notları

✅ **Güvenli:**
- API anahtarı sadece sunucuda (Cloud Functions'ta)
- Tarayıcıya hiç gönderilmez
- GitHub'a yüklenmez (functions/.gitignore ile korunuyor)

✅ **Maliyet Kontrolü:**
- Cloud Functions ücretsiz kotası: Aylık 2 milyon çağrı
- Gemini API ücretsiz kotası: Günlük 1500 istek
- Her soru üretimi 1 istek = günde 1500 soru üretebilirsiniz

## Sorun Giderme

### "Gemini API anahtarı yapılandırılmamış" hatası alıyorsanız:
```bash
firebase functions:config:get
```
Çıktıda `gemini.key` görünmüyorsa, Adım 3'ü tekrarlayın.

### Cloud Function çalışmıyor mu?
```bash
firebase functions:log
```
Logs'larda hata detaylarını görebilirsiniz.

### Lokal test yapmak isterseniz:
```bash
cd functions
npm run serve
```
Bu, Cloud Functions'ı lokal olarak emüle eder.

## Ek Bilgiler

- **Functions kaynak kodu:** `functions/src/index.ts`
- **Client-side servis:** `services/geminiService.ts` (artık sadece Cloud Function çağrıları yapıyor)
- **Firebase config:** `firebase.json`

## Cloud Scheduler ile Liderlik Tablolarını Güncelleme

Yeni `refreshLeaderboardSegments` Cloud Function’ı, her sezon için `leaderboards/{seasonId}/segments` koleksiyonunu güncellemek üzere Pub/Sub tetikleyicisine ihtiyaç duyuyor. Firebase bu tetikleyiciyi otomatik oluşturamıyorsa şu adımları izleyin:

1. **Çevresel değişkenleri ayarlayın**
   ```bash
   export PROJECT_ID="$(gcloud config get-value project)"
   export REGION="us-central1" # functions bölgeniize göre değiştirin
   ```

2. **Pub/Sub konusu oluşturun (varsa atlayın)**
   ```bash
   gcloud pubsub topics create refreshLeaderboardSegments --project "$PROJECT_ID"
   ```

3. **Cloud Scheduler işi ekleyin**
   ```bash
   gcloud scheduler jobs create pubsub refresh-leaderboard \
     --project "$PROJECT_ID" \
     --location "$REGION" \
     --schedule "*/15 * * * *" \
     --topic refreshLeaderboardSegments \
     --message-body '{}' \
     --time-zone "Europe/Istanbul"
   ```

4. **İşi doğrulayın**
   ```bash
   gcloud scheduler jobs describe refresh-leaderboard --location "$REGION"
   gcloud scheduler jobs run refresh-leaderboard --location "$REGION"
   ```

Bu adımlar sonrasında `refreshLeaderboardSegments` fonksiyonu 15 dakikada bir otomatik tetiklenir ve manuel tetikleme ile hemen çalıştırılabilir.

### Görev Yönetimi Scheduler Kontrolü

`assignDailyMissions` ve `expireMissionInstances` fonksiyonları `functions.pubsub.schedule(...)` ile tanımlandı; Firebase bu işler için otomatik olarak `firebase-schedule-<function>-<region>` isimli Scheduler job’larını oluşturur. Deploy sonrasında işler görünmezse veya manuel tetiklemek isterseniz:

```bash
gcloud scheduler jobs run firebase-schedule-assignDailyMissions-us-central1 --location "$REGION"
gcloud scheduler jobs run firebase-schedule-expireMissionInstances-us-central1 --location "$REGION"
```

> Not: Bölgeyi Firebase Functions bölgenizle eşleştirin. Jobs listesini doğrulamak için:
>
> ```bash
> gcloud scheduler jobs list --location "$REGION" | grep firebase-schedule
> ```

Deploy tamamlandığında uygulamanız tamamen çalışır halde ve güvenli olacak!
