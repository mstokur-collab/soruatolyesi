import type { CreditPackage } from '../types';

// Kredi Paketleri
export const creditPackages: CreditPackage[] = [
    {
        id: 'starter',
        name: 'Başlangıç Paketi',
        credits: 50,
        priceTRY: 49,
        description: 'Yeni başlayanlar için ideal.',
        badge: 'new',
        packageType: 'credit',
    },
    {
        id: 'growth',
        name: 'Büyüme Paketi',
        credits: 150,
        priceTRY: 129,
        description: 'Düzenli soru üretenler için en popüler seçenek.',
        badge: 'popular',
        packageType: 'credit',
    },
    {
        id: 'pro-monthly',
        name: 'Pro Paket',
        credits: 400,
        priceTRY: 349,
        description: 'Aylık 400 kredi + Kütüphanem, Yazılı Hazırla ve referans doküman yükleme gibi gelişmiş Pro araçları. Kullanılmayan krediler birikir.',
        badge: 'best-value',
        isSubscription: true,
        subscriptionType: 'monthly',
        packageType: 'credit',
    },
];

// Düello Bilet Paketleri
export const duelTicketPackages: CreditPackage[] = [
    {
        id: 'duel-mini',
        name: 'Mini Seri',
        credits: 3,
        priceTRY: 29,
        description: 'Hafta sonu meydan okumaları için hızlı başlangıç paketi.',
        badge: 'new',
        packageType: 'duel-ticket',
    },
    {
        id: 'duel-team',
        name: 'Takım Paketi',
        credits: 8,
        priceTRY: 59,
        description: 'Sınıf içinde arkadaş turvaları için ideal.',
        badge: 'popular',
        packageType: 'duel-ticket',
    },
    {
        id: 'duel-tournament',
        name: 'Turnuva',
        credits: 15,
        priceTRY: 95,
        description: 'Kulüp ya da hafta boyu ligleri için tek seferde bilet.',
        badge: 'best-value',
        packageType: 'duel-ticket',
    },
];
