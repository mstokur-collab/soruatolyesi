import React, { useState, useMemo, useEffect } from 'react';
import { Button, LoadingSpinner, Modal } from '../UI';
import { generateQuestionWithAI } from '../../services/geminiService';
import type { Difficulty, QuizQuestion, DocumentLibraryItem, ParagraphQuestionTypeDefinition } from '../../types';
import { paragraphQuestionTypes } from '../../data/paragraphQuestionTypes';
import { useAuth, useData, useGame } from '../../contexts/AppContext';
import { addQuestionsToGlobalPool, deductAiCredits, refundAiCredits, recordQuestionCreation } from '../../services/firestoreService';
import { useToast } from '../Toast';
import { useDropzone } from 'react-dropzone';

const fileToBase64 = (file: File): Promise<{ mimeType: string; data: string }> =>
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

declare const pdfjsLib: any;

// --- Token ve Kredi Hesaplama Sabitleri ---
const CHARS_PER_TOKEN = 4;
const TOKEN_PRICE_INPUT_USD_PER_1M = 0.35;
const TOKEN_PRICE_OUTPUT_USD_PER_1M = 0.70;
const USD_TO_TL_RATE = 33;
const PROFIT_MARGIN_MULTIPLIER = 5;

interface GenerationPayload {
    grade: number;
    kazanımId: string;
    kazanımText: string;
    difficulty: Difficulty;
    questionType: 'quiz' | 'fill-in' | 'matching';
    questionCount: number;
    subjectId: string;
    subjectName: string;
    sourceDocument?: DocumentLibraryItem | null;
    referenceDocument?: DocumentLibraryItem | null;
    topic: string;
    customPrompt?: string;
    promptTextForCosting: string;
}

type GeneratedQuestionPreview = {
    id?: string;
    type?: 'quiz' | 'fill-in' | 'matching';
    question?: string;
    sentence?: string;
    options?: string[];
    answer?: string;
    pairs?: { term: string; definition: string }[];
    [key: string]: any;
};

const extractTextFromBase64Pdf = async (base64Data: string): Promise<string> => {
    try {
        if (typeof window === 'undefined') {
            throw new Error('PDF içeriği yalnızca tarayıcıda çözümlenebilir.');
        }
        const binaryString = window.atob(base64Data);
        const length = binaryString.length;
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        let fullText = '';
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(' ') + ' ';
        }
        return fullText;
    } catch (error) {
        console.error('PDF metni çıkarılırken hata oluştu:', error);
        throw new Error('PDF içeriği okunamadı.');
    }
};

const PARAGRAPH_TOPIC_PLACEHOLDER = 'Paragraf Soru Tipleri';

const difficultyBadgeStyles: Record<
  ParagraphQuestionTypeDefinition['difficulty'],
  { label: string; classes: string }
> = {
  temel: {
    label: 'Temel',
    classes: 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/40',
  },
  orta: {
    label: 'Orta',
    classes: 'bg-amber-500/20 text-amber-100 border border-amber-400/40',
  },
  ileri: {
    label: 'İleri',
    classes: 'bg-rose-500/20 text-rose-100 border border-rose-400/40',
  },
};

const paragraphGradeGuidelines: Record<number, string> = {
  5: '5. sınıf sorularında ana fikir-konu, duygu belirleme, basit çıkarım ve yer-zaman-karakter ilişkisini ölç. Cümleler kısa, net ve öğrencinin yaşam deneyimine yakın olsun.',
  6: '6. sınıfta ana/yardımcı düşünce, sebep-sonuç, paragraf tamamlama ve metin türü farkındalığını yokla. Seçeneklerde benzer ifadeleri kullanarak dikkat gerektiren hatalı seçenekler tasarla.',
  7: '7. sınıfta akışı bozan cümle, doğru/yanlış, yazarın amacı ve düşünceyi geliştirme yollarını içeren daha analitik sorular hazırla. Mantık ilişkileri ve örtük anlam vurgusu yap.',
  8: '8. sınıf (LGS) seviyesinde uzun paragraf, grafik/tablo yorumlama, üst düzey çıkarım ve eleştirel okuma becerilerini ölç. Sorular yeni nesil ve tek paragraftan çoklu bilgi sentezine kadar uzanabilir.',
};

interface ParagraphQuestionTypeShowcaseProps {
  grade: number;
  types: ParagraphQuestionTypeDefinition[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const ParagraphQuestionTypeShowcase: React.FC<ParagraphQuestionTypeShowcaseProps> = ({
  grade,
  types,
  selectedId,
  onSelect,
}) => {
  if (!types.length) {
    return (
      <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl text-sm text-slate-300">
        {grade}. sınıf için paragraf soru tipleri kısa süre içinde eklenecek.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h4 className="text-lg font-semibold text-violet-200">
          Paragraf Soru Tipleri ({grade}. Sınıf)
        </h4>
        <p className="text-xs text-slate-400">
          Ana fikir, yapı, duygu ve sözel mantık kazanımlarını kapsar.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {types.map((type) => {
          const isActive = type.id === selectedId;
          const badge = difficultyBadgeStyles[type.difficulty];
          return (
            <button
              type="button"
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={`text-left rounded-2xl transition border p-4 sm:p-5 ${
                isActive
                  ? 'border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                  : 'border-slate-600/60 bg-slate-800/45 hover:border-slate-400/70'
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {type.tags.join(' • ')}
                    </p>
                    <h5 className="text-lg font-semibold text-slate-50">{type.title}</h5>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.classes}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{type.summary}</p>
                <p className="text-xs text-amber-200">{type.gradeFocus}</p>
                <div>
                  <p className="text-xs font-semibold text-slate-200 mb-1">Odak Noktaları</p>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {type.focusPoints.map((point) => (
                      <li key={`${type.id}-${point.slice(0, 24)}`}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200 mb-1">Örnek Soru Kökleri</p>
                  <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                    {type.questionStems.map((stem) => (
                      <li key={`${type.id}-${stem.slice(0, 24)}`}>{stem}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const QuestionGenerator: React.FC = () => {
    const { userType, currentUser, isDevUser } = useAuth();
    const { aiCredits, displayedCredits, setAiCredits, setGlobalQuestions, loadGlobalQuestions, documentLibrary, userData } = useData();
    const {
        selectedSubjectId,
        ogrenmeAlanlari,
        allSubjects,
        mergedCurriculum,
        settings,
        updateSetting,
        generatorPrefill,
        setGeneratorPrefill,
    } = useGame();
    const { showToast } = useToast();

    const grade = settings.grade || 5;
    const isParagraphSubject = selectedSubjectId === 'paragraph';
    
    // mstokur@hotmail.com için sonsuz kredi kontrolü
    const isUnlimitedUser = currentUser?.email === 'mstokur@hotmail.com';
    const hasProAccess = isDevUser
        || isUnlimitedUser
        || Boolean(userData?.creditPlan === 'pro')
        || Boolean(userData?.entitlements?.examGenerator)
        || Boolean(userData?.adminPermissions?.unlimitedCredits);

    // Form state
    const [ogrenmeAlani, setOgrenmeAlani] = useState('');
    const [kazanımId, setKazanımId] = useState('');
    const [kazanımText, setKazanımText] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('orta');
    const [questionType, setQuestionType] = useState<'quiz' | 'fill-in' | 'matching'>('quiz');
    const [customPrompt, setCustomPrompt] = useState('');
    const [sourceDocId, setSourceDocId] = useState<string>('');
    const [referenceDoc, setReferenceDoc] = useState<DocumentLibraryItem | null>(null);
    const [questionCount, setQuestionCount] = useState(1);
    const [selectedParagraphTypeId, setSelectedParagraphTypeId] = useState('');

    useEffect(() => {
        if (!hasProAccess && referenceDoc) {
            setReferenceDoc(null);
        }
    }, [hasProAccess, referenceDoc]);

    // Logic state
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const [estimatedCredits, setEstimatedCredits] = useState(0);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [generationPayload, setGenerationPayload] = useState<GenerationPayload | null>(null);
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestionPreview[]>([]);
    const paragraphTypesForGrade = useMemo<ParagraphQuestionTypeDefinition[]>(() => {
        if (!isParagraphSubject) return [];
        return paragraphQuestionTypes[grade] || [];
    }, [isParagraphSubject, grade]);

    const availableGrades = useMemo(() => {
        if (selectedSubjectId === 'paragraph') {
            return [5, 6, 7, 8];
        }
        if (!selectedSubjectId || !mergedCurriculum[selectedSubjectId]) return [];
        return Object.keys(mergedCurriculum[selectedSubjectId]).map(Number).sort((a,b) => a-b);
    }, [selectedSubjectId, mergedCurriculum]);

    useEffect(() => {
        if (availableGrades.length > 0 && !availableGrades.includes(grade)) {
            updateSetting('grade', availableGrades[0]);
            return;
        }
        if (isParagraphSubject) {
            if (ogrenmeAlani !== PARAGRAPH_TOPIC_PLACEHOLDER) {
                setOgrenmeAlani(PARAGRAPH_TOPIC_PLACEHOLDER);
            }
            return;
        }
        const hasSelection = ogrenmeAlanlari.some(oa => oa.name === ogrenmeAlani);
        if (!hasSelection) {
            setOgrenmeAlani(ogrenmeAlanlari[0]?.name || '');
        }
    }, [availableGrades, grade, updateSetting, ogrenmeAlanlari, ogrenmeAlani, isParagraphSubject]);
    
    const kazanımlar = useMemo(() => {
        if (isParagraphSubject) {
            return paragraphTypesForGrade.map((type) => ({
                id: type.id,
                text: `${type.title} — ${type.summary}`,
            }));
        }
        if (!ogrenmeAlani) return [];
        const alan = ogrenmeAlanlari.find(oa => oa.name === ogrenmeAlani);
        if (!alan || !Array.isArray(alan.kazanimlar)) return [];
        return alan.kazanimlar.filter(k => k && k.id && k.text);
    }, [isParagraphSubject, paragraphTypesForGrade, ogrenmeAlani, ogrenmeAlanlari]);

    useEffect(() => {
        if (isParagraphSubject) {
            if (!paragraphTypesForGrade.length) {
                if (selectedParagraphTypeId) {
                    setSelectedParagraphTypeId('');
                }
                if (kazanımId) {
                    setKazanımId('');
                }
                if (kazanımText) {
                    setKazanımText('');
                }
                return;
            }
            const activeType =
                paragraphTypesForGrade.find((type) => type.id === selectedParagraphTypeId) ||
                paragraphTypesForGrade[0];
            if (activeType.id !== selectedParagraphTypeId) {
                setSelectedParagraphTypeId(activeType.id);
            }
            const formattedText = `${activeType.title} — ${activeType.summary}`;
            if (kazanımId !== activeType.id) {
                setKazanımId(activeType.id);
            }
            if (kazanımText !== formattedText) {
                setKazanımText(formattedText);
            }
            if (ogrenmeAlani !== PARAGRAPH_TOPIC_PLACEHOLDER) {
                setOgrenmeAlani(PARAGRAPH_TOPIC_PLACEHOLDER);
            }
            return;
        }
        if (selectedParagraphTypeId) {
            setSelectedParagraphTypeId('');
        }
        if (!kazanımlar.length) {
            setKazanımId('');
            setKazanımText('');
            return;
        }
        const hasSelection = kazanımlar.some(k => k.id === kazanımId);
        if (!hasSelection) {
            const firstKazanım = kazanımlar[0];
            setKazanımId(firstKazanım.id);
            setKazanımText(firstKazanım.text);
        }
    }, [
        isParagraphSubject,
        paragraphTypesForGrade,
        selectedParagraphTypeId,
        kazanımId,
        kazanımText,
        ogrenmeAlani,
        kazanımlar,
    ]);

    useEffect(() => {
        if (!generatorPrefill) return;
        if (generatorPrefill.subjectId !== selectedSubjectId) return;

        if (generatorPrefill.grade && generatorPrefill.grade !== grade) {
            updateSetting('grade', generatorPrefill.grade);
            return;
        }

        if (generatorPrefill.topic && generatorPrefill.topic !== ogrenmeAlani) {
            if (ogrenmeAlanlari.some(oa => oa.name === generatorPrefill.topic)) {
                setOgrenmeAlani(generatorPrefill.topic);
            }
            return;
        }

        const targetKazanım = kazanımlar.find(k => k.id === generatorPrefill.kazanimId);
        if (!targetKazanım) {
            return;
        }

        setKazanımId(targetKazanım.id);
        setKazanımText(targetKazanım.text);
        setGeneratorPrefill(null);
    }, [
        generatorPrefill,
        selectedSubjectId,
        grade,
        ogrenmeAlani,
        ogrenmeAlanlari,
        kazanımlar,
        updateSetting,
        setGeneratorPrefill,
    ]);
    
    const handleKazanımChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        setKazanımId(selectedId);
        const selectedKazanım = kazanımlar.find(k => k.id === selectedId);
        setKazanımText(selectedKazanım?.text || '');
        if (isParagraphSubject) {
            setSelectedParagraphTypeId(selectedId);
        }
    };

    const handleParagraphTypeSelect = (typeId: string) => {
        if (!isParagraphSubject) return;
        const target = paragraphTypesForGrade.find((type) => type.id === typeId);
        if (!target) return;
        setSelectedParagraphTypeId(typeId);
        const formattedText = `${target.title} — ${target.summary}`;
        setKazanımId(typeId);
        setKazanımText(formattedText);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: async (acceptedFiles) => {
            if (!hasProAccess) {
                showToast('Referans doküman yükleme yalnızca Pro üyelerde aktiftir.', 'info');
                return;
            }

            const file = acceptedFiles[0];
            if (!file) return;
            try {
                const content = await fileToBase64(file);
                setReferenceDoc({ id: `ref-${Date.now()}`, name: file.name, content, createdAt: '', summary: null });
            } catch (err) {
                showToast('Referans dosyası okunurken hata oluştu.', 'error');
            }
        },
        disabled: !hasProAccess,
        accept: { 'image/*': ['.jpeg', '.png'], 'application/pdf': ['.pdf'] },
        multiple: false,
    });

    const isGuestUser = userType === 'guest' && !isDevUser;
    const subjectName = selectedSubjectId ? allSubjects[selectedSubjectId]?.name || '' : '';
    const canTryToGenerate = Boolean(kazanımId && selectedSubjectId);

    const handleGenerate = async () => {
        if (isGuestUser) {
            setError('Bu özelliği kullanmak için lütfen giriş yapın.');
            return;
        }
        if (!selectedSubjectId || !subjectName) {
            setError('Lütfen önce bir ders seçin.');
            return;
        }
        if (!kazanımId) {
            setError('Lütfen bir kazanım seçin.');
            return;
        }

        setError('');
        setEstimatedCredits(0);
        setLoadingMessage('Maliyet hesaplanıyor...');
        setIsLoading(true);

        try {
            const sourceDoc = documentLibrary.find(doc => doc.id === sourceDocId) || null;
            const activeParagraphType = isParagraphSubject
                ? paragraphTypesForGrade.find(type => type.id === selectedParagraphTypeId) ||
                  paragraphTypesForGrade[0] ||
                  null
                : null;

            let promptText = `Sen ${grade}. sınıf ${subjectName} alanında uzman bir soru yazarısın.`;
            promptText += `\nSınıf: ${grade}`;
            promptText += `\nÖğrenme Alanı: ${ogrenmeAlani}`;
            promptText += `\nKazanım: ${kazanımId} - ${kazanımText}`;
            promptText += `\nZorluk: ${difficulty}`;
            promptText += `\nSoru Tipi: ${questionType}`;
            promptText += `\nÜretilecek Soru Sayısı: ${questionCount}`;

            if (isParagraphSubject) {
                promptText += `\nBu ders Paragraf/Okuduğunu Anlama odaklıdır. Sorular, MEB Türkçe programı ve LGS yeni nesil ölçme mantığına uygun olmalıdır.`;
                const gradeGuideline = paragraphGradeGuidelines[grade];
                if (gradeGuideline) {
                    promptText += `\n[Seviye Odak Talimatı]\n${gradeGuideline}`;
                }
                if (activeParagraphType) {
                    promptText += `\n[Paragraf Soru Tipi Bilgisi]\nSoru Tipi: ${activeParagraphType.title}\nÖzet: ${activeParagraphType.summary}`;
                    if (activeParagraphType.focusPoints?.length) {
                        promptText += `\nÖnemli Odaklar:\n${activeParagraphType.focusPoints
                            .map(point => `- ${point}`)
                            .join('\n')}`;
                    }
                    if (activeParagraphType.questionStems?.length) {
                        promptText += `\nİlham veren soru kökleri (birebir kopyalama, yalnızca yaklaşımı koru):\n${activeParagraphType.questionStems
                            .map(stem => `- ${stem}`)
                            .join('\n')}`;
                    }
                    promptText += `\nParagrafı özgün yaz; seçeneklerde ayırt edici fakat mantıklı dikkat dağıtıcılar üret. Her soru seçilen paragraf tipiyle ilişkili bilişsel beceriyi ölçsün (ör. ana fikir, akışı bozan, sözel mantık, grafik/tablo yorumlama).`;
                }
            }

            if (customPrompt.trim()) {
                promptText += `\nEk Direktif: ${customPrompt.trim()}`;
            }

            if (sourceDoc && sourceDoc.content?.mimeType === 'application/pdf') {
                const pdfText = await extractTextFromBase64Pdf(sourceDoc.content.data);
                promptText += `\n\n[Kaynak PDF İçeriği]\n${pdfText}`;
            }

            if (referenceDoc && referenceDoc.content?.mimeType === 'application/pdf') {
                const pdfText = await extractTextFromBase64Pdf(referenceDoc.content.data);
                promptText += `\n\n[Referans PDF İçeriği]\n${pdfText}`;
            }

            const inputTokens = promptText.length / CHARS_PER_TOKEN;
            const estimatedOutputTokens = questionCount * 500;
            const estimatedCostUSD =
                (inputTokens / 1_000_000) * TOKEN_PRICE_INPUT_USD_PER_1M +
                (estimatedOutputTokens / 1_000_000) * TOKEN_PRICE_OUTPUT_USD_PER_1M;
            const estimatedCostTL = estimatedCostUSD * USD_TO_TL_RATE;
            const creditsWithProfit = estimatedCostTL * PROFIT_MARGIN_MULTIPLIER;
            const credits = Math.max(1, Math.ceil(creditsWithProfit));

            setEstimatedCredits(credits);

            if (!isDevUser && !isUnlimitedUser && userType === 'authenticated' && (displayedCredits ?? 0) < credits) {
                setError(`Yetersiz kredi. Bu işlem için tahmini ${credits} kredi gerekir, mevcut kredi: ${displayedCredits === Infinity ? '∞' : displayedCredits}.`);
                return;
            }

            setGenerationPayload({
                grade,
                kazanımId,
                kazanımText,
                difficulty,
                questionType,
                questionCount,
                subjectId: selectedSubjectId,
                subjectName,
                sourceDocument: sourceDoc,
                referenceDocument: referenceDoc,
                topic: ogrenmeAlani,
                customPrompt: customPrompt.trim() ? customPrompt : undefined,
                promptTextForCosting: promptText,
            });
            setShowConfirmModal(true);
        } catch (err: any) {
            console.error('Maliyet hesaplama hatası:', err);
            setError(err?.message || 'Maliyet hesaplanırken bir hata oluştu.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleConfirmGeneration = async () => {
        if (!generationPayload) return;

        setShowConfirmModal(false);
        setIsLoading(true);
        setLoadingMessage('Sorular üretiliyor...');

        try {
            const {
                grade,
                kazanımId,
                kazanımText,
                difficulty: confirmedDifficulty,
                questionType: confirmedQuestionType,
                questionCount: confirmedQuestionCount,
                subjectId,
                subjectName,
                sourceDocument,
                referenceDocument,
                topic,
                promptTextForCosting,
            } = generationPayload;

            const results = await generateQuestionWithAI(
                grade,
                kazanımId,
                kazanımText,
                confirmedDifficulty,
                confirmedQuestionType,
                confirmedQuestionCount,
                subjectName,
                sourceDocument,
                referenceDocument
            );

            const outputText = JSON.stringify(results);
            const inputTokens = promptTextForCosting.length / CHARS_PER_TOKEN;
            const outputTokens = outputText.length / CHARS_PER_TOKEN;

            const actualCostUSD =
                (inputTokens / 1_000_000) * TOKEN_PRICE_INPUT_USD_PER_1M +
                (outputTokens / 1_000_000) * TOKEN_PRICE_OUTPUT_USD_PER_1M;
            const actualCostTL = actualCostUSD * USD_TO_TL_RATE;
            const actualCreditsDeducted = Math.max(1, Math.ceil(actualCostTL * PROFIT_MARGIN_MULTIPLIER));

            let updatedCredits: number | null = null;
            if (userType === 'authenticated' && !isDevUser && !isUnlimitedUser) {
                if (!currentUser?.uid) {
                    throw new Error('Kullanıcı kimliği doğrulanamadı.');
                }

                const deductionMetadata = {
                    subjectId,
                    questionType: confirmedQuestionType,
                    questionCount: confirmedQuestionCount,
                    estimatedCredits,
                    actualCredits: actualCreditsDeducted,
                    sourceDocumentId: sourceDocument?.id ?? null,
                    referenceDocumentId: referenceDocument?.id ?? null,
                };

                deductionDetails = {
                    amount: actualCreditsDeducted,
                    metadata: deductionMetadata,
                };

                updatedCredits = await deductAiCredits({
                    uid: currentUser.uid,
                    amount: actualCreditsDeducted,
                    reason: 'ai-question-generation',
                    metadata: deductionMetadata
                });
            }

            const newQuestions = results
                .filter((result) => result != null && typeof result === 'object')
                .map(
                    (result, index) =>
                        ({
                            ...result,
                            id: isDevUser ? `dev-${Date.now()}-${index}` : undefined,
                            type: confirmedQuestionType,
                            grade,
                            topic,
                            difficulty: confirmedDifficulty,
                            kazanımId,
                            subjectId,
                            author: { uid: currentUser?.uid, name: currentUser?.displayName },
                        } as QuizQuestion)
                );

            if (isDevUser) {
                setGlobalQuestions((prev) => [...newQuestions, ...prev]);
            } else {
                await addQuestionsToGlobalPool(newQuestions);
                if (currentUser?.uid) {
                    try {
                        await recordQuestionCreation(currentUser.uid, newQuestions.length);
                    } catch (statsError) {
                        console.warn('recordQuestionCreation failed:', statsError);
                    }
                }
            }

            if (updatedCredits !== null) {
                setAiCredits(updatedCredits);
            }

            const pendingPreviews = results
                .filter((q) => q != null && typeof q === 'object')
                .map((q, idx) => ({
                    ...q,
                    id: (q as any)?.id ?? `preview-${Date.now()}-${idx}`,
                }));
            setGeneratedQuestions(isDevUser ? pendingPreviews : []);

            const successMessage =
                updatedCredits !== null
                    ? `İşlem tamamlandı. Hesabınızdan ${actualCreditsDeducted} kredi düşüldü. Kalan: ${updatedCredits}.`
                    : 'Sorular havuza kaydedildi. Onaylanana kadar oyunculara gösterilmeyecek.';
            showToast(successMessage, 'success');
        } catch (err: any) {
            const message = err?.message || 'Soru üretilirken bir hata oluştu.';
            setError(message);
            showToast(message, 'error');

            if (
                deductionDetails &&
                currentUser?.uid &&
                userType === 'authenticated' &&
                !isDevUser &&
                !isUnlimitedUser
            ) {
                try {
                    const refundedCredits = await refundAiCredits({
                        uid: currentUser.uid,
                        amount: deductionDetails.amount,
                        reason: 'ai-question-generation-refund',
                        metadata: {
                            ...deductionDetails.metadata,
                            refundReason: message,
                        },
                    });
                    setAiCredits(refundedCredits);
                    showToast(`Hata nedeniyle ${deductionDetails.amount} kredi hesabınıza iade edildi.`, 'info');
                } catch (refundError: any) {
                    console.error('Kredi iadesi sırasında hata oluştu:', refundError);
                    showToast(
                        'İşlem başarısız oldu ve kredi iadesi tamamlanamadı. Lütfen destek ile iletişime geçin.',
                        'error'
                    );
                }
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
            setGenerationPayload(null);
            setEstimatedCredits(0);
        }
    };

    const baseButtonLabel = `AI ile ${questionCount} Soru Üret`;
    const unlimitedLabel = displayedCredits === Infinity ? `${baseButtonLabel} (∞)` : baseButtonLabel;
    const buttonLabel = (displayedCredits !== Infinity && estimatedCredits > 0)
        ? `${unlimitedLabel} (~${estimatedCredits} kredi)`
        : unlimitedLabel;

    const confirmationMessage = (
        <div className="text-center space-y-2">
            <p className="text-slate-200">{`Bu işlem için tahmini ${estimatedCredits} kredi kullanılacak.`}</p>
            <p className="text-xs text-slate-400">
                Bu tutar uzun metin senaryosuna göre hesaplanan <strong>maksimum</strong> değeridir. Üretim tamamlandığında gerçek maliyet
                çıkış metnine göre hesaplanır ve sadece kullanılan kredi düşülür.
            </p>
            <p className="text-slate-200 mt-2">Devam etmek istiyor musunuz?</p>
        </div>
    );

    if (userType === 'guest' && !isDevUser) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-yellow-300">Bu Özellik İçin Giriş Yapın</h3>
                <p className="mt-2 text-slate-400">Giriş yaparak AI Soru Üreteci'ni kullanabilir ve kendi soru bankanızı oluşturabilirsiniz.</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold text-violet-300 mb-4">✨ AI Soru Üreteci</h3>
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select value={grade} onChange={e => updateSetting('grade', parseInt(e.target.value))} className="p-2 bg-slate-700 rounded-md border border-slate-600">
                         {availableGrades.map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                    </select>
                    {!isParagraphSubject && (
                        <select value={ogrenmeAlani} onChange={e => setOgrenmeAlani(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600">
                            <option value="">Öğrenme Alanı Seçin</option>
                            {ogrenmeAlanlari.map(oa => <option key={oa.name} value={oa.name}>{oa.name}</option>)}
                        </select>
                    )}
                </div>
                {isParagraphSubject ? (
                    <ParagraphQuestionTypeShowcase
                        grade={grade}
                        types={paragraphTypesForGrade}
                        selectedId={selectedParagraphTypeId}
                        onSelect={handleParagraphTypeSelect}
                    />
                ) : (
                    <select value={kazanımId} onChange={handleKazanımChange} disabled={!ogrenmeAlani} className="p-2 bg-slate-700 rounded-md border border-slate-600 w-full disabled:opacity-50 text-sm">
                        <option value="">Kazanım Seçin</option>
                        {kazanımlar.filter(k => k && k.id && k.text).map(k => <option key={k.id} value={k.id}>{k.id} - {k.text}</option>)}
                    </select>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className="p-2 bg-slate-700 rounded-md border border-slate-600">
                        <option value="kolay">Kolay</option>
                        <option value="orta">Orta</option>
                        <option value="zor">Zor</option>
                    </select>
                    <select value={questionType} onChange={e => setQuestionType(e.target.value as any)} className="p-2 bg-slate-700 rounded-md border border-slate-600">
                        <option value="quiz">Çoktan Seçmeli</option>
                        <option value="fill-in">Boşluk Doldurma</option>
                        <option value="matching">Eşleştirme</option>
                    </select>
                    <select value={questionCount} onChange={e => setQuestionCount(parseInt(e.target.value))} className="p-2 bg-slate-700 rounded-md border border-slate-600">
                        <option value={1}>1 Soru</option>
                        <option value={2}>2 Soru</option>
                        <option value={3}>3 Soru</option>
                        <option value={4}>4 Soru</option>
                        <option value={5}>5 Soru</option>
                    </select>
                </div>
                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Ekstra direktifler veya özel senaryo (isteğe bağlı)..." className="w-full h-24 p-2 bg-slate-700 rounded-md border border-slate-600 text-sm resize-y" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select value={sourceDocId} onChange={e => setSourceDocId(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm">
                        <option value="">Kaynak Doküman Seç (İsteğe Bağlı)</option>
                        {documentLibrary.map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
                    </select>
                    <div
                        {...getRootProps()}
                        aria-disabled={!hasProAccess}
                        className={`p-2 border-2 border-dashed rounded-md flex items-center justify-center text-center text-sm transition-colors ${isDragActive ? 'border-violet-400 bg-violet-900/50' : 'border-slate-600 hover:border-violet-500'} ${hasProAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-60 border-slate-700 bg-slate-900/40 hover:border-slate-700'}`}
                    >
                        <input {...getInputProps()} />
                        {referenceDoc ? (
                            <p className="text-green-300">{referenceDoc.name}</p>
                        ) : (
                            <p className="text-slate-300">
                                {hasProAccess ? 'Referans Doküman Sürükle' : 'Referans doküman yükleme Pro üyelerle sınırlıdır.'}
                            </p>
                        )}
                    </div>
                    {!hasProAccess && (
                        <p className="mt-2 text-xs text-amber-300 text-center">
                            Referans doküman yükleme sadece Pro paket sahiplerine açıktır.
                        </p>
                    )}
                </div>

            </div>
        {isLoading && (
            <div className="flex flex-col items-center gap-2 py-4">
                <LoadingSpinner />
                {loadingMessage && <p className="text-sm text-slate-300">{loadingMessage}</p>}
            </div>
        )}
        {error && <p className="text-red-400 text-sm text-center my-2">{error}</p>}
        <div className="flex-shrink-0 pt-4">
             <Button
                onClick={handleGenerate}
                disabled={isLoading || !canTryToGenerate || isGuestUser}
                title={
                    isGuestUser
                        ? 'Bu özelliği kullanmak için giriş yapmalısınız.'
                        : !canTryToGenerate
                            ? 'Lütfen gerekli alanları doldurun.'
                            : ''
                }
                variant="primary"
                className="w-full !py-3 !text-lg"
            >
                {buttonLabel}
            </Button>
        </div>
        {generatedQuestions.length > 0 && (
            <div className="mt-6 space-y-3 max-h-64 overflow-y-auto pr-1">
                <h4 className="text-lg font-semibold text-teal-200">Üretilen Sorular</h4>
                {generatedQuestions
                    .filter(q => q != null && typeof q === 'object' && (q.question || q.sentence || q.pairs))
                    .map((question, index) => (
                    <div
                        key={question.id || `generated-${index}`}
                        className="bg-slate-800/40 border border-slate-600/40 rounded-lg p-3 text-sm space-y-2"
                    >
                        <p className="font-semibold text-slate-100">Soru {index + 1}</p>
                        {((question as any).question || (question as any).sentence) && (
                            <p className="text-slate-200">{(question as any).question || (question as any).sentence}</p>
                        )}
                        {question.type === 'quiz' && Array.isArray((question as any).options) && (
                            <ul className="list-disc list-inside text-slate-300">
                                {(question as any).options.map((option: string, optIdx: number) => (
                                    <li key={optIdx}>{option}</li>
                                ))}
                            </ul>
                        )}
                        {question.type === 'matching' && Array.isArray((question as any).pairs) && (
                            <div className="space-y-1 text-slate-300">
                                {(question as any).pairs.map(
                                    (pair: { term: string; definition: string }, pairIdx: number) => (
                                        <p key={pairIdx}>
                                            <span className="font-semibold">{pair.term}:</span> {pair.definition}
                                        </p>
                                    )
                                )}
                            </div>
                        )}
                        {(question as any).answer && (
                            <p className="text-emerald-300">
                                <span className="font-semibold">Cevap:</span> {(question as any).answer}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        )}
        <Modal
            isOpen={showConfirmModal}
            title="Üretimi Onayla"
            message={confirmationMessage}
            onConfirm={handleConfirmGeneration}
            onCancel={() => {
                setShowConfirmModal(false);
                setGenerationPayload(null);
            }}
        />
    </div>
    );
};
