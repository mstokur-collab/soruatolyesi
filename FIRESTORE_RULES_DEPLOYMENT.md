# Firestore Rules Deployment Guide

## 🔥 Firebase'e Kuralları Deploy Etme

### Yöntem 1: Firebase CLI (Önerilen)

```bash
# Firebase CLI kurulu değilse:
npm install -g firebase-tools

# Giriş yapın:
firebase login

# Kuralları deploy edin:
firebase deploy --only firestore:rules
```

### Yöntem 2: Firebase Console (Manuel)

1. **Firebase Console'a gidin:** https://console.firebase.google.com
2. **Projenizi seçin**
3. **Sol menüden:** Build → Firestore Database
4. **"Rules" sekmesine** tıklayın
5. **Aşağıdaki kuralları kopyalayıp yapıştırın** ve "Publish" butonuna basın

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Helper function to check if user is super admin
    function isSuperAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isSuperAdmin == true;
    }
    
    // User documents - users can read all, write their own, admins can write all
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow update: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow delete: if isSuperAdmin();
    }
    
    // Global curriculum - authenticated users can read, admins can write
    match /global/{document=**} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Questions collection - authenticated users can read, anyone can write, admins can delete
    match /questions/{questionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      allow delete: if isAdmin();
    }
    
    // Duel Questions collection - authenticated users can read/write
    match /duelQuestions/{questionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      allow delete: if isAdmin();
    }
    
    // Duels collection - more secure rules with validation
    match /duels/{duelId} {
      // Anyone authenticated can read duels
      allow read: if request.auth != null;
      
      // Only create if user is one of the players
      allow create: if request.auth != null && 
                      (request.resource.data.challengerId == request.auth.uid || 
                       request.resource.data.opponentId == request.auth.uid);
      
      // Only update if user is one of the players
      // This includes transactions - transactions use update permissions
      allow update: if request.auth != null && 
                      (resource.data.challengerId == request.auth.uid || 
                       resource.data.opponentId == request.auth.uid);
      
      // Only admins can delete
      allow delete: if isAdmin();
    }
    
    // Admin collection - only super admins can access
    match /admin/{document=**} {
      allow read, write: if isSuperAdmin();
    }
    
    // Default deny all other requests
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## ✅ Deployment'ı Doğrulama

1. **Firebase Console → Firestore Database → Rules** sekmesinde
2. **"Published" (Yayınlanmış)** görünümünde yeni kuralları göreceksiniz
3. **Timestamp** son deployment zamanını gösterir

---

## 🔒 Güvenlik İyileştirmeleri

### ÖNCEKİ KURAL (GÜVENSİZ):
```javascript
match /duels/{duelId} {
  allow write: if request.auth != null;  // ❌ Herkes her düelloyu değiştirebilir!
}
```

### YENİ KURAL (GÜVENLİ):
```javascript
match /duels/{duelId} {
  allow update: if request.auth != null && 
                  (resource.data.challengerId == request.auth.uid || 
                   resource.data.opponentId == request.auth.uid);
  // ✅ Sadece düellonun oyuncuları değişiklik yapabilir
}
```

---

## 🧪 Test Etme

Deploy'dan sonra düello oynarken herhangi bir "permission denied" hatası almamalısınız.

Eğer hata alırsanız:
1. Browser console'u kontrol edin
2. Firebase Console → Firestore Database → Rules → "Rules Playground" ile test edin

---

## ⚡ Transaction İzinleri

**✅ Transactions DESTEKLENIYOR**

Firestore'da transaction'lar `update` izni kullanır. Yeni kurallarda:
- `allow update` mevcut ✅
- Sadece düello oyuncuları update yapabilir ✅
- Transaction'lar sorunsuz çalışacak ✅

---

## 📝 Notlar

- Rules değişikliği hemen aktif olur (cache'ler 1 dakika içinde temizlenir)
- Mevcut aktif düellolar etkilenmez
- Yeni düellolar yeni kurallarla oluşturulur
- Admin kullanıcılar tüm erişim haklarına sahiptir
