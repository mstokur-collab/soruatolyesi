import type { CreditPackage } from '../types';

export const creditPackages: CreditPackage[] = [
    {
        id: 'starter',
        name: 'Başlangıç Paketi',
        credits: 50,
        priceTRY: 49,
        description: 'Yeni başlayanlar için ideal.',
        badge: 'new',
    },
    {
        id: 'growth',
        name: 'Büyüme Paketi',
        credits: 150,
        priceTRY: 129,
        description: 'Düzenli soru üretenler için en popüler seçenek.',
        badge: 'popular',
    },
    {
        id: 'pro-monthly',
        name: 'Pro Abonelik',
        credits: 400,
        priceTRY: 349,
        description: 'Aylık 400 kredi + Kütüphanem, Yazılı Hazırla ve referans doküman yükleme gibi gelişmiş Pro araçları. Kullanılmayan krediler birikir.',
        badge: 'best-value',
        isSubscription: true,
        subscriptionType: 'monthly',
    },
];
