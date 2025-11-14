/**
 * Basit Sabit Link Ödeme Sistemi
 * 
 * Bu dosya Iyzico sabit linkleriyle çalışır.
 * Dinamik link oluşturma YAPMAZ, sadece kullanıcıyı 
 * önceden oluşturulmuş Iyzico linklerine yönlendirir.
 */

import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import type { CreditPackage } from '../types';

export type PaymentProduct = {
  id: string;
  name: string;
  paymentLink: string;
  credits?: number;
  price?: number;
};

/**
 * Kredi Paketleri için Sabit Linkler
 * 
 * Yeni paket eklemek için:
 * 1. Iyzico'da sabit link oluştur
 * 2. Aşağıya ekle
 * 3. creditPackages.ts'deki id ile eşleştir
 */
export const PAYMENT_LINKS: Record<string, string> = {
  // ID'ler creditPackages.ts ile EŞLEŞMELİ!
  
  // Kredi Paketleri
  'starter': 'https://sandbox.iyzi.link/AAHXqA',          // ✅ Başlangıç Paketi
  'growth': 'https://sandbox.iyzi.link/AAHYtQ',                                            // ⚠️ Büyüme Paketi - İyzico'dan link ekleyin
  'pro-monthly': '',                                       // ⚠️ Pro Abonelik - İyzico'dan link ekleyin
  
  // Düello Bilet Paketleri
  'duel-mini': '',                                         // ⚠️ Mini Seri (3 bilet) - İyzico'dan link ekleyin
  'duel-team': '',                                         // ⚠️ Takım Paketi (8 bilet) - İyzico'dan link ekleyin
  'duel-tournament': '',                                   // ⚠️ Turnuva (15 bilet) - İyzico'dan link ekleyin
  
  // YENİ PAKET EKLEMEK İÇİN:
  // 1. İyzico'da sabit link oluşturun
  // 2. Yukarıya ekleyin (creditPackages.ts'deki id ile aynı olmalı)
};

interface StaticLinkInfo {
  url: string;
  code: string;
}

const PENDING_PAYMENTS_COLLECTION = 'pendingPayments';

const normalizeEmail = (value?: string | null) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const normalizePhone = (value?: string | null) => {
  if (!value) return '';
  const digits = value.replace(/\D+/g, '');
  if (!digits) return '';
  // Remove leading zeros for consistency (e.g., 0xxxxxxxxx -> xxxxxxxxxx)
  return digits.replace(/^0+/, '');
};

const extractLinkCode = (link?: string | null): string | null => {
  if (!link || typeof link !== 'string') {
    return null;
  }
  const sanitized = link.split('?')[0];
  const segments = sanitized.split('/').filter(Boolean);
  if (segments.length === 0) {
    return sanitized;
  }
  return segments[segments.length - 1] || sanitized;
};

const getPaymentLinkInfo = (productId: string): StaticLinkInfo | null => {
  const url = PAYMENT_LINKS[productId];
  if (!url) {
    return null;
  }
  const code = extractLinkCode(url);
  if (!code) {
    return null;
  }
  return { url, code };
};

export function redirectToPayment(productId: string): boolean {
  const linkInfo = getPaymentLinkInfo(productId);

  if (!linkInfo) {
    console.error(`Odeme linki bulunamadi: ${productId}`);
    return false;
  }

  window.open(linkInfo.url, '_blank', 'noopener,noreferrer');
  return true;
}

export function hasPaymentLink(productId: string): boolean {
  return !!PAYMENT_LINKS[productId];
}

export function getAvailableProducts(): string[] {
  return Object.keys(PAYMENT_LINKS);
}

export async function initiatePayment(
  userId: string,
  userEmail: string,
  packageData: CreditPackage,
  options: InitiatePaymentOptions = {}
): Promise<InitiatePaymentResult | null> {
  try {
    if (!db) {
      console.error('Firestore instance is not initialized');
      return null;
    }

    const linkInfo = getPaymentLinkInfo(packageData.id);
    if (!linkInfo) {
      console.error(`Odeme linki bulunamadi: ${packageData.id}`);
      return null;
    }

    const normalizedEmail = normalizeEmail(userEmail);
    if (!normalizedEmail) {
      console.error('Kullanici e-postasi bulunamadi');
      return null;
    }

    const expiresInMinutes = options.expiresInMinutes ?? 90;
    const expiresAt = Timestamp.fromMillis(Date.now() + expiresInMinutes * 60 * 1000);
    const normalizedPhone = normalizePhone(options.expectedPhone);
    const packageType = packageData.packageType === 'duel-ticket' ? 'duel-ticket' : 'credit';
    const credits = packageType === 'duel-ticket' ? 0 : packageData.credits;
    const tickets = packageType === 'duel-ticket' ? packageData.credits : 0;
    const context = options.context ?? (packageType === 'duel-ticket' ? 'duel-ticket' : 'credit-pack');

    const pendingData = {
      userId,
      expectedEmail: normalizedEmail,
      packageId: packageData.id,
      packageName: packageData.name,
      packageType,
      credits,
      tickets,
      priceTRY: packageData.priceTRY,
      linkSlug: linkInfo.code,
      linkUrl: linkInfo.url,
      status: 'pending' as const,
      expectedPhone: normalizedPhone || null,
      context,
      metadata: options.metadata ?? {},
      iyziPaymentId: null,
      referenceCode: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt,
    };

    const pendingRef = await addDoc(collection(db, PENDING_PAYMENTS_COLLECTION), pendingData);
    console.log('Pending payment olusturuldu:', pendingRef.id);

    return {
      pendingId: pendingRef.id,
      orderId: pendingRef.id,
      paymentLink: linkInfo.url,
      expectedEmail: normalizedEmail,
      linkSlug: linkInfo.code,
      expectedPhone: normalizedPhone || undefined,
    };
  } catch (error) {
    console.error('Payment initiation error:', error);
    return null;
  }
}

export function listenPendingPayments(
  userId: string,
  callback: (records: PendingPaymentRecord[]) => void
): Unsubscribe {
  if (!db) {
    callback([]);
    return () => undefined;
  }

  const userPendingQuery = query(
    collection(db, PENDING_PAYMENTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    userPendingQuery,
    (snapshot) => {
      const items: PendingPaymentRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, any>;
        return {
          id: docSnap.id,
          packageId: data.packageId ?? '',
          packageName: data.packageName ?? '',
          packageType: (data.packageType as 'credit' | 'duel-ticket') ?? 'credit',
          credits: Number(data.credits ?? 0),
          tickets: Number(data.tickets ?? 0),
          priceTRY: Number(data.priceTRY ?? 0),
          linkSlug: data.linkSlug ?? '',
          status: (data.status as PendingPaymentStatus) ?? 'pending',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
          completedAt: data.completedAt instanceof Timestamp ? data.completedAt : undefined,
          referenceCode: data.referenceCode ?? null,
          iyziPaymentId: data.iyziPaymentId ?? null,
        };
      });
      callback(items);
    },
    (error) => {
      console.error('listenPendingPayments error', error);
      callback([]);
    }
  );
}

export async function processPendingPaymentReference(
  pendingId: string,
  referenceCode: string
): Promise<ProcessPaymentResponse> {
  if (!functions) {
    throw new Error('Cloud Functions instance is not initialized');
  }
  const cleanedReference = referenceCode?.trim();
  if (!cleanedReference) {
    throw new Error('Referans kodu gerekli.');
  }
  const callable = httpsCallable(functions, 'processPaymentByReference');
  const result = await callable({
    pendingId,
    referenceCode: cleanedReference,
  });
  const payload = result.data as ProcessPaymentResponse | undefined;
  return (
    payload ?? {
      success: false,
      message: 'Islem sonucuna ulasilamadi.',
      pendingId,
    }
  );
}

/**
 * Kullan��c��y�� ��deme sayfas��na y��nlendir (eski versiyon - geriye d��nǬk uyumluluk i��in)
 * Art��k initiatePayment kullan��lmal��
 * @deprecated Use initiatePayment instead
 */
export function redirectToPaymentLegacy(productId: string): boolean {
  return redirectToPayment(productId);
}
