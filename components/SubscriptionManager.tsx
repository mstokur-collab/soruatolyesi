import React, { useEffect, useState } from 'react';
import { useAuth, useData } from '../contexts/AppContext';
import * as firestoreService from '../services/firestoreService';
import { createPaymentLink, pollOrderStatus } from '../services/payments';
import type { Subscription } from '../types';
import { useToast } from './Toast';

export const SubscriptionManager: React.FC = () => {
    const { currentUser } = useAuth();
    const { userData, aiCredits } = useData();
    const { showToast } = useToast();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

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

    const handleSubscribe = async () => {
        if (!currentUser?.uid) return;
        
        setIsProcessing(true);
        try {
            // 1. Ödeme linki oluştur
            const { paymentLinkUrl, orderId } = await createPaymentLink({
                productId: 'pro-monthly',
                amount: 349,
                credits: 400,
                description: 'Pro Abonelik - Aylık'
            });

            // 2. Kullanıcıyı ödeme sayfasına yönlendir
            showToast('Ödeme sayfasına yönlendiriliyorsunuz...', 'info');
            
            // Yeni pencerede aç
            const paymentWindow = window.open(paymentLinkUrl, '_blank');
            
            // 3. Ödeme durumunu kontrol et (polling)
            const checkInterval = setInterval(async () => {
                try {
                    const { status } = await pollOrderStatus(orderId);
                    
                    if (status === 'paid') {
                        clearInterval(checkInterval);
                        if (paymentWindow) paymentWindow.close();
                        
                        // Abonelik oluştur
                        await firestoreService.createSubscription(currentUser.uid);
                        showToast('Pro abonelik başarıyla başlatıldı! 400 kredi hesabınıza eklendi.', 'success');
                        setIsProcessing(false);
                    } else if (status === 'failed' || status === 'expired') {
                        clearInterval(checkInterval);
                        if (paymentWindow) paymentWindow.close();
                        showToast('Ödeme başarısız oldu. Lütfen tekrar deneyin.', 'error');
                        setIsProcessing(false);
                    }
                } catch (error) {
                    console.error('Poll error:', error);
                }
            }, 3000); // Her 3 saniyede kontrol et

            // 60 saniye sonra timeout
            setTimeout(() => {
                clearInterval(checkInterval);
                if (isProcessing) {
                    showToast('Ödeme zaman aşımına uğradı. Lütfen tekrar deneyin.', 'error');
                    setIsProcessing(false);
                }
            }, 60000);
            
        } catch (error) {
            console.error('Subscription error:', error);
            showToast('Ödeme işlemi başlatılamadı. Lütfen tekrar deneyin.', 'error');
            setIsProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!subscription?.id) return;
        
        const confirmed = window.confirm(
            'Aboneliğinizi iptal etmek istediğinizden emin misiniz? ' +
            'Mevcut dönem sonuna kadar Pro özelliklerine erişiminiz devam edecek.'
        );
        
        if (!confirmed) return;

        setIsProcessing(true);
        try {
            await firestoreService.cancelSubscription(subscription.id);
            showToast('Abonelik iptal edildi. Dönem sonuna kadar erişiminiz devam edecek.', 'info');
        } catch (error) {
            console.error('Cancel error:', error);
            showToast('Abonelik iptal edilemedi. Lütfen tekrar deneyin.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReactivate = async () => {
        if (!subscription?.id) return;

        setIsProcessing(true);
        try {
            await firestoreService.reactivateSubscription(subscription.id);
            showToast('Abonelik yeniden aktifleştirildi!', 'success');
        } catch (error) {
            console.error('Reactivate error:', error);
            showToast('Abonelik aktifleştirilemedi. Lütfen tekrar deneyin.', 'error');
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
            cancelled: { text: 'İptal Edildi', color: 'bg-yellow-500' },
            expired: { text: 'Süresi Doldu', color: 'bg-red-500' },
            past_due: { text: 'Ödeme Bekliyor', color: 'bg-orange-500' },
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
                        <h3 className="text-4xl font-bold mb-2">Pro Üyelik</h3>
                        <p className="text-xl opacity-90">Tüm özelliklerin kilidini aç</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
                        <div className="flex items-baseline justify-center mb-4">
                            <span className="text-5xl font-bold">349₺</span>
                            <span className="text-xl ml-2 opacity-80">/ay</span>
                        </div>
                        <p className="text-center text-sm opacity-80">
                            İstediğin zaman iptal edebilirsin
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
                            <span className="text-lg">Kullanılmayan krediler birikir</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lg">Kütüphanem - doküman yükleme</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lg">Yazılı Hazırla özelliği</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lg">Gelecekteki tüm Pro özellikler</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSubscribe}
                        disabled={isProcessing}
                        className="w-full bg-white text-purple-600 font-bold py-4 px-6 rounded-xl text-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isProcessing ? 'İşleniyor...' : 'Pro Üyeliği Başlat'}
                    </button>
                </div>
            ) : (
                // Has subscription - Show management
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Pro Üyelik</h3>
                                <p className="opacity-90">Tüm özelliklere erişim</p>
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
                                <p className="text-sm text-gray-600 mb-1">Aylık Ücret</p>
                                <p className="text-xl font-semibold text-gray-800">
                                    {subscription.pricePerPeriod}₺
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-1">Aylık Kredi</p>
                                <p className="text-xl font-semibold text-gray-800">
                                    {subscription.creditsPerPeriod} kredi
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-1">Başlangıç Tarihi</p>
                                <p className="text-lg font-medium text-gray-800">
                                    {formatDate(subscription.currentPeriodStart)}
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-1">
                                    {subscription.cancelAtPeriodEnd ? 'Bitiş Tarihi' : 'Sonraki Ödeme'}
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
                                    <strong>Not:</strong> Aboneliğiniz {formatDate(subscription.currentPeriodEnd)} tarihine kadar devam edecek. 
                                    Bu tarihten sonra Pro özelliklerinize erişiminiz sona erecek.
                                </p>
                            </div>
                        )}

                        {subscription.status === 'past_due' && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-800">
                                    <strong>Uyarı:</strong> Ödeme alınamadı. Lütfen ödeme bilgilerinizi kontrol edin. 
                                    {subscription.failedPaymentAttempts && subscription.failedPaymentAttempts >= 2 && (
                                        <span className="block mt-2">
                                            {3 - subscription.failedPaymentAttempts} deneme hakkınız kaldı.
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
                                    {isProcessing ? 'İşleniyor...' : 'Aboneliği İptal Et'}
                                </button>
                            )}

                            {hasCancelledSub && (
                                <button
                                    onClick={handleReactivate}
                                    disabled={isProcessing}
                                    className="flex-1 bg-green-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? 'İşleniyor...' : 'Yeniden Aktifleştir'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
