import React, { useEffect, useRef, useState } from 'react';
import {
    hasPaymentLink,
    initiatePayment,
    listenPendingPayments,
    processPendingPaymentReference,
} from '../services/payments';
import type { PendingPaymentRecord, PendingPaymentStatus } from '../services/payments';
import type { CreditPackage } from '../types';
import { useAuth } from '../contexts/AppContext';
import { useToast } from './Toast';

type ResourceStatus = 'normal' | 'low' | 'zero';

const LOW_RESOURCE_THRESHOLD = 3;
const CONTACT_EMAIL = 'mstokur@hotmail.com';
const ORDER_CODE_LENGTH = 6;
const PHONE_STORAGE_KEY = 'soruligi_phone';

interface PendingOrderInfo {
    pendingId: string;
    linkSlug: string;
    email: string;
    packageName: string;
    priceTRY: number;
    phone?: string;
}

const formatOrderCode = (orderId: string) => {
    if (!orderId) return '';
    if (orderId.length <= ORDER_CODE_LENGTH) {
        return orderId.toUpperCase();
    }
    return orderId.slice(-ORDER_CODE_LENGTH).toUpperCase();
};

const sanitizePhoneInput = (value: string) => value.replace(/[^\d+0-9\s-]/g, '');

const normalizePhoneForOrder = (value: string) => value.replace(/\D+/g, '').replace(/^0+/, '');

const formatPhoneForDisplay = (value?: string) => {
    if (!value) return '';
    const digits = value.replace(/\D+/g, '');
    if (digits.length <= 3) return digits;
    const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)];
    return parts.filter(Boolean).join(' ');
};

const toDateOrNull = (value?: any): Date | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') {
        try {
            return value.toDate();
        } catch {
            return null;
        }
    }
    if (value instanceof Date) {
        return value;
    }
    return null;
};

const formatPendingDate = (value?: any) => {
    const date = toDateOrNull(value);
    if (!date) return '';
    return date.toLocaleString('tr-TR', { hour12: false });
};

const getPendingStatusMeta = (status: PendingPaymentStatus) => {
    if (status === 'completed') {
        return { label: 'Tamamlandi', className: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' };
    }
    if (status === 'failed' || status === 'cancelled') {
        return { label: 'Iptal edildi', className: 'border-rose-400/40 bg-rose-500/10 text-rose-100' };
    }
    return { label: 'Bekleniyor', className: 'border-amber-300/50 bg-amber-500/10 text-amber-100' };
};

const duelTicketBundles = [
    {
        id: 'ticket-mini',
        title: 'Mini Seri',
        tickets: 3,
        description: 'Hafta sonu meydan okumaları için hızlı başlangıç paketi.',
        priceHint: '29 TL (yakında)',
        badge: 'new',
    },
    {
        id: 'ticket-team',
        title: 'Takım Paketi',
        tickets: 8,
        description: 'Sınıf içinde arkadaş turnuvaları için ideal.',
        priceHint: '59 TL (yakında)',
        badge: 'popular',
    },
    {
        id: 'ticket-tournament',
        title: 'Turnuva',
        tickets: 15,
        description: 'Kulüp ya da hafta boyu ligleri için tek seferde bilet.',
        priceHint: '95 TL (yakında)',
        badge: 'best-value',
    },
];

const CARD_CHECKOUT_URL = import.meta.env.VITE_CARD_CHECKOUT_URL || '';

const buildCheckoutUrl = (params: Record<string, string | number | undefined>) => {
    if (!CARD_CHECKOUT_URL) {
        return null;
    }
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value));
        }
    });
    return `${CARD_CHECKOUT_URL}?${searchParams.toString()}`;
};

const startCardCheckout = (payload: { kind: 'credit' | 'duel'; id: string; name: string; amount?: number; quantity?: number }) => {
    const checkoutUrl = buildCheckoutUrl({
        kind: payload.kind,
        productId: payload.id,
        name: payload.name,
        amount: payload.amount,
        quantity: payload.quantity,
    });
    if (!checkoutUrl || typeof window === 'undefined') {
        return false;
    }
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    return true;
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);

const createMailLink = (subject: string, body: string) => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${CONTACT_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;
};

const useValuePulse = (value: number) => {
    const [isPulsing, setIsPulsing] = useState(false);
    const previous = useRef<number>(value);

    useEffect(() => {
        if (previous.current === value) {
            return;
        }
        previous.current = value;
        setIsPulsing(true);
        const timeoutId = window.setTimeout(() => setIsPulsing(false), 550);
        return () => window.clearTimeout(timeoutId);
    }, [value]);

    return isPulsing;
};

export interface OnlinePresenceBadgeProps {
    count: number;
    pulse?: boolean;
    variant?: 'inline' | 'card';
    className?: string;
}

export const OnlinePresenceBadge: React.FC<OnlinePresenceBadgeProps> = ({
    count,
    pulse = false,
    variant = 'inline',
    className = '',
}) => {
    if (count <= 0) return null;

    const displayValue = count >= 50 ? '50+' : `${count}`;
    const isCard = variant === 'card';
    const baseClasses = isCard
        ? 'bg-transparent text-white font-extrabold px-2.5 py-0.5 text-[11px] sm:text-sm sm:px-3 sm:py-1 border border-white/45 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-[2px]'
        : 'bg-[#1FDF64]/15 text-white/90 font-semibold px-2.5 py-1 text-xs sm:text-sm border border-[#1FDF64]/40 shadow-[0_10px_25px_rgba(0,0,0,0.35)]';

    return (
        <span
            className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full transition-all duration-200 ${baseClasses} ${
                pulse ? 'scale-[1.05] shadow-[0_0_30px_rgba(0,255,157,0.65)]' : ''
            } ${className}`}
        >
            <span className="relative flex h-3 w-3 items-center justify-center text-[#00FF7F]" aria-hidden="true">
                <span
                    className="absolute h-2.5 w-2.5 rounded-full bg-[#00FF7F] opacity-70 blur-[1px] animate-ping"
                    style={{ animationDuration: '0.8s' }}
                />
                <span className="relative h-2 w-2 rounded-full bg-[#00FF7F] shadow-[0_0_14px_rgba(0,255,127,0.95)]" />
            </span>
            <span className="text-base leading-none sm:text-lg text-white drop-shadow" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor">
                    <path d="M9 11.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm6 0a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7ZM3 19a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4 1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm10 0a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4 1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1Z" />
                </svg>
            </span>
            <span className="tracking-tight flex items-center gap-1 text-white">
                <span className="text-[#00FF9D] font-black text-sm sm:text-lg leading-none drop-shadow-[0_0_8px_rgba(0,255,157,0.8)]">
                    {displayValue}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest opacity-90 hidden sm:inline">
                    çevrimiçi
                </span>
            </span>
            <span className="sr-only">{displayValue} çevrimiçi kullanıcı</span>
        </span>
    );
};

const getStatus = (value: number): ResourceStatus => {
    if (value === 0) return 'zero';
    if (value <= LOW_RESOURCE_THRESHOLD) return 'low';
    return 'normal';
};

const ResourceValue: React.FC<{ value: number; pulse: boolean }> = ({ value, pulse }) => (
    <span
        className={`text-lg font-semibold tracking-tight text-slate-100 transition-all duration-200 ${
            pulse ? 'scale-105 text-white drop-shadow-[0_2px_8px_rgba(94,234,212,0.4)]' : ''
        }`}
        aria-live="polite"
    >
        {value}
    </span>
);

interface CreditResourceStripProps {
    credits: number;
    duelTickets: number;
    isCompact?: boolean;
    onActionClick: () => void;
    className?: string;
}


export const CreditResourceStrip: React.FC<CreditResourceStripProps> = ({
    credits,
    duelTickets,
    isCompact = false,
    onActionClick,
    className = '',
}) => {
    const creditPulse = useValuePulse(credits);
    const ticketPulse = useValuePulse(duelTickets);
    const urgentAction = credits === 0 || duelTickets === 0;

    const renderStatusAdornment = (status: ResourceStatus) => {
        if (status === 'zero') {
            return (
                <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                    0
                </span>
            );
        }
        if (status === 'low') {
            return <span className="ml-1 inline-block h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]" aria-hidden="true" />;
        }
        return null;
    };

    const actionLabel = urgentAction ? 'Hemen Satın Al' : 'Satın Al';

    const compactContent = (
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-100 sm:text-base">
                <span>Kredi: {credits}</span>
                <span aria-hidden="true" className="text-slate-500">
                    •
                </span>
                <span>Bilet: {duelTickets}</span>
            </div>
            <button
                type="button"
                onClick={onActionClick}
                className="relative overflow-hidden rounded-full border border-emerald-300/60 px-3 py-1 text-xs font-semibold text-emerald-200 shadow-[0_0_25px_rgba(250,204,21,0.35)] transition hover:bg-emerald-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
                <span
                    className="pointer-events-none absolute inset-0 rounded-full bg-amber-200/25 blur-md transition-opacity duration-300"
                    aria-hidden="true"
                />
                <span className="relative">{actionLabel}</span>
            </button>
        </div>
    );

    const wrapperPadding = isCompact ? 'py-2' : 'py-3 sm:py-4';

    return (
        <div
            className={`relative overflow-hidden w-full max-w-3xl rounded-3xl border border-cyan-50/20 bg-gradient-to-br from-[#02050e] via-[#06132a] to-[#0a314d] px-4 text-left text-sm text-slate-100 shadow-[0_22px_60px_rgba(1,6,14,0.85)] ring-1 ring-cyan-900/30 backdrop-blur-xl transition-all duration-300 ${wrapperPadding} ${className}`}
        >
            <div className="pointer-events-none absolute -inset-[3px] rounded-[30px] opacity-55 blur-3xl bg-gradient-to-br from-[#2563eb]/22 via-transparent to-[#7c3aed]/18" />
            <div className="absolute inset-0 opacity-30 bg-[linear-gradient(120deg,_rgba(255,255,255,0.16)_0%,_transparent_45%,_transparent_65%,_rgba(255,255,255,0.12)_100%)]" />
            <div className="relative">
                {isCompact ? (
                    compactContent
                ) : (
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2 text-slate-200">
                            <span className="inline-flex items-center gap-1 font-medium text-slate-100/80">
                                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-emerald-200">
                                    <path
                                        fill="currentColor"
                                        d="M12 2C7.03 2 3 6.03 3 11v6l-1.5 1.5c-.32.32-.1.86.35.86h19.3c.45 0 .67-.54.35-.86L21 17v-6c0-4.97-4.03-9-9-9z"
                                    />
                                </svg>
                                Kredi
                            </span>
                            <span className="flex items-center gap-1">
                                {getStatus(credits) === 'zero' ? (
                                    renderStatusAdornment('zero')
                                ) : (
                                    <>
                                        <ResourceValue value={credits} pulse={creditPulse} />
                                        {renderStatusAdornment(getStatus(credits))}
                                    </>
                                )}
                            </span>
                        </div>
                        <span aria-hidden="true" className="hidden text-slate-500 sm:inline">
                            |
                        </span>
                        <div className="flex items-center gap-2 text-slate-200">
                            <span className="inline-flex items-center gap-1 font-medium text-slate-100/80">
                                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-cyan-200">
                                    <path
                                        fill="currentColor"
                                        d="M12 2l7 4v4c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4zm0 3.53L7 7.74v2.24c0 3.64 2.02 6.9 5 7.91 2.98-1.01 5-4.27 5-7.91V7.74l-5-2.21zM11 9h2v5h-2V9zm0 6h2v2h-2v-2z"
                                    />
                                </svg>
                                Düello Bileti
                            </span>
                            <span className="flex items-center gap-1">
                                {getStatus(duelTickets) === 'zero' ? (
                                    renderStatusAdornment('zero')
                                ) : (
                                    <>
                                        <ResourceValue value={duelTickets} pulse={ticketPulse} />
                                        {renderStatusAdornment(getStatus(duelTickets))}
                                    </>
                                )}
                            </span>
                        </div>
                        <div className="ml-auto">
                            <button
                                type="button"
                                onClick={onActionClick}
                                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                    urgentAction
                                        ? 'border border-rose-300/70 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 text-white shadow-[0_12px_30px_rgba(244,63,94,0.45)] hover:shadow-[0_18px_36px_rgba(244,63,94,0.55)] focus-visible:outline-rose-200'
                                        : 'border border-emerald-200/70 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 text-white shadow-[0_10px_28px_rgba(16,185,129,0.35)] hover:shadow-[0_16px_34px_rgba(16,185,129,0.45)] focus-visible:outline-emerald-200'
                                }`}
                            >
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4 opacity-85"
                                >
                                    <path
                                        fill="currentColor"
                                        d="M5 12h12.17l-4.58-4.59L14 6l8 6-8 6-1.41-1.41L17.17 13H5z"
                                    />
                                </svg>
                                <span className="hidden sm:inline">{urgentAction ? 'Hemen Satın Al' : 'Satın Al'}</span>
                                <span className="sm:hidden">{urgentAction ? 'Hemen Al' : 'Satın Al'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
interface CreditPurchaseSheetProps {
    isOpen: boolean;
    onClose: () => void;
    creditPackages: CreditPackage[];
    isGuest: boolean;
    onRequestAuth?: () => void;
}

export const CreditPurchaseSheet: React.FC<CreditPurchaseSheetProps> = ({
    isOpen,
    onClose,
    creditPackages,
    isGuest,
    onRequestAuth,
}) => {
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const [processingPackId, setProcessingPackId] = useState<string | null>(null);
    const [pendingOrderInfo, setPendingOrderInfo] = useState<PendingOrderInfo | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pendingPayments, setPendingPayments] = useState<PendingPaymentRecord[]>([]);
    const [referenceValues, setReferenceValues] = useState<Record<string, string>>({});
    const [referenceErrors, setReferenceErrors] = useState<Record<string, string>>({});
    const [referenceLoadingId, setReferenceLoadingId] = useState<string | null>(null);
    const [highlightedPendingId, setHighlightedPendingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || !currentUser?.uid) {
            setPendingPayments([]);
            return;
        }
        const unsubscribe = listenPendingPayments(currentUser.uid, setPendingPayments);
        return () => {
            unsubscribe();
        };
    }, [isOpen, currentUser?.uid]);

    useEffect(() => {
        if (!isOpen) {
            setProcessingPackId(null);
            setPendingOrderInfo(null);
            setPendingPayments([]);
            setReferenceValues({});
            setReferenceErrors({});
            setReferenceLoadingId(null);
            setHighlightedPendingId(null);
            return;
        }
        if (typeof window !== 'undefined') {
            const storedPhone = window.localStorage.getItem(PHONE_STORAGE_KEY);
            if (storedPhone) {
                setPhoneNumber(storedPhone);
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleGuestRedirect = () => {
        onClose();
        onRequestAuth?.();
    };

    const renderBadgeLabel = (badge?: CreditPackage['badge']) => {
        if (!badge) return null;
        if (badge === 'popular') return 'Popüler';
        if (badge === 'best-value') return 'En İyi Değer';
        return 'Yeni';
    };

    const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = sanitizePhoneInput(event.target.value || '');
        setPhoneNumber(value);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(PHONE_STORAGE_KEY, value);
        }
    };

    const fallbackToSupport = (pack: CreditPackage) => {
        const fallbackMail = createMailLink(
            `Kredi Paketi Talebi: ${pack.name}`,
            `Merhaba,\n\n${pack.credits} kredilik ${pack.name} paketini satın almak istiyorum. Bana ulaşabilirsiniz.\n`
        );
        const launched = startCardCheckout({
            kind: 'credit',
            id: pack.id,
            name: pack.name,
            amount: pack.priceTRY,
            quantity: pack.credits,
        });

        if (!launched) {
            window.open(fallbackMail, '_blank');
        }
    };

    const handleCreditPackPurchase = async (pack: CreditPackage) => {
        if (isGuest) {
            handleGuestRedirect();
            return;
        }

        if (!currentUser?.uid || !currentUser.email) {
            showToast('Ödeme başlatmak için Google hesabınızla giriş yapmanız gerekiyor.', 'error');
            handleGuestRedirect();
            return;
        }

        const normalizedPhone = normalizePhoneForOrder(phoneNumber);
        if (!normalizedPhone || normalizedPhone.length < 10) {
            showToast('İyzico formunda kullanacağınız 10 haneli telefon numarasını girin (başında 0 olmadan).', 'error');
            return;
        }

        if (!hasPaymentLink(pack.id)) {
            showToast(`${pack.name} paketi için ödeme linki yakında eklenecek. Destek ekibiyle iletişime geçebilirsiniz.`, 'info');
            fallbackToSupport(pack);
            return;
        }

        const placeholderWindow = typeof window !== 'undefined' ? window.open('', '_blank') : null;
        if (placeholderWindow) {
            placeholderWindow.document.write('<p style="font-family: system-ui; padding: 1.5rem;">Ödeme sayfası hazırlanıyor...</p>');
        }

        try {
            setProcessingPackId(pack.id);
            const result = await initiatePayment(currentUser.uid, currentUser.email, pack, {
                context: 'credit-pack',
                expectedPhone: normalizedPhone,
            });

            if (!result) {
                throw new Error('payment-init-failed');
            }

            setPendingOrderInfo({
                pendingId: result.pendingId,
                linkSlug: result.linkSlug,
                email: result.expectedEmail,
                packageName: pack.name,
                priceTRY: pack.priceTRY,
                phone: formatPhoneForDisplay(normalizedPhone),
            });
            setHighlightedPendingId(result.pendingId);
            setReferenceValues((prev) => ({ ...prev, [result.pendingId]: '' }));

            if (typeof window !== 'undefined') {
                window.localStorage.setItem(PHONE_STORAGE_KEY, phoneNumber);
            }

            if (placeholderWindow) {
                placeholderWindow.location.href = result.paymentLink;
            } else {
                window.open(result.paymentLink, '_blank', 'noopener,noreferrer');
            }

            const phoneInfo = result.expectedPhone ? formatPhoneForDisplay(result.expectedPhone) : formatPhoneForDisplay(normalizedPhone);
            showToast(
                `Odeme sekmesi acildi. Iyzico formunda ${result.expectedEmail} e-postasini ve ${phoneInfo} telefonunu kullanmayi unutmayin. Odeme bittiginde referans kodunu bu ekranda girerek islemi tamamlayabilirsiniz.`,
                'info'
            );
        } catch (error) {
            console.error('Payment initiation error:', error);
            placeholderWindow?.close();
            showToast('Ödeme başlatılırken bir sorun oluştu. Lütfen tekrar deneyin veya destek ekibine ulaşın.', 'error');
            fallbackToSupport(pack);
        } finally {
            setProcessingPackId(null);
        }
    };

    const handleDuelBundlePurchase = (bundle: (typeof duelTicketBundles)[number]) => {
        if (isGuest) {
            handleGuestRedirect();
            return;
        }
        const fallbackMail = createMailLink(
            `Düello Bileti Talebi: ${bundle.title}`,
            `Merhaba,\n\n${bundle.tickets} adet düello bileti paketini satın almak istiyorum.\n`
        );
        const launched = startCardCheckout({
            kind: 'duel',
            id: bundle.id,
            name: bundle.title,
            quantity: bundle.tickets,
        });
        if (!launched) {
            window.open(fallbackMail, '_blank');
        }
    };

    const handleReferenceInput = (pendingId: string, value: string) => {
        setReferenceValues((prev) => ({ ...prev, [pendingId]: value }));
        if (referenceErrors[pendingId]) {
            setReferenceErrors((prev) => {
                const next = { ...prev };
                delete next[pendingId];
                return next;
            });
        }
    };

    const handleSubmitReferenceCode = async (pendingId: string) => {
        const trimmedCode = referenceValues[pendingId]?.trim();
        if (!trimmedCode) {
            setReferenceErrors((prev) => ({ ...prev, [pendingId]: 'Referans kodu gerekli.' }));
            return;
        }

        try {
            setReferenceLoadingId(pendingId);
            const response = await processPendingPaymentReference(pendingId, trimmedCode);
            if (response.success) {
                showToast(response.message || 'Kredi yüklendi.', 'success');
                setReferenceValues((prev) => ({ ...prev, [pendingId]: '' }));
                setReferenceErrors((prev) => {
                    const next = { ...prev };
                    delete next[pendingId];
                    return next;
                });
                setHighlightedPendingId(pendingId);
            } else {
                const message = response.message || 'Islem tamamlanamadi.';
                setReferenceErrors((prev) => ({ ...prev, [pendingId]: message }));
                showToast(message, 'error');
            }
        } catch (error: any) {
            const message = error?.message ?? 'Islem tamamlanamadi.';
            setReferenceErrors((prev) => ({ ...prev, [pendingId]: message }));
            showToast(message, 'error');
        } finally {
            setReferenceLoadingId(null);
        }
    };

    const handleCopyOrderCode = async () => {
        if (!pendingOrderInfo || typeof navigator === 'undefined' || !navigator.clipboard) {
            return;
        }
        try {
            await navigator.clipboard.writeText(pendingOrderInfo.pendingId);
            showToast('Sipariş kodu panoya kopyalandı.', 'success');
        } catch (error) {
            console.error('Failed to copy order code', error);
            showToast('Kod kopyalanamadı, manuel olarak kopyalayabilirsiniz.', 'error');
        }
    };

    return (
        <div
            className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/80 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="credit-sheet-title"
            onClick={onClose}
        >
            <div
                className="w-full max-w-4xl max-h-[90vh] sm:max-h-[92vh] overflow-y-auto rounded-[32px] border border-emerald-400/40 bg-slate-950/95 text-slate-100 shadow-[0_35px_120px_rgba(15,118,110,0.45)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-end border-b border-white/10 px-4 py-3 sm:px-6">
                    <h2 id="credit-sheet-title" className="sr-only">
                        AI Kredi ve Düello Paketleri
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Paneli kapat"
                        className="rounded-full border border-white/20 p-2 text-slate-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                            <path fill="currentColor" d="M18 6L6 18M6 6l12 12" strokeWidth={2} stroke="currentColor" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
                    <section>
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-emerald-200 sm:text-base">Kredi Paketleri</h3>
                        </div>
                        <div className="mb-4 rounded-2xl border border-emerald-300/20 bg-slate-900/40 p-4 text-[0.65rem] sm:text-xs">
                            <p className="font-semibold text-emerald-200">Odeme sirasinda bu bilgileri aynen yazmalisiniz</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="flex flex-col gap-1 text-slate-200">
                                    <span className="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">Google e-postaniz</span>
                                    <input
                                        type="text"
                                        value={currentUser?.email ?? ''}
                                        readOnly
                                        className="rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-slate-200">
                                    <span className="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">
                                        Telefon numaran (iyzico formu icin)
                                    </span>
                                    <input
                                        type="tel"
                                        inputMode="tel"
                                        value={phoneNumber}
                                        onChange={handlePhoneChange}
                                        placeholder="5XX XXX XX XX"
                                        className="rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
                                    />
                                </label>
                            </div>
                            <p className="mt-3 text-[0.6rem] text-emerald-100/80">
                                Iyzico formunda farkli e-posta veya telefon yazarsaniz odeme otomatik eslesmez. Lütfen dogru girdiginden emin ol.
                            </p>
                        </div>
                        {pendingOrderInfo && (
                            <div className="mb-4 space-y-3 rounded-2xl border border-amber-300/40 bg-amber-900/15 p-4 text-[0.65rem] text-amber-100 sm:text-xs">
                                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-amber-200">
                                    Satin Alma Adimlari
                                </p>
                                <div className="rounded-2xl border border-amber-400/30 bg-amber-900/20 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-200">
                                        Adim 1 · Iyzico formunu doldur
                                    </p>
                                    <ul className="mt-2 space-y-2 text-[0.7rem]">
                                        <li>
                                            E-posta: <span className="font-semibold text-white">{pendingOrderInfo.email}</span>
                                        </li>
                                        <li>
                                            Telefon: {pendingOrderInfo.phone || formatPhoneForDisplay(phoneNumber)} (SMS dogrulamasi bu numara)
                                        </li>
                                        <li className="flex flex-wrap items-center gap-2">
                                            <span>Siparis kodu:</span>
                                            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 font-mono text-sm text-amber-50">
                                                {formatOrderCode(pendingOrderInfo.pendingId)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleCopyOrderCode}
                                                className="rounded-full border border-amber-300/40 px-2 py-0.5 text-[0.6rem] font-semibold text-amber-100 transition hover:border-amber-200"
                                            >
                                                Kopyala
                                            </button>
                                        </li>
                                        <li>
                                            Iyzico linkini sadece bu sayfadaki butondan acilan sekmede doldur. Farkli bir URL gorursen odemeyi iptal et.
                                        </li>
                                    </ul>
                                </div>
                                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-900/10 p-4 text-emerald-100">
                                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">
                                        Adim 2 · Referans kodunu onayla
                                    </p>
                                    <p className="mt-2 text-[0.7rem]">
                                        Ödeme tamamlandiginda Iyzico ekraninda <strong>Ödeme Numarasi</strong> (ör. <code>27609924</code>)
                                        gorunur. Bu 8-9 haneli kodu buraya yazarsan krediler hemen hesabina yuklenir.
                                    </p>
                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                        <input
                                            type="text"
                                            value={referenceValues[pendingOrderInfo.pendingId] ?? ''}
                                            onChange={(event) =>
                                                handleReferenceInput(pendingOrderInfo.pendingId, event.target.value)
                                            }
                                            placeholder="Örn: 27609924"
                                            className="w-full rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSubmitReferenceCode(pendingOrderInfo.pendingId)}
                                            disabled={referenceLoadingId === pendingOrderInfo.pendingId}
                                            className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {referenceLoadingId === pendingOrderInfo.pendingId ? 'Kontrol ediliyor…' : 'Kodu Onayla'}
                                        </button>
                                    </div>
                                    {referenceErrors[pendingOrderInfo.pendingId] && (
                                        <p className="mt-2 text-xs text-rose-200">
                                            {referenceErrors[pendingOrderInfo.pendingId]}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        {pendingPayments.length > 0 && (
                            <div className="mb-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-[0.65rem] text-slate-100 sm:text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-emerald-200">Bekleyen odemelerin</p>
                                    <span className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-400">
                                        Referans kodu ile tamamla
                                    </span>
                                </div>
                                <div className="mt-3 space-y-3">
                                    {pendingPayments.map((payment) => {
                                        const statusMeta = getPendingStatusMeta(payment.status);
                                        const referenceValue = referenceValues[payment.id] ?? '';
                                        const referenceError = referenceErrors[payment.id];
                                        const isPendingStatus = payment.status === 'pending';
                                        const isProcessingReference = referenceLoadingId === payment.id;
                                        return (
                                            <div
                                                key={payment.id}
                                                className={`rounded-2xl border px-3 py-3 sm:px-4 sm:py-4 ${
                                                    highlightedPendingId === payment.id
                                                        ? 'border-emerald-400/70 bg-emerald-500/5'
                                                        : 'border-white/10 bg-slate-950/50'
                                                }`}
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-semibold text-white sm:text-base">
                                                            {payment.packageName}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {formatCurrency(payment.priceTRY)} • {formatPendingDate(payment.createdAt)}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold ${statusMeta.className}`}
                                                    >
                                                        {statusMeta.label}
                                                    </span>
                                                </div>
                                                {isPendingStatus ? (
                                                    <div className="mt-3 space-y-2">
                                                        <label className="block text-[0.55rem] uppercase tracking-[0.25em] text-slate-500">
                                                            Iyzico referans kodu
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={referenceValue}
                                                            onChange={(event) => handleReferenceInput(payment.id, event.target.value)}
                                                            placeholder="Örn: 27609924"
                                                            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
                                                        />
                                                        {referenceError && (
                                                            <p className="text-xs text-rose-300">{referenceError}</p>
                                                        )}
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSubmitReferenceCode(payment.id)}
                                                                disabled={isProcessingReference}
                                                                className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                {isProcessingReference ? 'Kontrol ediliyor...' : 'Kodu Onayla'}
                                                            </button>
                                                            <p className="text-[0.55rem] text-slate-400">
                                                                Ödeme ekranindaki “Ödeme Numarasi” (ör. 27609924) bilgisini buraya yaz.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mt-3 text-xs text-emerald-200">
                                                        {payment.iyziPaymentId ? `iyziPaymentId: ${payment.iyziPaymentId}` : 'Kredi yüklendi'}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {creditPackages.map((pack) => (
                                <article
                                    key={pack.id}
                                    className="group flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-3 shadow-lg shadow-slate-950/40 transition hover:border-emerald-300/70 hover:shadow-emerald-500/20"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[0.5rem] uppercase tracking-[0.35em] text-slate-400">Kredi paketi</p>
                                            <h4 className="text-sm font-semibold text-white sm:text-base">{pack.name}</h4>
                                        </div>
                                        {pack.badge && (
                                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-100">
                                                {renderBadgeLabel(pack.badge)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1.5 text-xl font-bold text-emerald-300 sm:text-2xl">{pack.credits} kredi</p>
                                    {pack.description && <p className="mt-1 text-[0.65rem] text-slate-300 sm:text-xs">{pack.description}</p>}
                                    <p className="mt-1.5 text-[0.65rem] text-slate-400 sm:text-xs">{formatCurrency(pack.priceTRY)}</p>
                                    <button
                                        type="button"
                                        onClick={() => handleCreditPackPurchase(pack)}
                                        disabled={processingPackId === pack.id}
                                        className={`mt-auto w-full inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-2 text-[0.65rem] font-semibold text-slate-900 transition sm:text-xs ${
                                            processingPackId === pack.id ? 'opacity-60 cursor-not-allowed' : 'hover:translate-y-0.5'
                                        }`}
                                    >
                                        {processingPackId === pack.id ? 'Yönlendiriliyor…' : 'Kart ile Satın Al ›'}
                                    </button>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-cyan-200 sm:text-base">Düello Biletleri</h3>
                            <span className="text-[0.6rem] uppercase tracking-widest text-cyan-200/70 sm:text-[0.65rem]">Canlı oyun paketleri</span>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {duelTicketBundles.map((bundle) => (
                                <div
                                    key={bundle.id}
                                    className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-3 text-[0.65rem] text-slate-100 shadow-lg shadow-slate-950/40 sm:text-xs"
                                >
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-white sm:text-base">{bundle.title}</h4>
                                        {bundle.badge && (
                                            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-100">
                                                {bundle.badge === 'popular' ? 'Popüler' : bundle.badge === 'best-value' ? 'Avantajlı' : 'Yeni'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1.5 text-lg font-bold text-cyan-200 sm:text-xl">{bundle.tickets} bilet</p>
                                    <p className="text-[0.6rem] text-slate-300 sm:text-xs">{bundle.description}</p>
                                    <p className="mt-1.5 text-[0.55rem] uppercase tracking-widest text-cyan-200/80 sm:text-[0.6rem]">{bundle.priceHint}</p>
                                    <button
                                        type="button"
                                        onClick={() => handleDuelBundlePurchase(bundle)}
                                        className="mt-auto w-full inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 px-4 py-2 text-[0.65rem] font-semibold text-slate-900 transition hover:translate-y-0.5 sm:text-xs"
                                    >
                                        {isGuest ? 'Giriş Yap ›' : 'Kart ile Satın Al ›'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <footer className="flex flex-col gap-2 text-[0.65rem] text-slate-400/90 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
                        <p>Kredi kartıyla yapılan tüm satın alımlar güvenli ödeme altyapımız üzerinden işlenir; dekontlar otomatik olarak e-posta adresinize gönderilir.</p>
                        <a
                            href='https://wa.me/905325169135' target='_blank' rel='noreferrer'
                            className="inline-flex items-center gap-2 text-emerald-200 transition hover:text-emerald-100"
                        >
                            Destek ekibiyle iletişime geç ›
                        </a>
                    </footer>
                </div>
            </div>
        </div>
    );
};
