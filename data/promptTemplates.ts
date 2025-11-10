// Bu dosya, belirli kazanımlar için özel olarak hazırlanmış, yüksek kaliteli 
// yapay zeka prompt şablonlarını içerir. Bu, yapay zekanın daha yaratıcı, 
// bağlama uygun ve görsel olarak zengin sorular üretmesini sağlamak için kullanılır.

// Anahtar: kazanımId (Örn: "M.8.1.1.1")
// Değer: O kazanım için kullanılacak özel prompt metni.
export const promptTemplates: Record<string, string> = {

  'M.8.1.1.1': `
Sen bir 8. sınıf matematik öğretmeni ve soru yazma uzmanısın. 
Amacın, hem metin hem de görsel içeren, görselin sorunun bir parçası olduğu özgün sorular üretmek.
Lütfen aşağıdaki JSON formatında bir çıktı üret:

{
  "kazanımId": "M.8.1.1.1",
  "question": "Torbalarda verilen topların üzerinde yazan sayılardan 80 sayısının doğal sayı bölenlerinin yazılı olduğu top sayısı ile doğal sayı böleni olmayanların yazılı olduğu top sayısı arasındaki fark aşağıdakilerden hangisidir?",
  "options": ["1", "2", "3", "4"],
  "answer": "2",
  "explanation": "80'in doğal sayı bölenleri: 1, 2, 4, 5, 8, 10, 16, 20, 40, 80'dir. Torbalardaki sayılardan 1, 5, 8, 10, 16, 20 olmak üzere 6 tanesi 80'in bölenidir. 3, 12, 15, 29 olmak üzere 4 tanesi ise böleni değildir. Aradaki fark 6 - 4 = 2'dir.",
  "visualPrompt": "Basit ve temiz bir çizim stiliyle, bir masanın üzerinde duran iki adet şeffaf torba. Soldaki torbanın içinde üzerinde 1, 3, 8, 10, 5 yazan beş adet top bulunsun. Sağdaki torbanın içinde ise üzerinde 15, 16, 29, 12, 20 yazan beş adet top bulunsun. Toplar ve sayılar net bir şekilde görülebilsin."
}

Yukarıdaki örneğe birebir benzer yapıda, aynı kazanım ("M.8.1.1.1") için, farklı sayılar ve farklı bir senaryo (örneğin kartlar, kutular vb.) kullanarak YENİ ve ÖZGÜN bir soru daha oluştur. Soru metni, seçenekler, cevap ve görsel açıklaması tamamen yeni olmalıdır.
  `,

  'M.7.1.4': `
Sen bir 7. sınıf matematik öğretmeni ve soru yazma uzmanısın. 
Amacın, "Oran ve Orantı" konusunda, hem metin hem de görsel içeren, görselin sorunun bir parçası olduğu özgün sorular üretmek.
Lütfen aşağıdaki JSON formatında bir çıktı üret:

{
  "kazanımId": "M.7.1.4",
  "question": "Lezzetli bir kek yapmak için hazırlanan tarifin bir kısmı yukarıda gösterilmiştir. Bu tarifte un ve şeker oranının her zaman aynı kalması gerektiğine göre, 12 yumurta kullanılacak büyük bir kek için kaç gram un gereklidir?",
  "options": ["1000", "1200", "1500", "1800"],
  "answer": "1200",
  "explanation": "Tarife göre 3 yumurta için 300 gr un kullanılmaktadır. Bu oran 1 yumurta için 100 gr un demektir. 12 yumurta kullanılacaksa, 12 * 100 = 1200 gr un gerekir.",
  "visualPrompt": "Minimalist ve şık bir tarif kartı tasarımı. Üzerinde 'Lezzetli Kek Tarifi' başlığı olsun. Altında, 'Malzemeler' listesi görünsün. Listede alt alta '3 adet Yumurta', '300 gr Un', '150 gr Şeker', '100 ml Süt' yazsın. Çizim, temiz ve anlaşılır bir infografik gibi olmalı."
}

Yukarıdaki örneğe birebir benzer yapıda, aynı kazanım ("M.7.1.4") için, farklı sayılar ve farklı bir oran problemi senaryosu (örneğin bir harita ölçeği, bir boya karışımı, bir araç yakıt tüketimi vb.) kullanarak YENİ ve ÖZGÜN bir soru daha oluştur. Soru metni, seçenekler, cevap ve görsel açıklaması tamamen yeni olmalıdır.
  `,

};
