import React, { useState, useCallback, useRef } from 'react';

import { useDropzone } from 'react-dropzone';

import { Button, Modal, LoadingSpinner, InfoModal } from '../UI';

import { useAuth, useData, useGame } from '../../contexts/AppContext';

import { useToast } from '../Toast';

import type { DocumentLibraryItem, QuizQuestion } from '../../types';

import { analyzePdfContent, extractQuestionFromImage } from '../../services/geminiService';


import safeStringify from '../../utils/safeStringify';



// pdf.js'nin global olarak yüklendiğini varsayıyoruz.

declare const pdfjsLib: any;



// --- Token ve Kredi Hesaplama Sabitleri ---

const CHARS_PER_TOKEN = 4;

// gemini-flash-latest için yaklaşık fiyatlandırma

const TOKEN_PRICE_INPUT_USD_PER_1M = 0.35; 

const TOKEN_PRICE_OUTPUT_USD_PER_1M = 0.70;

const USD_TO_TL_RATE = 33; // Yaklaşık kur

const PROFIT_MARGIN_MULTIPLIER = 5; // Kâr marjı çarpanı



interface DocToAnalyze {

    file: File;

    textContent: string;

}



const fileToContent = (file: File): Promise<{ mimeType: string; data: string; textContent?: string }> =>

  new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = () => {

        const result = reader.result as string;

        resolve({

            mimeType: file.type,

            data: result.split(',')[1]

        });

    };

    reader.onerror = error => reject(error);

  });



const extractTextFromPdf = (file: File): Promise<string> =>

  new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = async (event: any) => {

      try {

        const typedarray = new Uint8Array(event.target.result);

        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {

          const page = await pdf.getPage(i);

          const textContent = await page.getTextContent();

          fullText += textContent.items.map((item: any) => item.str).join(' ');

        }

        resolve(fullText);

      } catch (error) {

        reject(new Error('PDF metni çıkarılırken bir hata oluştu.'));

      }

    };

    reader.onerror = () => reject(new Error('Dosya okunamadı.'));

    reader.readAsArrayBuffer(file);

  });





export const DocumentManager: React.FC = () => {

    const { userType, isDevUser, currentUser } = useAuth();

    const { documentLibrary, setDocumentLibrary, setGlobalQuestions, aiCredits, setAiCredits } = useData();

    const { selectedSubjectId } = useGame();

    const { showToast } = useToast();



    const [isLoading, setIsLoading] = useState(false);

    const [loadingMessage, setLoadingMessage] = useState('');

    const [error, setError] = useState('');

    const [docToDelete, setDocToDelete] = useState<string | null>(null);

    const [viewingTopicsDoc, setViewingTopicsDoc] = useState<DocumentLibraryItem | null>(null);

    const importLibraryInputRef = useRef<HTMLInputElement>(null);



    // Yeni state'ler

    const [docToAnalyze, setDocToAnalyze] = useState<DocToAnalyze | null>(null);

    const [estimatedCredits, setEstimatedCredits] = useState(0);

    const [showConfirmModal, setShowConfirmModal] = useState(false);





    const onDrop = useCallback(async (acceptedFiles: File[]) => {

        const file = acceptedFiles[0];

        if (!file) return;



        // Token limit kontrolü

        const MAX_TOKENS = 990000;

        if (file.type === 'application/pdf') {

             try {

                const textContent = await extractTextFromPdf(file);

                const estimatedTokens = textContent.length / CHARS_PER_TOKEN;

                if (estimatedTokens > MAX_TOKENS) {

                    setError(`Hata: Dosya çok büyük (yaklaşık ${Math.round(estimatedTokens / 1000)}k token) ve tek seferde analiz edilemez. Lütfen ${Math.round(MAX_TOKENS / 1000)}k token'dan (~1000 sayfa) daha küçük bir dosya yükleyin.`);

                    return;

                }

            } catch (err) {

                 setError("PDF içeriği okunurken bir hata oluştu. Dosya bozuk olabilir.");

                 return;

            }

        }



        const isImage = file.type.startsWith('image/');

        const isPdf = file.type === 'application/pdf';

        const maxSize = isPdf ? 40 * 1024 * 1024 : 4 * 1024 * 1024;



        if (file.size > maxSize) {

            setError(`Dosya boyutu çok büyük. ${isPdf ? 'PDF için maksimum 40MB' : 'Resim için maksimum 4MB'}.`);

            return;

        }



        setIsLoading(true);

        setError('');



        try {

            if (isImage) {

                setLoadingMessage('Resimden soru çıkarılıyor...');

                const content = await fileToContent(file);

                const extractedQuestions = await extractQuestionFromImage(content);

                if (extractedQuestions.length === 0) {

                    showToast('Resimde analiz edilecek bir soru bulunamadı.', 'info');

                } else {

                    const newQuestions = extractedQuestions.map((q, i) => ({

                        ...q,

                        id: isDevUser ? `dev-${Date.now()}-${i}` : undefined,

                        grade: 5, topic: 'Görselden Aktarılan', type: 'quiz', kazanımId: 'N/A',

                        subjectId: selectedSubjectId,

                        author: { uid: currentUser?.uid, name: currentUser?.displayName }

                    } as QuizQuestion));

                    

                    setGlobalQuestions(prev => [...newQuestions, ...prev]);

                    showToast(`${newQuestions.length} soru başarıyla Soru Bankası'na eklendi!`, 'success');

                }

            } else if (isPdf) {

                setLoadingMessage('Dosya okunuyor, maliyet hesaplanıyor...');

                const textContent = await extractTextFromPdf(file);

                

                const inputTokens = textContent.length / CHARS_PER_TOKEN;

                const estimatedOutputTokens = 500; // Summary için ortalama bir tahmin

                const estimatedCostUSD = (inputTokens / 1_000_000 * TOKEN_PRICE_INPUT_USD_PER_1M) + (estimatedOutputTokens / 1_000_000 * TOKEN_PRICE_OUTPUT_USD_PER_1M);

                const estimatedCostTL = estimatedCostUSD * USD_TO_TL_RATE;

                const creditsWithProfit = estimatedCostTL * PROFIT_MARGIN_MULTIPLIER;

                const credits = Math.max(1, Math.ceil(creditsWithProfit));

                

                setDocToAnalyze({ file, textContent });

                setEstimatedCredits(credits);

                setShowConfirmModal(true);

            } else {

                throw new Error('Desteklenmeyen dosya türü. Lütfen resim (JPG, PNG) veya PDF yükleyin.');

            }



        } catch (err: any) {

            setError(err.message || 'Dosya işlenirken bir hata oluştu.');

            showToast(err.message || 'Dosya işlenirken bir hata oluştu.', 'error');

        } finally {

            setIsLoading(false);

        }

    }, [isDevUser, selectedSubjectId, currentUser, setGlobalQuestions, showToast]);



    const handleConfirmAnalysis = async () => {

        if (!docToAnalyze) return;

        

        setShowConfirmModal(false);

        setIsLoading(true);

        setLoadingMessage('PDF analiz ediliyor ve kütüphaneye ekleniyor...');



        try {

            const { file, textContent: inputText } = docToAnalyze;

            const content = await fileToContent(file);

            const summary = await analyzePdfContent(content);

            const outputText = safeStringify(summary);



            // Gerçek maliyeti hesapla

            const inputTokens = inputText.length / CHARS_PER_TOKEN;

            const outputTokens = outputText.length / CHARS_PER_TOKEN;

            const actualCostUSD = (inputTokens / 1_000_000 * TOKEN_PRICE_INPUT_USD_PER_1M) + (outputTokens / 1_000_000 * TOKEN_PRICE_OUTPUT_USD_PER_1M);

            const actualCostTL = actualCostUSD * USD_TO_TL_RATE;

            const actualCreditsDeducted = Math.max(1, Math.ceil(actualCostTL * PROFIT_MARGIN_MULTIPLIER));



            // Krediyi düş (geliştirici değilse)

            if (userType === 'authenticated' && !isDevUser) {

                setAiCredits(prev => Math.max(0, (prev || 0) - actualCreditsDeducted));

            }



            // Kütüphaneye ekle

            const newDoc: DocumentLibraryItem = {

                id: `doc-${Date.now()}`, name: file.name, content,

                createdAt: new Date().toISOString(), summary,

            };

            setDocumentLibrary(prev => [newDoc, ...prev]);

            

            showToast(`Analiz tamamlandı. Hesabınızdan ${actualCreditsDeducted} kredi düşüldü.`, 'success');



        } catch(err: any) {

            setError(err.message);

            showToast(err.message, 'error');

        } finally {

            setIsLoading(false);

            setDocToAnalyze(null);

            setEstimatedCredits(0);

        }

    };





    const { getRootProps, getInputProps, isDragActive } = useDropzone({

        onDrop,

        accept: { 'image/jpeg': [], 'image/png': [], 'application/pdf': [] },

        multiple: false

    });



    const handleDelete = () => {

        if (!docToDelete) return;

        setDocumentLibrary(prev => prev.filter(doc => doc.id !== docToDelete));
        showToast('Doküman silindi.', 'success');
        setDocToDelete(null);

    };

    

    const exportLibrary = () => {

        const dataStr = safeStringify(documentLibrary, { space: 2 });

        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = 'kaynak-kutuphanem.json';

        

        const linkElement = document.createElement('a');

        linkElement.setAttribute('href', dataUri);

        linkElement.setAttribute('download', exportFileDefaultName);

        linkElement.click();

        linkElement.remove();

        showToast('Kütüphane dışa aktarıldı!', 'success');

    };



    const handleImportClick = () => {

        importLibraryInputRef.current?.click();

    };



    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {

        const file = event.target.files?.[0];

        if (!file) return;



        const reader = new FileReader();

        reader.onload = (e) => {

            try {

                const text = e.target?.result;

                if (typeof text !== 'string') throw new Error("Dosya okunamadı");

                const importedLibrary = JSON.parse(text);

                if (Array.isArray(importedLibrary)) {

                    setDocumentLibrary(importedLibrary);

                    showToast('Kütüphane başarıyla içe aktarıldı!', 'success');

                } else {

                    throw new Error("Geçersiz dosya formatı.");

                }

            } catch (err) {

                showToast("Kütüphane içe aktarılırken hata oluştu: " + (err as Error).message, 'error');

            }

        };

        reader.readAsText(file);

        if (event.target) event.target.value = '';

    };



    const confirmationMessage = (

        <div className="text-center">

            <p className="text-slate-200 mb-2">{`Bu işlem için tahmini ${estimatedCredits} kredi kullanılacak.`}</p>

            <p className="text-xs text-slate-400">

                Bu, belgenin tam metnine göre hesaplanmış <strong>maksimum</strong> tutardır. Gerçek maliyet, yapay zeka çıktısının boyutuna göre belirlenir ve genellikle daha düşüktür. Sadece kullanılan kredi düşülecektir.

            </p>

            <p className="text-slate-200 mt-4">Devam etmek istiyor musunuz?</p>

        </div>

    );



    if (userType === 'guest' && !isDevUser) {

        return (

            <div className="p-6 text-center">

                <h3 className="text-xl font-bold text-yellow-300">Bu Özellik İçin Giriş Yapın</h3>

                <p className="mt-2 text-slate-400">Giriş yaparak kendi doküman kütüphanenizi oluşturabilirsiniz.</p>

            </div>

        );

    }



    return (

        <div className="p-4 sm:p-6 h-full flex flex-col">

            <h3 className="text-xl font-bold text-violet-300 mb-4">Kütüphanem</h3>

            

            <div 

                {...getRootProps()} 

                className={`flex flex-col justify-center items-center h-48 bg-slate-800/50 rounded-xl border-2 border-dashed transition-colors duration-300 cursor-pointer 

                ${isDragActive ? 'border-violet-500 bg-violet-900/50' : 'border-violet-500/30 hover:border-violet-400'}`}

            >

                <input {...getInputProps()} />

                {isLoading ? (

                    <>

                        <LoadingSpinner />

                        <p className="mt-2 text-violet-300">{loadingMessage}</p>

                    </>

                ) : isDragActive ? (

                    <p className="text-violet-300 font-semibold">Dosyayı Buraya Bırak</p>

                ) : (

                    <div className="text-center">

                        <p className="font-semibold text-slate-300">Dosyaları buraya sürükleyin veya tıklayıp seçin</p>

                        <p className="text-xs text-slate-400 mt-1">Desteklenen formatlar: PDF (max 40MB), JPG, PNG (max 4MB)</p>

                    </div>

                )}

            </div>

             {error && <p className="text-red-400 text-center text-sm mt-2">{error}</p>}



            <div className="flex-grow overflow-y-auto space-y-3 pr-2 mt-6">

                <div className="flex justify-between items-center mb-2">

                    <h4 className="text-lg font-semibold text-slate-300">Kaydedilmiş Dokümanlar ({documentLibrary.length})</h4>

                    <div className="flex gap-2">

                        <Button onClick={handleImportClick} variant="success" className="!text-xs !py-1 !px-3">İçe Aktar</Button>

                        <Button onClick={exportLibrary} variant="primary" className="!text-xs !py-1 !px-3" disabled={documentLibrary.length === 0}>Dışa Aktar</Button>

                        <input type="file" accept=".json" ref={importLibraryInputRef} onChange={handleImportFile} className="hidden" />

                    </div>

                </div>

                {documentLibrary.length > 0 ? (

                    documentLibrary.map(doc => (

                        <div key={doc.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">

                            <div className="flex-1 pr-4">

                                <p className="font-semibold text-slate-200">{doc.name}</p>

                                <p className="text-xs text-slate-400">

                                    {doc.summary ? `${doc.summary.topics.length} konu başlığı çıkarıldı` : 'Analiz edilmedi'} - {new Date(doc.createdAt).toLocaleDateString()}

                                </p>

                            </div>

                            <div className="flex gap-2">

                               {doc.summary && <Button onClick={() => setViewingTopicsDoc(doc)} variant="success" className="!text-xs !py-1 !px-3">Konuları Gör</Button>}

                               <Button onClick={() => setDocToDelete(doc.id)} variant="secondary" className="!text-xs !py-1 !px-3">Sil</Button>

                            </div>

                        </div>

                    ))

                ) : (

                    <p className="text-slate-400 text-center pt-10">

                        Henüz kütüphanenizde doküman yok.

                    </p>

                )}

            </div>



             <Modal 

                isOpen={showConfirmModal}

                title="Analizi Onayla"

                message={confirmationMessage}

                onConfirm={handleConfirmAnalysis}

                onCancel={() => { setShowConfirmModal(false); setDocToAnalyze(null); setEstimatedCredits(0); }}

            />

             <Modal 

                isOpen={!!docToDelete}

                title="Dokümanı Sil"

                message="Bu dokümanı kütüphaneden kalıcı olarak silmek istediğinizden emin misiniz?"

                onConfirm={handleDelete}

                onCancel={() => setDocToDelete(null)}

            />

             <InfoModal

                isOpen={!!viewingTopicsDoc}

                title={viewingTopicsDoc?.summary?.title || "Konu Başlıkları"}

                onClose={() => setViewingTopicsDoc(null)}

            >

                {viewingTopicsDoc?.summary?.topics && viewingTopicsDoc.summary.topics.length > 0 ? (

                    <ul>

                        {viewingTopicsDoc.summary.topics.map((topic, index) => <li key={index}>{topic}</li>)}

                    </ul>

                ) : (

                    <p>Bu dokümandan konu başlığı çıkarılamadı.</p>

                )}

             </InfoModal>

        </div>

    );

};



