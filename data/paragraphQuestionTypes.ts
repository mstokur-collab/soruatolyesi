import type { ParagraphQuestionTypesByGrade } from '../types';

export const paragraphQuestionTypes: ParagraphQuestionTypesByGrade = {
  5: [
    {
      id: 'PARA5-MAIN-IDEA',
      title: 'Ana Fikir ve Konu Analizi',
      summary:
        'Paragrafın ana fikrini, konusunu ve yardımcı düşüncelerini bulmaya odaklanan temel okuduğunu anlama soruları.',
      focusPoints: [
        'Ana fikir, konu ve paragraf başlığı arasındaki ilişkiyi kavrama',
        'Yardımcı düşünceleri ana fikri destekleyen unsurlar olarak ayırt etme',
        'Metinde vurgulanan düşünceyi farklı cümlelerle ifade edebilme',
      ],
      questionStems: [
        'Bu paragrafın ana fikri aşağıdakilerden hangisidir?',
        'Metnin konusu nedir ve hangi başlık bu paragrafı en iyi karşılar?',
        'Yazar bu paragrafla neyi vurgulamak istemiştir?',
      ],
      tags: ['ana fikir', 'konu', 'başlık', 'yardımcı düşünce'],
      difficulty: 'temel',
      gradeFocus: '5. sınıf odak: temel okuduğunu anlama ve ana fikri sezme becerisi.',
    },
    {
      id: 'PARA5-SEQUENCE-CONTEXT',
      title: 'Zaman, Mekân ve Olay Sıralama',
      summary:
        'Paragraftaki olayların nerede ve ne zaman gerçekleştiğini, karakterlerin davranışlarını ve olay akışını sorgulayan sorular.',
      focusPoints: [
        'Yer, zaman ve karakter bilgilerini paragraftan çıkarma',
        'Olayların önce-sonra ilişkisini belirleme',
        'Paragrafın giriş-gelişme-sonuç akışını takip etme',
      ],
      questionStems: [
        'Olay nerede/geçmektedir ve hangi zaman ifadeleri ipucu vermektedir?',
        'Paragrafta anlatılan olayların doğru sıralaması hangisidir?',
        'Karakterin davranışını hazırlayan durum nedir?',
      ],
      tags: ['zaman', 'mekân', 'olay akışı', 'karakter'],
      difficulty: 'temel',
      gradeFocus: 'Yer-zaman-karakter ilişkisini fark etmeye yönelik sorular.',
    },
    {
      id: 'PARA5-EMOTION-TONE',
      title: 'Duygu ve Tutum Sezme',
      summary:
        'Karakterlerin veya yazarın duygusunu, amacını ve paragrafın genel tonunu belirleyen sorular.',
      focusPoints: [
        'Karakterin ne hissettiğini metindeki ipuçlarından hareketle belirleme',
        'Yazarın paragrafı yazma amacını ve tutumunu sezme',
        'Metnin tonunu (iyimser, eleştirel, mizahi vb.) ayırt etme',
      ],
      questionStems: [
        'Paragraftaki kahramanın duygusu aşağıdakilerden hangisidir?',
        'Yazar bu paragrafı hangi amaçla kaleme almıştır?',
        'Metnin tonu nasıl tanımlanabilir?',
      ],
      tags: ['duygu', 'tutum', 'ton', 'amaç'],
      difficulty: 'temel',
      gradeFocus: '5. sınıf kazanımı: duygu ve tutumu sezme, metne uygun başlık bulma.',
    },
    {
      id: 'PARA5-VOCAB-INFERENCE',
      title: 'Kelime Anlamı ve Basit Çıkarım',
      summary:
        'Paragrafta geçen kelime veya cümlelerin anlamını kestiren ve temel çıkarımlar yaptıran sorular.',
      focusPoints: [
        'Bağlamdan kelime anlamı çıkarma, eş/zıt anlamlılarını bulma',
        'Cümlelerin paragraftaki işlevini açıklama',
        'Metinden doğrudan çıkarım yapılabilen bilgileri seçme',
      ],
      questionStems: [
        'Paragrafta geçen “...” sözcüğü hangi anlama gelmektedir?',
        'Bu cümle paragrafta neyi vurgulamak için kullanılmıştır?',
        'Metne göre aşağıdakilerden hangisi doğrudur/yanlıştır?',
      ],
      tags: ['kelime anlamı', 'cümle anlamı', 'çıkarım'],
      difficulty: 'temel',
      gradeFocus: 'Basit çıkarım ve kelime anlamı kazanımlarını destekler.',
    },
    {
      id: 'PARA5-BASIC-INFERENCE',
      title: 'Yer, Zaman ve Karaktere Dayalı Çıkarımlar',
      summary:
        'Metindeki ipuçlarına bakarak karakterin özellikleri, davranış sebebi ve paragrafta ima edilen mesajları buldurur.',
      focusPoints: [
        'Karakterin davranışıyla örtüşen nedeni belirleme',
        'Metindeki küçük ipuçlarından sonuç çıkarma',
        'Yer-zaman bilgisiyle olayın anlamını genişletme',
      ],
      questionStems: [
        'Karakter bu davranışı neden yapmıştır?',
        'Paragraftan nasıl bir sonuç çıkarılabilir?',
        'Bu paragrafın ima ettiği mesaj aşağıdakilerden hangisidir?',
      ],
      tags: ['çıkarım', 'yer-zaman', 'karakter analizi'],
      difficulty: 'temel',
      gradeFocus: '5. sınıfta basit çıkarım ve bağlam kurma becerilerini pekiştirir.',
    },
  ],
  6: [
    {
      id: 'PARA6-MAIN-SUPPORT',
      title: 'Ana ve Yardımcı Düşünceyi Ayırt Etme',
      summary:
        'Ana düşünceyi destekleyen yardımcı düşünceleri tespit etmeyi ve paragrafın başlığını belirlemeyi hedefler.',
      focusPoints: [
        'Ana düşünceyi oluşturan anahtar cümleyi bulma',
        'Yardımcı düşünceleri sınıflandırma',
        'Paragrafın başlığını veya tematik özetini seçme',
      ],
      questionStems: [
        'Paragrafın ana ve yardımcı düşünceleri aşağıdakilerin hangisidir?',
        'Bu paragraf için en uygun başlık nedir?',
        'Metinde hangi düşünce ön plana çıkarılmıştır?',
      ],
      tags: ['ana fikir', 'yardımcı fikir', 'başlık'],
      difficulty: 'orta',
      gradeFocus: '6. sınıf: ana-yardımcı ilişkisinin güçlendirilmesi.',
    },
    {
      id: 'PARA6-CAUSE-EFFECT',
      title: 'Sebep-Sonuç ve Amaç-Sonuç',
      summary:
        'Paragraftaki olayların nedeni, amacı ve sonuçlarını sorgulayan orta düzey soru tipleri.',
      focusPoints: [
        'Bir olayın neden gerçekleştiğini belirleme',
        'Davranışların amaçlarını açıklama',
        'Metindeki sebep-sonuç bağlaçlarını takip etme',
      ],
      questionStems: [
        'Bu durumun temel sebebi aşağıdakilerden hangisidir?',
        'Paragrafta belirtilen davranışın amacı nedir?',
        'Yazar bu sonucu hangi gerekçeye dayandırmaktadır?',
      ],
      tags: ['sebep-sonuç', 'amaç-sonuç', 'mantık ilişkisi'],
      difficulty: 'orta',
      gradeFocus: '6. sınıfta neden-sonuç ve amaç-sonuç ilişkilerini kavrama.',
    },
    {
      id: 'PARA6-PARAGRAPH-COMPLETION',
      title: 'Paragraf Tamamlama ve Akışı Bozan Cümle',
      summary:
        'Paragrafın giriş veya sonuç cümlesini bulma, akışı bozan cümleyi çıkarma gibi yapısal sorular.',
      focusPoints: [
        'Paragrafın bütünlüğünü sağlayan cümleleri seçme',
        'Akışa uymayan ifadeyi belirleme',
        'Paragrafın giriş/gelişme/sonuç düzenini pekiştirme',
      ],
      questionStems: [
        'Paragrafı tamamlayan cümle aşağıdakilerden hangisidir?',
        'Akışı bozan cümle hangisidir?',
        'Paragrafın sonuç cümlesi ne olabilir?',
      ],
      tags: ['paragraf tamamlama', 'akışı bozan cümle', 'giriş-sonuç'],
      difficulty: 'orta',
      gradeFocus: '6. sınıf: yapı farkındalığı ve tutarlı paragraf oluşturma.',
    },
    {
      id: 'PARA6-TEXT-STRUCTURE',
      title: 'Metin Türü, Anlatım Biçimi ve Düşünceyi Geliştirme',
      summary:
        'Paragrafın türünü, anlatım biçimini ve kullanılan düşünce geliştirme yollarını (örnekleme, karşılaştırma vb.) araştırır.',
      focusPoints: [
        'Paragrafın bilgilendirici/öyküleyici/açıklayıcı türünü belirleme',
        'Anlatım biçimlerini (betimleme, açıklama, tartışma) ayırt etme',
        'Örnekleme, tanımlama, karşılaştırma gibi düşünce geliştirme yollarını tespit etme',
      ],
      questionStems: [
        'Paragraf hangi türde yazılmış olabilir?',
        'Metinde kullanılan anlatım biçimi nedir?',
        'Yazar düşüncesini hangi yöntemle desteklemiştir?',
      ],
      tags: ['metin türü', 'anlatım biçimi', 'düşünceyi geliştirme yolları'],
      difficulty: 'orta',
      gradeFocus: '6. sınıf: metin bilincini geliştirme ve yapı unsurlarını tanıma.',
    },
    {
      id: 'PARA6-IMPLIED',
      title: 'Örtük Anlam ve Temel Çıkarım',
      summary:
        'Metinden doğrudan söylenmeyen mesajları sezdirir, “buna göre” tarzı sorularla çıkarım yaptırır.',
      focusPoints: [
        'Buna göre/aşağıdakilerden hangisi söylenebilir-söylenemez',
        'Metindeki ipuçlarından dolaylı anlam çıkarma',
        'Okurun yorum yapmasını sağlayan sorular',
      ],
      questionStems: [
        'Metne göre aşağıdakilerden hangisi söylenebilir?',
        'Paragraftan çıkarılabilecek sonuç nedir?',
        'Yazarın ima ettiği düşünce aşağıdakilerden hangisidir?',
      ],
      tags: ['örtük anlam', 'çıkarım', 'yorum'],
      difficulty: 'orta',
      gradeFocus: 'Açık anlamın ötesine geçerek örtük mesajı yakalama.',
    },
  ],
  7: [
    {
      id: 'PARA7-TRUE-FALSE',
      title: 'Metne Göre Doğru/Yanlış ve Varsayım Analizi',
      summary:
        'Paragrafa göre verilen ifadeleri değerlendirme, metindeki varsayımları veya ön yargıları sorgulama.',
      focusPoints: [
        '“Metne göre hangisi doğrudur/yanlıştır?” tarzı sorgulamalar',
        'Varsayımları, ön kabulleri ve genellemeleri fark etme',
        'Metnin mantıksal bütünlüğünü doğrulama',
      ],
      questionStems: [
        'Paragrafa göre aşağıdakilerden hangisi yanlıştır?',
        'Metinde hangi varsayım görülmektedir?',
        'Yazarın savunduğu görüş hangi ön kabule dayanmaktadır?',
      ],
      tags: ['doğru-yanlış', 'varsayım', 'metne göre'],
      difficulty: 'orta',
      gradeFocus: '7. sınıf: örtük anlam ve doğrulama becerilerini güçlendirme.',
    },
    {
      id: 'PARA7-FLOW-BREAKER',
      title: 'Akışı Bozan Cümle ve Yapı Analizi',
      summary:
        'Akışı bozan cümleyi bulma, giriş-gelişme-sonuç düzenini bozabilecek ifadeleri tespit etme.',
      focusPoints: [
        'Paragrafta bütünlüğü bozan ifadeyi çıkarma',
        'Mantık sırası ve bağlaçlarla uyumu inceleme',
        'Paragrafı en iyi tamamlayan cümleyi seçme',
      ],
      questionStems: [
        'Metnin akışını bozan cümle hangisidir?',
        'Paragraf aşağıdaki cümlelerden hangisi ile anlamlı biçimde tamamlanabilir?',
        'Bu cümle paragrafta hangi görevi üstlenmiştir?',
      ],
      tags: ['akış', 'paragraf tamamlama', 'yapı'],
      difficulty: 'orta',
      gradeFocus: 'Akış analizine hazırlık ve LGS formatındaki yapı soruları.',
    },
    {
      id: 'PARA7-AUTHOR-TONE',
      title: 'Yazarın Amacı, Tutumu ve Tonu',
      summary:
        'Yazarın iletişim amacını, bakış açısını ve paragrafın üslubunu sorgulayan sorular.',
      focusPoints: [
        'Yazarın tutumunu (eleştirel, destekleyici, mizahi) sezme',
        'İletilmek istenen mesajı ve hedef kitleyi belirleme',
        'Metnin tonunu belirleyen ipuçlarını yakalama',
      ],
      questionStems: [
        'Yazar bu paragrafı hangi amaçla yazmıştır?',
        'Metnin tonu aşağıdakilerden hangisiyle uyumludur?',
        'Yazarın bu konuya bakışı nasıldır?',
      ],
      tags: ['amaç', 'tutum', 'ton', 'hedef kitle'],
      difficulty: 'orta',
      gradeFocus: '7. sınıfta yazarın amacı ve tutumunu analiz eden kazanımlar.',
    },
    {
      id: 'PARA7-DEVELOPMENT-METHODS',
      title: 'Düşünceyi Geliştirme Yolları ve Metin Türü',
      summary:
        'Örnekleme, tanık gösterme, betimleme gibi teknikleri belirleyen orta/ileri seviye sorular.',
      focusPoints: [
        'Düşünceyi geliştirme yollarını tanıma',
        'Metin türü ile kullanılan yöntemi ilişkilendirme',
        'Anlatım biçiminin paragraf anlamına etkisini tartışma',
      ],
      questionStems: [
        'Paragrafta düşünceyi geliştirmek için hangi yola başvurulmuştur?',
        'Bu paragraf hangi anlatım biçiminde yazılmıştır?',
        'Metin hangi türde değerlendirilebilir?',
      ],
      tags: ['anlatım biçimi', 'düşünceyi geliştirme', 'metin türü'],
      difficulty: 'orta',
      gradeFocus: '7. sınıf kazanımı: metin yapısını bilinçli okuma.',
    },
    {
      id: 'PARA7-LOGIC-CHAIN',
      title: 'Mantık İlişkileri ve Sözel Mantık Soruları',
      summary:
        'Tablo/grafik destekli, kim-nerede-ne zaman gibi eşleştirmelerle sözel mantığı ölçen sorular.',
      focusPoints: [
        'Bilgileri tablo veya şema üzerinde eşleştirme',
        'Neden-sonuç zinciri kurma',
        'Paragrafı diğer bilgilerle ilişkilendirerek sonuca ulaşma',
      ],
      questionStems: [
        'Paragrafa göre aşağıdaki tablolardan hangisi doldurulmalıdır?',
        'Metindeki bilgilere göre hangi eşleştirme doğrudur?',
        'Paragraftan hareketle kim, nerede, ne yapmıştır?',
      ],
      tags: ['sözel mantık', 'tablo yorumlama', 'eşleştirme'],
      difficulty: 'orta',
      gradeFocus: 'Mantık-muhakeme ve yeni nesil becerileri destekler.',
    },
  ],
  8: [
    {
      id: 'PARA8-HYBRID-ANALYSIS',
      title: 'Karma Paragraf Analizi',
      summary:
        'Birden fazla beceriyi aynı anda ölçen, uzun paragraf + tek soruluk LGS tarzı sorular.',
      focusPoints: [
        'Ana fikir, yardımcı düşünce, duygu ve yapı unsurlarını birlikte değerlendirme',
        'Uzun paragrafı hızla okuyup kritik bilgileri seçme',
        'Birden fazla paragrafı karşılaştırma/sentezleme',
      ],
      questionStems: [
        'Bu uzun metne göre aşağıdakilerden hangisi yanlıştır?',
        'Paragrafın ana fikri ile yardımcı düşünceleri nasıl ilişkilendirilebilir?',
        'Metinden hangi sonuç çıkarılabilir?',
      ],
      tags: ['karma analiz', 'LGS', 'üst düzey'],
      difficulty: 'ileri',
      gradeFocus: '8. sınıf LGS formatına uygun karma paragraf soruları.',
    },
    {
      id: 'PARA8-HIGH-INFERENCE',
      title: 'Üst Düzey Çıkarım ve İma Soruları',
      summary:
        'Örtük anlam, ima ve eleştirel okumayı içeren yüksek bilişsel beceri soruları.',
      focusPoints: [
        'Metin altı mesajları ve ima edilen tutumları belirleme',
        'Yazarın savını destekleyen kanıtları sorgulama',
        'Bilginin doğruluğunu ve güvenilirliğini değerlendirme',
      ],
      questionStems: [
        'Paragrafta ima edilen düşünce aşağıdakilerden hangisidir?',
        'Yazarın savunduğu görüşün güçlü/zayıf yönü nedir?',
        'Metindeki bilginin doğruluğu nasıl sorgulanabilir?',
      ],
      tags: ['ima', 'örtük anlam', 'eleştirel okuma'],
      difficulty: 'ileri',
      gradeFocus: 'Eleştirel okuma ve üst düzey çıkarım kazanımlarını destekler.',
    },
    {
      id: 'PARA8-FLOW-STRUCTURE',
      title: 'Akışı Bozan ve Paragrafın Yapısı',
      summary:
        'Akışı bozan cümle, paragraf tamamlama, çoklu paragraf ilişkilendirme gibi yapısal LGS soruları.',
      focusPoints: [
        'Birden fazla paragraf arasında bağlantı kurma',
        'Giriş-gelişme-sonuç düzenini analiz etme',
        'Paragrafı mantıklı biçimde başlatan/bitiren cümleyi seçme',
      ],
      questionStems: [
        'Bu çok parçalı metinde akışı bozan cümle hangisidir?',
        'Paragrafın sonuç cümlesi aşağıdakilerden hangisi olabilir?',
        'Verilen cümlelerden hangisi paragrafa eklenirse anlam bütünlüğü korunur?',
      ],
      tags: ['akışı bozan', 'paragraf tamamlama', 'yapı'],
      difficulty: 'ileri',
      gradeFocus: 'Sentez gerektiren uzun paragraf sorularına hazırlık.',
    },
    {
      id: 'PARA8-DATA-INTERPRET',
      title: 'Grafik/Tablo Destekli Paragraf Soruları',
      summary:
        'Metin içi grafik, tablo veya görsel bilgileri yorumlayıp paragraflarla ilişkilendiren yeni nesil sorular.',
      focusPoints: [
        'Tablo/grafik verilerini metinle eşleştirme',
        'Bilgileri ilişkilendirerek doğru çıkarım yapma',
        'Sözel mantık senaryolarını paragrafla bütünleştirme',
      ],
      questionStems: [
        'Paragrafta verilen bilgilere göre tablo nasıl doldurulmalıdır?',
        'Grafikteki verilerden hangisi paragraftaki görüşü destekler?',
        'Metne göre hangi karakter hangi etkinlikte yer almıştır?',
      ],
      tags: ['grafik yorumlama', 'tablo', 'sözel mantık'],
      difficulty: 'ileri',
      gradeFocus: 'Yeni nesil veri yorumlama ve ilişkilendirme becerisini ölçer.',
    },
    {
      id: 'PARA8-CRITICAL-READING',
      title: 'Eleştirel Okuma ve Görüş Değerlendirme',
      summary:
        'Paragraftaki savların güçlü/zayıf yönlerini inceleyen, ön yargı ve varsayımları sorgulayan sorular.',
      focusPoints: [
        'Yazarın savunu değerlendirme ve karşı görüş üretme',
        'Bilginin kaynağını ve güvenilirliğini sorgulama',
        'Varsayım ve önyargıları ayırt etme',
      ],
      questionStems: [
        'Paragraftaki görüşün zayıf yönü aşağıdakilerden hangisidir?',
        'Bu metindeki ön yargı nasıl açıklanabilir?',
        'Yazarın savunduğu görüşe hangi eleştiri getirilebilir?',
      ],
      tags: ['eleştirel okuma', 'varsayım', 'değerlendirme'],
      difficulty: 'ileri',
      gradeFocus: '7–8. sınıf programındaki eleştirel okuma kazanımlarına hizmet eder.',
    },
  ],
};
