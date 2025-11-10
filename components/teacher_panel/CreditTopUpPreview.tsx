import React, { useEffect, useRef } from 'react';
import { Button } from '../UI';
import { useAuth, useData } from '../../contexts/AppContext';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);

const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Bekleniyor';
    if (typeof timestamp.toDate === 'function') {
        return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(timestamp.toDate());
    }
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp));
};

export const CreditTopUpPreview: React.FC = () => {
    const { userType } = useAuth();
    const {
        creditPackages,
        creditTransactions,
        loadCreditTransactions,
        isCreditHistoryLoading,
        hasMoreCreditTransactions,
    } = useData();

    const hasRequestedHistory = useRef(false);

    useEffect(() => {
        if (userType === 'authenticated' && !hasRequestedHistory.current) {
            hasRequestedHistory.current = true;
            loadCreditTransactions({ refresh: true, limit: 5 }).catch((error) =>
                console.error('Credit history preload failed:', error)
            );
        }
        if (userType !== 'authenticated') {
            hasRequestedHistory.current = false;
        }
    }, [userType, loadCreditTransactions]);

    if (userType !== 'authenticated') {
        return null;
    }

    const displayedTransactions = creditTransactions.slice(0, 5);

    return (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-emerald-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <p className="text-xs uppercase tracking-widest text-emerald-300 mb-1">Yakında</p>
                    <h3 className="text-xl font-bold text-emerald-200">Kredi Yükleme Altyapısı</h3>
                    <p className="text-sm text-slate-300">
                        Kartla kredi yükleme devreye girdiğinde bu paketler ve geçmiş ekranı aktif olacak.
                    </p>
                </div>
                <span className="text-xs text-emerald-200 bg-emerald-500/20 px-3 py-1 rounded-full self-start sm:self-auto">
                    Hazırlık aşamasında
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {creditPackages.map((pack) => (
                    <div
                        key={pack.id}
                        className="bg-slate-900/40 border border-slate-700 rounded-lg p-4 flex flex-col gap-3"
                    >
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-white">{pack.name}</h4>
                            {pack.badge && (
                                <span className="text-xs uppercase tracking-widest text-amber-300">
                                    {pack.badge === 'popular'
                                        ? 'Popüler'
                                        : pack.badge === 'best-value'
                                            ? 'En İyi Değer'
                                            : 'Yeni'}
                                </span>
                            )}
                        </div>
                        <p className="text-3xl font-bold text-emerald-300">{pack.credits} kredi</p>
                        <p className="text-slate-300">{pack.description}</p>
                        <p className="text-sm text-slate-400">{formatCurrency(pack.priceTRY)}</p>
                        <Button disabled variant="secondary" className="w-full !py-2">
                            Kart ile Satın Al (Yakında)
                        </Button>
                    </div>
                ))}
            </div>

            <div className="mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <h4 className="text-lg font-semibold text-emerald-200">Kredi İşlem Geçmişi</h4>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            className="!py-1.5 !text-sm"
                            disabled={isCreditHistoryLoading}
                            onClick={() => loadCreditTransactions({ refresh: true, limit: 5 })}
                        >
                            Yenile
                        </Button>
                        <Button
                            variant="ghost"
                            className="!py-1.5 !text-sm"
                            disabled={isCreditHistoryLoading || !hasMoreCreditTransactions}
                            onClick={() => loadCreditTransactions({ limit: 5 })}
                        >
                            Daha Fazla
                        </Button>
                    </div>
                </div>

                {displayedTransactions.length === 0 ? (
                    <p className="text-sm text-slate-400">
                        Henüz işlem bulunmuyor. Kartla yükleme yayına alındığında burada kayıtları göreceksiniz.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {displayedTransactions.map((tx) => (
                            <li
                                key={tx.id}
                                className="flex items-center justify-between bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                            >
                                <div>
                                    <p className="text-white font-medium">{tx.type}</p>
                                    <p className="text-xs text-slate-400">{formatTimestamp(tx.createdAt)}</p>
                                </div>
                                <div className={`text-base font-semibold ${tx.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                    {tx.amount >= 0 ? '+' : ''}
                                    {tx.amount}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {isCreditHistoryLoading && (
                    <p className="text-xs text-slate-400 mt-2">İşlem geçmişi yükleniyor...</p>
                )}
            </div>
        </div>
    );
};
