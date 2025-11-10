<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1erJZKcSjwdNuR75P8H2YuBLqopc8AV0S

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Missions Seed

Görev koleksiyonunu örnek verilerle doldurmak için:

1. Bir Firebase servis hesabı anahtarını indirin ve `GOOGLE_APPLICATION_CREDENTIALS=/path/key.json` olarak ayarlayın.
2. Gerekirse `data/sampleMissions.json` dosyasını düzenleyin.
3. Şu komutu çalıştırın:

```bash
npm run seed:missions
```

Bu komut `missions` koleksiyonundaki ilgili belgeleri günceller veya oluşturur.
