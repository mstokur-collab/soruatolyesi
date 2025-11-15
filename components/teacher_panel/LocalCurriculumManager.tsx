import React, { useEffect, useMemo, useState } from 'react';

import { Button } from '../UI';
import { useAuth, useGame } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import type { LocalCurriculumState, OgrenmeAlani } from '../../types';
import { inferSubjectName, normalizeSubjectId, sanitizeLocalCurriculumState } from '../../utils/curriculum';

const buildClone = (state: LocalCurriculumState): LocalCurriculumState => sanitizeLocalCurriculumState(state);

const LocalCurriculumManager: React.FC = () => {
    const { userType } = useAuth();
    const {
        allSubjects,
        mergedCurriculum,
        localCurriculum,
        localSubjectNames,
        updateLocalCurriculum,
    } = useGame();
    const { showToast } = useToast();

    const subjectOptions = useMemo(() => Object.keys(allSubjects).sort(), [allSubjects]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectOptions[0] ?? '');

    useEffect(() => {
        if (!subjectOptions.length) {
            setSelectedSubjectId('');
            return;
        }
        if (!selectedSubjectId || !allSubjects[selectedSubjectId]) {
            setSelectedSubjectId(subjectOptions[0]);
        }
    }, [subjectOptions, selectedSubjectId, allSubjects]);

    const gradeOptions = useMemo(() => {
        if (!selectedSubjectId) return [];
        const gradeSet = new Set<number>();
        const subjectFromMerged = mergedCurriculum[selectedSubjectId] || {};
        Object.keys(subjectFromMerged).forEach((gradeKey) => {
            const gradeValue = Number(gradeKey);
            if (!Number.isNaN(gradeValue)) {
                gradeSet.add(gradeValue);
            }
        });
        const subjectLocal = localCurriculum[selectedSubjectId] || {};
        Object.keys(subjectLocal).forEach((gradeKey) => {
            const gradeValue = Number(gradeKey);
            if (!Number.isNaN(gradeValue)) {
                gradeSet.add(gradeValue);
            }
        });
        return Array.from(gradeSet).sort((a, b) => a - b);
    }, [selectedSubjectId, mergedCurriculum, localCurriculum]);

    const [selectedGrade, setSelectedGrade] = useState<number | null>(gradeOptions[0] ?? null);
    useEffect(() => {
        if (!gradeOptions.length) {
            setSelectedGrade(null);
            return;
        }
        if (!selectedGrade || !gradeOptions.includes(selectedGrade)) {
            setSelectedGrade(gradeOptions[0]);
        }
    }, [gradeOptions, selectedGrade]);

    const localAreas: OgrenmeAlani[] = useMemo(() => {
        if (!selectedSubjectId || selectedGrade === null) return [];
        return localCurriculum[selectedSubjectId]?.[selectedGrade] || [];
    }, [localCurriculum, selectedSubjectId, selectedGrade]);

    const [selectedAreaName, setSelectedAreaName] = useState<string>(localAreas[0]?.name ?? '');
    useEffect(() => {
        if (!localAreas.length) {
            setSelectedAreaName('');
            return;
        }
        if (!selectedAreaName || !localAreas.some((area) => area.name === selectedAreaName)) {
            setSelectedAreaName(localAreas[0].name);
        }
    }, [localAreas, selectedAreaName]);

    const [newSubjectSlug, setNewSubjectSlug] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newGradeValue, setNewGradeValue] = useState('');
    const [newAreaName, setNewAreaName] = useState('');
    const [newOutcomeId, setNewOutcomeId] = useState('');
    const [newOutcomeText, setNewOutcomeText] = useState('');

    const mutateLocalState = (mutator: (draft: LocalCurriculumState) => void) => {
        updateLocalCurriculum((prev) => {
            const draft = buildClone(prev);
            mutator(draft);
            return draft;
        });
    };

    const handleAddSubject = () => {
        const normalizedId = normalizeSubjectId(newSubjectSlug);
        if (!normalizedId) {
            showToast('Lütfen geçerli bir ders kodu girin.', 'error');
            return;
        }
        const displayName = newSubjectName.trim() || inferSubjectName(normalizedId);
        mutateLocalState((draft) => {
            if (!draft.curriculum[normalizedId]) {
                draft.curriculum[normalizedId] = {};
            }
            draft.subjectNames[normalizedId] = displayName;
        });
        setSelectedSubjectId(normalizedId);
        setNewSubjectSlug('');
        setNewSubjectName('');
        showToast('Yeni ders sadece bu cihazda kullanılmak üzere eklendi.', 'success');
    };

    const handleAddGrade = () => {
        if (!selectedSubjectId) {
            showToast('Önce bir ders seçin.', 'error');
            return;
        }
        const numericGrade = Number(newGradeValue);
        if (!numericGrade || Number.isNaN(numericGrade)) {
            showToast('Geçerli bir sınıf değeri girin.', 'error');
            return;
        }
        mutateLocalState((draft) => {
            const subject = draft.curriculum[selectedSubjectId] ?? (draft.curriculum[selectedSubjectId] = {});
            subject[numericGrade] = subject[numericGrade] ?? [];
        });
        setSelectedGrade(numericGrade);
        setNewGradeValue('');
        showToast('Yeni sınıf bu cihazda saklandı.', 'success');
    };

    const handleAddArea = () => {
        if (!selectedSubjectId || selectedGrade === null) {
            showToast('Lütfen önce ders ve sınıf seçin.', 'error');
            return;
        }
        const trimmed = newAreaName.trim();
        if (!trimmed) {
            showToast('Öğrenme alanı adı boş olamaz.', 'error');
            return;
        }
        let blocked = false;
        mutateLocalState((draft) => {
            const subject = draft.curriculum[selectedSubjectId] ?? (draft.curriculum[selectedSubjectId] = {});
            const gradeAreas = subject[selectedGrade] ?? (subject[selectedGrade] = []);
            if (gradeAreas.some((area) => area.name.toLowerCase() === trimmed.toLowerCase())) {
                blocked = true;
                return;
            }
            gradeAreas.push({ name: trimmed, kazanimlar: [] });
        });
        if (blocked) {
            showToast('Bu isimde bir öğrenme alanı zaten mevcut.', 'info');
        } else {
            setNewAreaName('');
            setSelectedAreaName(trimmed);
            showToast('Yeni öğrenme alanı kaydedildi.', 'success');
        }
    };

    const handleDeleteArea = (areaName: string) => {
        mutateLocalState((draft) => {
            const subject = draft.curriculum[selectedSubjectId];
            if (!subject || selectedGrade === null) return;
            const gradeAreas = subject[selectedGrade];
            if (!Array.isArray(gradeAreas)) return;
            subject[selectedGrade] = gradeAreas.filter((area) => area.name !== areaName);
        });
        showToast('Öğrenme alanı silindi.', 'info');
    };

    const handleAddOutcome = () => {
        if (!selectedSubjectId || selectedGrade === null || !selectedAreaName) {
            showToast('Önce hedeflenen alanı seçin.', 'error');
            return;
        }
        const trimmedId = newOutcomeId.trim();
        const trimmedText = newOutcomeText.trim();
        if (!trimmedId || !trimmedText) {
            showToast('Kazanım ID ve metni zorunludur.', 'error');
            return;
        }
        let blocked = false;
        mutateLocalState((draft) => {
            const subject = draft.curriculum[selectedSubjectId] ?? (draft.curriculum[selectedSubjectId] = {});
            const gradeAreas = subject[selectedGrade] ?? (subject[selectedGrade] = []);
            const targetArea = gradeAreas.find((area) => area.name === selectedAreaName);
            if (!targetArea) {
                blocked = true;
                return;
            }
            if (targetArea.kazanimlar.some((k) => k.id === trimmedId)) {
                blocked = true;
                return;
            }
            targetArea.kazanimlar.push({ id: trimmedId, text: trimmedText });
        });
        if (blocked) {
            showToast('Bu ID ile bir kazanım zaten var.', 'info');
        } else {
            setNewOutcomeId('');
            setNewOutcomeText('');
            showToast('Yeni kazanım bu cihazda saklandı.', 'success');
        }
    };

    const handleDeleteOutcome = (areaName: string, outcomeId: string) => {
        mutateLocalState((draft) => {
            const subject = draft.curriculum[selectedSubjectId];
            if (!subject || selectedGrade === null) return;
            const gradeAreas = subject[selectedGrade];
            if (!Array.isArray(gradeAreas)) return;
            const targetArea = gradeAreas.find((area) => area.name === areaName);
            if (!targetArea) return;
            targetArea.kazanimlar = targetArea.kazanimlar.filter((k) => k.id !== outcomeId);
        });
        showToast('Kazanım kaldırıldı.', 'info');
    };

    const handleClearSubject = () => {
        if (!selectedSubjectId) return;
        const confirmation =
            typeof window === 'undefined' ||
            window.confirm('Bu ders için kaydedilen yerel eklemeleri silmek istediğinize emin misiniz?');
        if (!confirmation) return;
        mutateLocalState((draft) => {
            delete draft.curriculum[selectedSubjectId];
            delete draft.subjectNames[selectedSubjectId];
        });
        showToast('Yerel veriler temizlendi.', 'info');
    };

    const localSubjectLabel =
        selectedSubjectId && (localSubjectNames[selectedSubjectId] || allSubjects[selectedSubjectId]?.name);

    if (userType === 'guest') {
        return null;
    }

    return (
        <section className="space-y-4 rounded-xl border border-emerald-400/30 bg-slate-900/30 p-4">
            <header className="space-y-1">
                <h3 className="text-xl font-bold text-emerald-200">Yerel Müfredat Ekle</h3>
                <p className="text-sm text-slate-300">
                    Buraya eklediğiniz ders, öğrenme alanı ve kazanımlar yalnızca bu cihazda saklanır.
                    Firestore&apos;a gönderilmez ve diğer kullanıcılarla paylaşılmaz.
                </p>
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-4 space-y-3">
                    <div>
                        <label className="text-xs uppercase tracking-wide text-slate-400">Ders seçin</label>
                        <select
                            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800/80 p-2 text-sm"
                            value={selectedSubjectId}
                            onChange={(event) => setSelectedSubjectId(event.target.value)}
                        >
                            {subjectOptions.map((id) => (
                                <option key={id} value={id}>
                                    {allSubjects[id]?.name || inferSubjectName(id)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
                        <p className="text-xs font-semibold text-slate-300">Yeni ders oluştur</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <input
                                value={newSubjectSlug}
                                onChange={(event) => setNewSubjectSlug(event.target.value)}
                                placeholder="ders-kodu"
                                className="rounded-lg border border-slate-600 bg-slate-900/60 p-2 text-sm"
                            />
                            <input
                                value={newSubjectName}
                                onChange={(event) => setNewSubjectName(event.target.value)}
                                placeholder="Görünen ad"
                                className="rounded-lg border border-slate-600 bg-slate-900/60 p-2 text-sm"
                            />
                        </div>
                        <Button onClick={handleAddSubject} className="w-full !py-2 text-sm">
                            Dersi Cihazıma Kaydet
                        </Button>
                    </div>

                    <div className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
                        <p className="text-xs font-semibold text-slate-300">Sınıf ekle</p>
                        <div className="flex gap-2">
                            <input
                                value={newGradeValue}
                                onChange={(event) => setNewGradeValue(event.target.value)}
                                placeholder="Sınıf (örn. 7)"
                                className="flex-1 rounded-lg border border-slate-600 bg-slate-900/60 p-2 text-sm"
                            />
                            <Button onClick={handleAddGrade} className="!px-4 !py-2 text-sm">
                                Ekle
                            </Button>
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-wide text-slate-400">Aktif sınıf</label>
                            <select
                                value={selectedGrade ?? ''}
                                onChange={(event) => setSelectedGrade(Number(event.target.value))}
                                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900/60 p-2 text-sm"
                            >
                                {gradeOptions.map((grade) => (
                                    <option key={grade} value={grade}>
                                        {grade}. Sınıf
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 rounded-lg border border-slate-700/60 bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-emerald-200">
                                {localSubjectLabel || 'Ders seçilmedi'}
                            </p>
                            {selectedGrade && (
                                <p className="text-xs text-slate-400">{selectedGrade}. sınıf için yerel kayıtlar</p>
                            )}
                        </div>
                        <Button variant="secondary" onClick={handleClearSubject} className="!px-3 !py-1 text-xs">
                            Yerel Verileri Sil
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wide text-slate-400">Yeni öğrenme alanı</label>
                        <div className="flex gap-2">
                            <input
                                value={newAreaName}
                                onChange={(event) => setNewAreaName(event.target.value)}
                                placeholder="Örn. Veri İşleme"
                                className="flex-1 rounded-lg border border-slate-600 bg-slate-900/60 p-2 text-sm"
                            />
                            <Button onClick={handleAddArea} className="!px-4 !py-2 text-sm">
                                Ekle
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wide text-slate-400">Kazanım ekle</label>
                        {localAreas.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                Önce en az bir öğrenme alanı oluşturmalısınız.
                            </p>
                        ) : (
                            <>
                                <select
                                    className="w-full rounded-lg border border-slate-600 bg-slate-900/60 p-2 text-sm"
                                    value={selectedAreaName}
                                    onChange={(event) => setSelectedAreaName(event.target.value)}
                                >
                                    {localAreas.map((area) => (
                                        <option key={area.name} value={area.name}>
                                            {area.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <input
                                        value={newOutcomeId}
                                        onChange={(event) => setNewOutcomeId(event.target.value)}
                                        placeholder="Kazanım ID"
                                        className="rounded-lg border border-slate-600 bg-slate-900/60 p-2 text-sm"
                                    />
                                    <input
                                        value={newOutcomeText}
                                        onChange={(event) => setNewOutcomeText(event.target.value)}
                                        placeholder="Kazanım açıklaması"
                                        className="rounded-lg border border-slate-600 bg-slate-900/60 p-2 text-sm"
                                    />
                                </div>
                                <Button onClick={handleAddOutcome} className="w-full !py-2 text-sm">
                                    Kazanımı Kaydet
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                <h4 className="font-semibold text-slate-100">Yerel öğrenme alanları</h4>
                {localAreas.length === 0 ? (
                    <p className="text-sm text-slate-400">Bu sınıf için henüz yerel bir kayıt yok.</p>
                ) : (
                    <div className="space-y-4">
                        {localAreas.map((area) => (
                            <div key={area.name} className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-slate-100">{area.name}</p>
                                    <button
                                        className="text-xs text-red-300 hover:text-red-200"
                                        onClick={() => handleDeleteArea(area.name)}
                                    >
                                        Sil
                                    </button>
                                </div>
                                {area.kazanimlar.length === 0 ? (
                                    <p className="text-xs text-slate-400">Henüz kazanım eklenmedi.</p>
                                ) : (
                                    <ul className="space-y-1 text-sm text-slate-200">
                                        {area.kazanimlar.map((kazanim) => (
                                            <li
                                                key={kazanim.id}
                                                className="flex items-start justify-between gap-3 rounded border border-slate-700/60 bg-slate-800/60 p-2"
                                            >
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400">{kazanim.id}</p>
                                                    <p>{kazanim.text}</p>
                                                </div>
                                                <button
                                                    className="text-xs text-red-300 hover:text-red-200"
                                                    onClick={() => handleDeleteOutcome(area.name, kazanim.id)}
                                                >
                                                    Kaldır
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <p className="text-xs text-slate-400">
                Not: Yerel müfredatınıza bağlı olarak ürettiğiniz sorular da yalnızca bu ders ve kazanımları seçtiğinizde
                kullanılabilir.
            </p>
        </section>
    );
};

export default LocalCurriculumManager;

