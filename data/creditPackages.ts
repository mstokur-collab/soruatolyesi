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
        id: 'pro',
        name: 'Profesyonel Paketi',
        credits: 400,
        priceTRY: 299,
        description: 'Yazılı Hazırla özelliğini açan tek paket; kapsamlı sınav içerikleri için tasarlandı.',
        badge: 'best-value',
    },
];
