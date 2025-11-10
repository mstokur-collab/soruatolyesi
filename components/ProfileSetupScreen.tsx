import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AppContext';
import { updateUserData } from '../services/firestoreService';
import { Button, LoadingSpinner } from './UI';
import { useToast } from '../components/Toast';

const ProfileSetupScreen: React.FC = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [il, setIl] = useState('');
    const [ilce, setIlce] = useState('');
    const [okul, setOkul] = useState('');
    const [sinif, setSinif] = useState<number>(0);
    const [sube, setSube] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isFormValid = il.trim() !== '' && ilce.trim() !== '' && okul.trim() !== '' && sinif > 0 && sube.trim() !== '';

    const handleSave = async () => {
        if (!isFormValid || !currentUser) return;

        setIsLoading(true);
        try {
            // Save profile data with all required fields
            await updateUserData(currentUser.uid, {
                uid: currentUser.uid,
                displayName: currentUser.displayName || 'Kullanıcı',
                photoURL: currentUser.photoURL || '',
                il: il.trim(),
                ilce: ilce.trim(),
                okul: okul.trim(),
                sinif: sinif,
                sube: sube.trim().toUpperCase(),
            });
            showToast('Profil bilgilerin başarıyla kaydedildi!', 'success');
            // Give a small delay to ensure Firebase has propagated the changes
            await new Promise(resolve => setTimeout(resolve, 500));
            // FIX: Replaced full page reload with SPA-friendly navigation.
            // This prevents the app from re-initializing and getting stuck on the loading spinner.
            navigate('/ana-sayfa');
        } catch (error) {
            console.error("Failed to save profile data:", error);
            showToast('Bilgiler kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex justify-center items-center p-4 sm:p-6">
            <div className="selection-container w-full max-w-lg">
                <h1 className="selection-title">Profil Bilgilerini Tamamla</h1>
                <p className="text-center text-slate-300 -mt-6 mb-4">Uygulamanın tüm özelliklerini kullanabilmek için lütfen bilgilerini gir.</p>
                
                <div className="w-full space-y-4 text-left">
                    <div>
                        <label htmlFor="il" className="block text-sm font-medium text-slate-300 mb-1">İl</label>
                        <input 
                            id="il"
                            type="text" 
                            value={il}
                            onChange={(e) => setIl(e.target.value)}
                            className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-lg outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="Örn: Bartın"
                        />
                    </div>
                     <div>
                        <label htmlFor="ilce" className="block text-sm font-medium text-slate-300 mb-1">İlçe</label>
                        <input 
                            id="ilce"
                            type="text" 
                            value={ilce}
                            onChange={(e) => setIlce(e.target.value)}
                            className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-lg outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="Örn: Merkez"
                        />
                    </div>
                     <div>
                        <label htmlFor="okul" className="block text-sm font-medium text-slate-300 mb-1">Okul Adı</label>
                        <input 
                            id="okul"
                            type="text" 
                            value={okul}
                            onChange={(e) => setOkul(e.target.value)}
                            className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-lg outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="Örn: Cumhuriyet Ortaokulu"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label htmlFor="sinif" className="block text-sm font-medium text-slate-300 mb-1">Sınıfın</label>
                            <select
                                id="sinif"
                                value={sinif}
                                onChange={(e) => setSinif(Number(e.target.value))}
                                className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-lg outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                <option value={0} disabled>Sınıfını seç...</option>
                                {[5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                                    <option key={g} value={g}>{g}. Sınıf</option>
                                ))}
                            </select>
                        </div>
                        <div>
                             <label htmlFor="sube" className="block text-sm font-medium text-slate-300 mb-1">Şube</label>
                            <input 
                                id="sube"
                                type="text" 
                                value={sube}
                                onChange={(e) => setSube(e.target.value)}
                                className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-lg outline-none focus:ring-2 focus:ring-violet-500 text-center"
                                placeholder="Örn: A"
                                maxLength={5}
                            />
                        </div>
                    </div>
                </div>

                <Button onClick={handleSave} disabled={!isFormValid || isLoading} variant="primary" className="w-full mt-6 !py-3">
                    {isLoading ? <div className="flex justify-center items-center"><div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-white"></div></div> : 'Kaydet ve Başla'}
                </Button>
            </div>
        </div>
    );
};

export default ProfileSetupScreen;
