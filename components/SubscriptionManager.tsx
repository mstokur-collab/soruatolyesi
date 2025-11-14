import React, { useEffect, useState } from 'react';
import { useAuth, useData } from '../contexts/AppContext';
import * as firestoreService from '../services/firestoreService';
import { hasPaymentLink, initiatePayment } from '../services/payments';
import { creditPackages } from '../data/creditPackages';
import type { Subscription } from '../types';
import { useToast } from './Toast';

const PHONE_STORAGE_KEY = 'soruligi_phone';

const sanitizePhoneInput = (value: string) => value.replace(/[^\d+0-9\s-]/g, '');
const normalizePhoneForOrder = (value: string) => value.replace(/\D+/g, '').replace(/^0+/, '');
const formatPhoneForDisplay = (value?: string) => {
    if (!value) return '';
    const digits = value.replace(/\D+/g, '');
    if (digits.length <= 3) return digits;
    const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)];
    return parts.filter(Boolean).join(' ');
};

export const SubscriptionManager: React.FC = () => {
    const { currentUser } = useAuth();
    const { userData, aiCredits } = useData();
    const { showToast } = useToast();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');

    useEffect(() => {
        if (!currentUser?.uid) {
            setIsLoading(false);
            return;
        }

        const unsubscribe = firestoreService.onSubscriptionChanges(
            currentUser.uid,
            (sub) => {
                setSubscription(sub);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser?.uid]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(PHONE_STORAGE_KEY);
        if (stored) {
            setPhoneNumber(stored);
        }
    }, []);

    const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = sanitizePhoneInput(event.target.value || '');
        setPhoneNumber(value);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(PHONE_STORAGE_KEY, value);
        }
    };

    const handleSubscribe = async () => {
        if (!currentUser?.uid || !currentUser.email) {
            showToast('Önce Google hesabınızla giriş yapmalısınız.', 'error');
            return;
        }

        const proPlan = creditPackages.find((pack) => pack.id === 'pro-monthly');
        if (!proPlan) {
            showToast('Pro abonelik paketi henüz tanımlanmadı.', 'error');
            return;
        }

        const normalizedPhone = normalizePhoneForOrder(phoneNumber);
        if (!normalizedPhone || normalizedPhone.length < 10) {
            showToast('Iyzico formunda kullanacaginiz 10 haneli telefon numarasini giriniz (basta 0 olmadan).', 'error');
            return;
        }

        setIsProcessing(true);

        const placeholderWindow = typeof window !== 'undefined' ? window.open('', '_blank') : null;
        if (placeholderWindow) {
            placeholderWindow.document.write('<p style="font-family: system-ui; padding: 1.5rem;">Ödeme sayfası hazırlanıyor...</p>');
        }

        try {
            if (!hasPaymentLink('pro-monthly')) {
                throw new Error('payment-link-missing');
            }

            const result = await initiatePayment(currentUser.uid, currentUser.email, proPlan, {
                context: 'subscription',
                metadata: { planId: 'pro-monthly' },
                expectedPhone: normalizedPhone,
            });

            if (!result) {
                throw new Error('payment-init-failed');
            }

            if (typeof window !== 'undefined') {
                window.localStorage.setItem(PHONE_STORAGE_KEY, phoneNumber);
            }

            if (placeholderWindow) {
                placeholderWindow.location.href = result.paymentLink;
            } else {
                window.open(result.paymentLink, '_blank', 'noopener,noreferrer');
            }

            const phoneDisplay = result.expectedPhone ? formatPhoneForDisplay(result.expectedPhone) : formatPhoneForDisplay(normalizedPhone);
            showToast(
                `Odeme sekmesi acildi. Formda ${result.expectedEmail} e-postasi ve ${phoneDisplay} telefonu ile devam edin.`,
                'info'
            );
        } catch (error) {
            console.error('Subscription checkout error:', error);
            placeholderWindow?.close();
            showToast('Abonelik ödemesi başlatılamadı. Destek ekibiyle iletişime geçebilirsiniz.', 'error');
            window.open('https://wa.me/905325169135', '_blank');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!subscription?.id) return;
        
        const confirmed = window.confirm(
            'AboneliÄŸinizi iptal etmek istediÄŸinizden emin misiniz? ' +
            'Mevcut dÃ¶nem sonuna kadar Pro Ã¶zelliklerine eriÅŸiminiz devam edecek.'
        );
        
        if (!confirmed) return;

        setIsProcessing(true);
        try {
            await firestoreService.cancelSubscription(subscription.id);
            showToast('Abonelik iptal edildi. DÃ¶nem sonuna kadar eriÅŸiminiz devam edecek.', 'info');
        } catch (error) {
            console.error('Cancel error:', error);
            showToast('Abonelik iptal edilemedi. LÃ¼tfen tekrar deneyin.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReactivate = async () => {
        if (!subscription?.id) return;

        setIsProcessing(true);
        try {
            await firestoreService.reactivateSubscription(subscription.id);
            showToast('Abonelik yeniden aktifleÅŸtirildi!', 'success');
        } catch (error) {
            console.error('Reactivate error:', error);
            showToast('Abonelik aktifleÅŸtirilemedi. LÃ¼tfen tekrar deneyin.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatDate = (date: any) => {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('tr-TR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            active: { text: 'Aktif', color: 'bg-green-500' },
            cancelled: { text: 'Ä°ptal Edildi', color: 'bg-yellow-500' },
            expired: { text: 'SÃ¼resi Doldu', color: 'bg-red-500' },
            past_due: { text: 'Ã–deme Bekliyor', color: 'bg-orange-500' },
        };
        const badge = badges[status as keyof typeof badges] || { text: status, color: 'bg-gray-500' };
        return (
            <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${badge.color}`}>
                {badge.text}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const hasActiveSub = subscription && subscription.status === 'active';
    const hasCancelledSub = subscription && subscription.status === 'cancelled';

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Pro Abonelik</h2>

            {!subscription ? (
                // No subscription - Show purchase option
                <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-8 text-white shadow-2xl">
                    <div className="text-center mb-8">
                        <h3 className="text-4xl font-bold mb-2">Pro Ãœyelik</h3>
                        <p className="text-xl opacity-90">TÃ¼m Ã¶zelliklerin kilidini aÃ§</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
                        <div className="flex items-baseline justify-center mb-4">
                            <span className="text-5xl font-bold">349â‚º</span>
                            <span className="text-xl ml-2 opacity-80">/ay</span>
                        </div>
                        <p className="text-center text-sm opacity-80">
                            Ä°stediÄŸin zaman iptal edebilirsin
                        </p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lg">Her ay 400 kredi</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lg">KullanÄ±lmayan krediler birikir</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lg">KÃ¼tÃ¼phanem - dokÃ¼man yÃ¼kleme</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lg">YazÄ±lÄ± HazÄ±rla Ã¶zelliÄŸi</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lg">Gelecekteki tÃ¼m Pro Ã¶zellikler</span>
                        </div>
                    </div>

                    <div className="mb-8 rounded-2xl border border-white/20 bg-white/5 p-4 text-sm text-white/90">
                        <p className="font-semibold text-white">Odeme Bilgileri</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em]">
                                <span>Google e-postasi</span>
                                <input
                                    type="text"
                                    value={currentUser?.email ?? ''}
                                    readOnly
                                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-base font-semibold text-white"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em]">
                                <span>Telefon numaran (iyzico formu)</span>
                                <input
                                    type="tel"
                                    inputMode="tel"
                                    value={phoneNumber}
                                    onChange={handlePhoneChange}
                                    placeholder="5XX XXX XX XX"
                                    className="rounded-xl border border-white/30 bg-slate-900/60 px-3 py-2 text-base text-white placeholder:text-slate-300 focus:border-emerald-300 focus:outline-none"
                                />
                            </label>
                        </div>
                        <p className="mt-2 text-xs text-amber-100">
                            Iyzico formunda bu iki bilgiyi bire bir ayni girmezsen ödeme otomatik eşleşmez.
                        </p>
                    </div>

                    <button
                        onClick={handleSubscribe}
                        disabled={isProcessing}
                        className="w-full bg-white text-purple-600 font-bold py-4 px-6 rounded-xl text-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isProcessing ? 'Ä°ÅŸleniyor...' : 'Pro ÃœyeliÄŸi BaÅŸlat'}
                    </button>
                </div>
            ) : (
                // Has subscription - Show management
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Pro Ãœyelik</h3>
                                <p className="opacity-90">TÃ¼m Ã¶zelliklere eriÅŸim</p>
                            </div>
                            {getStatusBadge(subscription.status)}
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Current Credits */}
                        <div className="bg-gray-50 rounded-xl p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Mevcut Kredi</p>
                                    <p className="text-3xl font-bold text-gray-800">{aiCredits}</p>
                                </div>
                                <div className="bg-purple-100 p-4 rounded-full">
                                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Details */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-1">AylÄ±k Ãœcret</p>
                                <p className="text-xl font-semibold text-gray-800">
                                    {subscription.pricePerPeriod}â‚º
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-1">AylÄ±k Kredi</p>
                                <p className="text-xl font-semibold text-gray-800">
                                    {subscription.creditsPerPeriod} kredi
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-1">BaÅŸlangÄ±Ã§ Tarihi</p>
                                <p className="text-lg font-medium text-gray-800">
                                    {formatDate(subscription.currentPeriodStart)}
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-1">
                                    {subscription.cancelAtPeriodEnd ? 'BitiÅŸ Tarihi' : 'Sonraki Ã–deme'}
                                </p>
                                <p className="text-lg font-medium text-gray-800">
                                    {formatDate(subscription.nextBillingDate)}
                                </p>
                            </div>
                        </div>

                        {/* Warning Messages */}
                        {subscription.status === 'cancelled' && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-yellow-800">
                                    <strong>Not:</strong> AboneliÄŸiniz {formatDate(subscription.currentPeriodEnd)} tarihine kadar devam edecek. 
                                    Bu tarihten sonra Pro Ã¶zelliklerinize eriÅŸiminiz sona erecek.
                                </p>
                            </div>
                        )}

                        {subscription.status === 'past_due' && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-800">
                                    <strong>UyarÄ±:</strong> Ã–deme alÄ±namadÄ±. LÃ¼tfen Ã¶deme bilgilerinizi kontrol edin. 
                                    {subscription.failedPaymentAttempts && subscription.failedPaymentAttempts >= 2 && (
                                        <span className="block mt-2">
                                            {3 - subscription.failedPaymentAttempts} deneme hakkÄ±nÄ±z kaldÄ±.
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            {hasActiveSub && !subscription.cancelAtPeriodEnd && (
                                <button
                                    onClick={handleCancel}
                                    disabled={isProcessing}
                                    className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? 'Ä°ÅŸleniyor...' : 'AboneliÄŸi Ä°ptal Et'}
                                </button>
                            )}

                            {hasCancelledSub && (
                                <button
                                    onClick={handleReactivate}
                                    disabled={isProcessing}
                                    className="flex-1 bg-green-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? 'Ä°ÅŸleniyor...' : 'Yeniden AktifleÅŸtir'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


