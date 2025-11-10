import React, { useState, useMemo } from 'react';
import { useAuth, useData, useGame } from '../../contexts/AppContext';
import type { Question, QuizQuestion, FillInQuestion, MatchingQuestion } from '../../types';
import { Button, Modal } from '../UI';
import { useToast } from '../Toast';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

const QuestionCard: React.FC<{ question: Question; onDelete: (id: string) => void; canDelete: boolean; }> = ({ question, onDelete, canDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const renderDetails = () => {
        switch (question.type) {
            case 'quiz':
                const q = question as QuizQuestion;
                return (
                    <div className="space-y-1 mt-2 text-sm">
                        {q.options.map((opt, i) => (
                            <p key={i} className={opt === q.answer ? 'text-green-300 font-semibold' : 'text-slate-300'}>
                                {String.fromCharCode(65 + i)}) {opt}
                            </p>
                        ))}
                        {q.explanation && <p className="text-xs text-slate-400 pt-2 border-t border-slate-600 mt-2">Açıklama: {q.explanation}</p>}
                    </div>
                );
            case 'fill-in':
                const f = question as FillInQuestion;
                return (
                    <div className="mt-2 text-sm">
                        <p><span className="font-semibold text-green-300">Cevap:</span> {f.answer}</p>
                        <p><span className="font-semibold text-slate-400">Çeldiriciler:</span> {f.distractors.join(', ')}</p>
                    </div>
                );
            case 'matching':
                const m = question as MatchingQuestion;
                return (
                    <ul className="mt-2 text-sm space-y-1">
                        {m.pairs.map((p, i) => <li key={i}>{p.term} - {p.definition}</li>)}
                    </ul>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-slate-800/70 p-4 rounded-lg border border-slate-700">
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                    <p className="font-semibold text-slate-200">{ (question as any).question || (question as any).sentence || "Eşleştirme Sorusu" }</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        <span className="bg-violet-500/20 px-2 py-0.5 rounded-full">{question.grade}. Sınıf</span>
                        <span className="bg-teal-500/20 px-2 py-0.5 rounded-full capitalize">{question.difficulty}</span>
                        <span className="bg-sky-500/20 px-2 py-0.5 rounded-full capitalize">{question.type}</span>
                    </div>
                </div>
                <div className="flex-shrink-0 flex gap-2">
                    <Button onClick={() => setIsExpanded(!isExpanded)} variant="primary" className="!py-1 !px-3 !text-xs">{isExpanded ? 'Gizle' : 'Detay'}</Button>
                    {canDelete && <Button onClick={() => onDelete(question.id)} variant="secondary" className="!py-1 !px-3 !text-xs">Sil</Button>}
                </div>
            </div>
            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-600 animate-fadeIn">
                    {renderDetails()}
                </div>
            )}
        </div>
    );
};

export const QuestionLibrary: React.FC = () => {
    const { currentUser, isAdmin } = useAuth();
    const { globalQuestions, loadGlobalQuestions } = useData();
    const { selectedSubjectId, ogrenmeAlanlari, mergedCurriculum } = useGame();
    const { showToast } = useToast();

    const [gradeFilter, setGradeFilter] = useState<string>('');
    const [topicFilter, setTopicFilter] = useState<string>('');
    const [difficultyFilter, setDifficultyFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

    const availableGrades = useMemo(() => {
        if (!selectedSubjectId || !mergedCurriculum[selectedSubjectId]) return [];
        return Object.keys(mergedCurriculum[selectedSubjectId]).map(Number).sort((a,b) => a-b);
    }, [selectedSubjectId, mergedCurriculum]);

    const filteredQuestions = useMemo(() => {
        return globalQuestions.filter(q =>
            (!gradeFilter || q.grade === parseInt(gradeFilter)) &&
            (!topicFilter || q.topic === topicFilter) &&
            (!difficultyFilter || q.difficulty === difficultyFilter) &&
            (!typeFilter || q.type === typeFilter)
        );
    }, [globalQuestions, gradeFilter, topicFilter, difficultyFilter, typeFilter]);

    const handleDelete = async () => {
        if (!questionToDelete) return;
        try {
            if (!db) throw new Error("Firestore not initialized.");
            await deleteDoc(doc(db, "questions", questionToDelete));
            showToast('Soru başarıyla silindi.', 'success');
            // Refresh list
            loadGlobalQuestions(selectedSubjectId);
        } catch (error) {
            console.error("Error deleting question:", error);
            showToast('Soru silinirken bir hata oluştu.', 'error');
        } finally {
            setQuestionToDelete(null);
        }
    };

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold text-violet-300 mb-4">Soru Bankası ({filteredQuestions.length} / {globalQuestions.length})</h3>
            
            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm">
                    <option value="">Tüm Sınıflar</option>
                    {availableGrades.map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                </select>
                <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm">
                    <option value="">Tüm Öğrenme Alanları</option>
                    {ogrenmeAlanlari.map(oa => <option key={oa.name} value={oa.name}>{oa.name}</option>)}
                </select>
                <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm">
                    <option value="">Tüm Zorluklar</option>
                    <option value="kolay">Kolay</option>
                    <option value="orta">Orta</option>
                    <option value="zor">Zor</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm">
                    <option value="">Tüm Tipler</option>
                    <option value="quiz">Çoktan Seçmeli</option>
                    <option value="fill-in">Boşluk Doldurma</option>
                    <option value="matching">Eşleştirme</option>
                </select>
            </div>

            {/* Question List */}
            <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                {filteredQuestions.length > 0 ? (
                    filteredQuestions.map(q => (
                        <QuestionCard 
                            key={q.id} 
                            question={q} 
                            onDelete={() => setQuestionToDelete(q.id)}
                            canDelete={isAdmin || q.author?.uid === currentUser?.uid}
                        />
                    ))
                ) : (
                    <p className="text-slate-400 text-center pt-10">
                        Bu kriterlere uygun soru bulunamadı veya bu derse ait soru yok.
                    </p>
                )}
            </div>
            
            <Modal 
                isOpen={!!questionToDelete}
                title="Soruyu Sil"
                message="Bu soruyu soru bankasından kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
                onConfirm={handleDelete}
                onCancel={() => setQuestionToDelete(null)}
            />
        </div>
    );
};

