import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, InfoModal } from '../UI';
import { useAuth } from '../../contexts/AppContext';
import type { OgrenmeAlani, Kazanim } from '../../types';
import { allCurriculumData as staticCurriculum } from '../../data/curriculum/index';
import { SUBJECT_DISPLAY_NAMES } from '../../data/curriculum/subjects';
import safeStringify from '../../utils/safeStringify';
import { useToast } from '../Toast';

type SubjectCurriculum = Record<number, OgrenmeAlani[]>;
const AGENT_ENDPOINT = 'http://localhost:4311';

const deepClone = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => deepClone(item));
    const cloned: Record<string, any> = {};
    Object.keys(obj).forEach((key) => {
        cloned[key] = deepClone(obj[key]);
    });
    return cloned;
};

const inferSubjectName = (subjectId: string): string =>
    subjectId
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

const normalizeSubjectId = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

const buildInitialSubjectNames = (): Record<string, string> => {
    const names: Record<string, string> = { ...SUBJECT_DISPLAY_NAMES };
    Object.keys(staticCurriculum).forEach((subjectId) => {
        if (!names[subjectId]) {
            names[subjectId] = inferSubjectName(subjectId);
        }
    });
    return names;
};

const resolveCurriculumFilePath = (subjectId: string): string => {
    switch (subjectId) {
        case 'social-studies':
            return 'data/curriculum/social-studies.ts';
        case 'math':
            return 'data/curriculum/math.ts';
        case 'science':
            return 'data/curriculum/science.ts';
        case 'turkish':
            return 'data/curriculum/turkish.ts';
        case 'english':
            return 'data/curriculum/english.ts';
        default:
            return `data/curriculum/${subjectId}.ts`;
    }
};

const buildExportName = (subjectId: string): string => {
    const camel = subjectId
        .split('-')
        .filter(Boolean)
        .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('');
    return `${camel}Curriculum`;
};

const sortGrades = (grades: string[]): number[] =>
    grades
        .map((grade) => Number(grade))
        .filter((grade) => !Number.isNaN(grade))
        .sort((a, b) => a - b);

export const CurriculumManager: React.FC = () => {
    const { isDevUser, isAdmin } = useAuth();
    const { showToast } = useToast();
    const canEdit = isDevUser || isAdmin;

    const [subjectNames, setSubjectNames] = useState<Record<string, string>>(() => buildInitialSubjectNames());
    const [curriculumDraft, setCurriculumDraft] = useState<Record<string, SubjectCurriculum>>(
        () => deepClone(staticCurriculum)
    );
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
        () => Object.keys(staticCurriculum)[0] ?? 'social-studies'
    );
    const [selectedGrade, setSelectedGrade] = useState<number | null>(() => {
        const firstSubjectId = Object.keys(staticCurriculum)[0];
        const gradeKeys = firstSubjectId ? Object.keys(staticCurriculum[firstSubjectId]) : [];
        const sorted = sortGrades(gradeKeys);
        return sorted[0] ?? null;
    });
    const [subjectNameDraft, setSubjectNameDraft] = useState<string>(() =>
        subjectNames[Object.keys(staticCurriculum)[0] ?? 'social-studies'] ?? inferSubjectName(selectedSubjectId)
    );
    const [newSubjectId, setNewSubjectId] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newGradeValue, setNewGradeValue] = useState('');
    const [newLearningAreaName, setNewLearningAreaName] = useState('');
    const [areaEditing, setAreaEditing] = useState<string | null>(null);
    const [areaDraftName, setAreaDraftName] = useState('');
    const [outcomeForm, setOutcomeForm] = useState<{ area: string | null; id: string; text: string }>({
        area: null,
        id: '',
        text: '',
    });
    const [editingOutcome, setEditingOutcome] = useState<{ area: string; originalId: string } | null>(null);
    const [outcomeDraftId, setOutcomeDraftId] = useState('');
    const [outcomeDraftText, setOutcomeDraftText] = useState('');
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [codeToSave, setCodeToSave] = useState('');
    const [filePathToSave, setFilePathToSave] = useState('');
    const [exportNameToSave, setExportNameToSave] = useState<string | null>(null);
    const [agentStatus, setAgentStatus] = useState<'checking' | 'online' | 'offline' | 'error'>('checking');
    const [agentToken, setAgentToken] = useState('');
    const [isAgentSaving, setIsAgentSaving] = useState(false);
    const [agentMessage, setAgentMessage] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedToken = window.localStorage.getItem('curriculumAgentToken');
        if (storedToken) {
            setAgentToken(storedToken);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (agentToken) {
            window.localStorage.setItem('curriculumAgentToken', agentToken);
        } else {
            window.localStorage.removeItem('curriculumAgentToken');
        }
    }, [agentToken]);

    const refreshAgentStatus = useCallback(async () => {
        try {
            setAgentStatus('checking');
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(`${AGENT_ENDPOINT}/health`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!response.ok) {
                throw new Error('Agent yanıtı başarısız');
            }
            setAgentStatus('online');
        } catch (error) {
            setAgentStatus('offline');
        }
    }, []);

    useEffect(() => {
        refreshAgentStatus();
        const interval = setInterval(refreshAgentStatus, 15000);
        return () => clearInterval(interval);
    }, [refreshAgentStatus]);

    useEffect(() => {
        if (!selectedSubjectId) return;
        setSubjectNameDraft(subjectNames[selectedSubjectId] || inferSubjectName(selectedSubjectId));
    }, [selectedSubjectId, subjectNames]);

    useEffect(() => {
        if (!selectedSubjectId) {
            setSelectedGrade(null);
            return;
        }
        const grades = Object.keys(curriculumDraft[selectedSubjectId] || {});
        if (!grades.length) {
            setSelectedGrade(null);
            return;
        }
        if (!selectedGrade || !grades.includes(String(selectedGrade))) {
            const sortedGrades = sortGrades(grades);
            setSelectedGrade(sortedGrades[0]);
        }
    }, [selectedSubjectId, curriculumDraft, selectedGrade]);

    const subjectOptions = useMemo(() => Object.keys(curriculumDraft).sort(), [curriculumDraft]);
    const currentSubject = curriculumDraft[selectedSubjectId] || {};
    const gradeOptions = useMemo(() => sortGrades(Object.keys(currentSubject)), [currentSubject]);
    const learningAreas = useMemo(() => {
        if (!selectedGrade) return [];
        return currentSubject[selectedGrade] || [];
    }, [currentSubject, selectedGrade]);

    const handleSelectSubject = (subjectId: string) => {
        setSelectedSubjectId(subjectId);
        const grades = Object.keys(curriculumDraft[subjectId] || {});
        setSelectedGrade(grades.length ? sortGrades(grades)[0] : null);
    };

    const handleSubjectNameSave = () => {
        if (!selectedSubjectId || !canEdit) return;
        const trimmed = subjectNameDraft.trim();
        if (!trimmed) return;
        setSubjectNames((prev) => ({
            ...prev,
            [selectedSubjectId]: trimmed,
        }));
    };

    const handleAddSubject = () => {
        if (!canEdit) return;
        const normalizedId = normalizeSubjectId(newSubjectId);
        const trimmedName = newSubjectName.trim();
        if (!normalizedId || !trimmedName || curriculumDraft[normalizedId]) return;

        setCurriculumDraft((prev) => ({
            ...prev,
            [normalizedId]: {},
        }));
        setSubjectNames((prev) => ({
            ...prev,
            [normalizedId]: trimmedName,
        }));
        setSelectedSubjectId(normalizedId);
        setSelectedGrade(null);
        setNewSubjectId('');
        setNewSubjectName('');
    };

    const handleDeleteSubject = (subjectId: string) => {
        if (!canEdit) return;
        const confirmed =
            typeof window === 'undefined' || window.confirm('Bu dersi kalıcı olarak kaldırmak istediğine emin misin?');
        if (!confirmed) return;
        setCurriculumDraft((prev) => {
            const next = { ...prev };
            delete next[subjectId];
            const remainingIds = Object.keys(next);
            setSelectedSubjectId((current) => {
                if (current === subjectId) {
                    return remainingIds[0] ?? '';
                }
                return current;
            });
            if (!remainingIds.length) {
                setSelectedGrade(null);
            }
            return next;
        });
        setSubjectNames((prev) => {
            const next = { ...prev };
            delete next[subjectId];
            return next;
        });
    };

    const handleAddGrade = () => {
        if (!canEdit || !selectedSubjectId) return;
        const numericGrade = Number(newGradeValue);
        if (!numericGrade || Number.isNaN(numericGrade)) return;

        setCurriculumDraft((prev) => {
            const subjectData = prev[selectedSubjectId] || {};
            if (subjectData[numericGrade]) return prev;
            return {
                ...prev,
                [selectedSubjectId]: {
                    ...subjectData,
                    [numericGrade]: [],
                },
            };
        });
        setSelectedGrade(numericGrade);
        setNewGradeValue('');
    };

    const handleDeleteGrade = (grade: number) => {
        if (!canEdit || !selectedSubjectId) return;
        setCurriculumDraft((prev) => {
            const subjectData = prev[selectedSubjectId];
            if (!subjectData) return prev;
            const nextSubject = { ...subjectData };
            delete nextSubject[grade];
            const nextDraft = { ...prev, [selectedSubjectId]: nextSubject };
            if (selectedGrade === grade) {
                const remaining = Object.keys(nextSubject);
                setSelectedGrade(remaining.length ? sortGrades(remaining)[0] : null);
            }
            return nextDraft;
        });
    };

    const handleAddLearningArea = () => {
        if (!canEdit || !selectedSubjectId || !selectedGrade) return;
        const trimmed = newLearningAreaName.trim();
        if (!trimmed) return;
        setCurriculumDraft((prev) => {
            const subjectData = prev[selectedSubjectId] || {};
            const gradeAreas = Array.isArray(subjectData[selectedGrade]) ? subjectData[selectedGrade] : [];
            if (gradeAreas.some((area) => area.name === trimmed)) return prev;
            return {
                ...prev,
                [selectedSubjectId]: {
                    ...subjectData,
                    [selectedGrade]: [...gradeAreas, { name: trimmed, kazanimlar: [] }],
                },
            };
        });
        setNewLearningAreaName('');
    };

    const handleDeleteLearningArea = (areaName: string) => {
        if (!canEdit || !selectedSubjectId || !selectedGrade) return;
        setCurriculumDraft((prev) => {
            const subjectData = prev[selectedSubjectId] || {};
            const gradeAreas = subjectData[selectedGrade] || [];
            return {
                ...prev,
                [selectedSubjectId]: {
                    ...subjectData,
                    [selectedGrade]: gradeAreas.filter((area) => area.name !== areaName),
                },
            };
        });
    };

    const handleStartEditingArea = (areaName: string) => {
        if (!canEdit) return;
        setAreaEditing(areaName);
        setAreaDraftName(areaName);
    };

    const handleSaveAreaName = () => {
        if (!areaEditing || !selectedGrade || !selectedSubjectId || !canEdit) return;
        const trimmed = areaDraftName.trim();
        if (!trimmed) return;
        setCurriculumDraft((prev) => {
            const subjectData = prev[selectedSubjectId] || {};
            const gradeAreas = subjectData[selectedGrade] || [];
            return {
                ...prev,
                [selectedSubjectId]: {
                    ...subjectData,
                    [selectedGrade]: gradeAreas.map((area) =>
                        area.name === areaEditing ? { ...area, name: trimmed } : area
                    ),
                },
            };
        });
        setAreaEditing(null);
        setAreaDraftName('');
    };

    const handleShowOutcomeForm = (areaName: string) => {
        if (!canEdit) return;
        setOutcomeForm({ area: areaName, id: '', text: '' });
        setEditingOutcome(null);
    };

    const handleAddOutcome = () => {
        if (!canEdit || !outcomeForm.area || !selectedSubjectId || !selectedGrade) return;
        const trimmedText = outcomeForm.text.trim();
        const trimmedId = outcomeForm.id.trim();
        if (!trimmedText || !trimmedId) return;

        setCurriculumDraft((prev) => {
            const subjectData = prev[selectedSubjectId] || {};
            const gradeAreas = subjectData[selectedGrade] || [];
            return {
                ...prev,
                [selectedSubjectId]: {
                    ...subjectData,
                    [selectedGrade]: gradeAreas.map((area) => {
                        if (area.name !== outcomeForm.area) return area;
                        if (area.kazanimlar.some((k) => k.id === trimmedId)) return area;
                        return {
                            ...area,
                            kazanimlar: [...area.kazanimlar, { id: trimmedId, text: trimmedText }],
                        };
                    }),
                },
            };
        });
        setOutcomeForm({ area: null, id: '', text: '' });
    };

    const handleDeleteOutcome = (areaName: string, outcomeId: string) => {
        if (!canEdit || !selectedSubjectId || !selectedGrade) return;
        setCurriculumDraft((prev) => {
            const subjectData = prev[selectedSubjectId] || {};
            const gradeAreas = subjectData[selectedGrade] || [];
            return {
                ...prev,
                [selectedSubjectId]: {
                    ...subjectData,
                    [selectedGrade]: gradeAreas.map((area) =>
                        area.name === areaName
                            ? { ...area, kazanimlar: area.kazanimlar.filter((k) => k.id !== outcomeId) }
                            : area
                    ),
                },
            };
        });
    };

    const handleStartEditingOutcome = (areaName: string, outcome: Kazanim) => {
        if (!canEdit) return;
        setEditingOutcome({ area: areaName, originalId: outcome.id });
        setOutcomeDraftId(outcome.id);
        setOutcomeDraftText(outcome.text);
        setOutcomeForm({ area: null, id: '', text: '' });
    };

    const handleSaveOutcome = () => {
        if (!editingOutcome || !selectedSubjectId || !selectedGrade || !canEdit) return;
        const trimmedId = outcomeDraftId.trim();
        const trimmedText = outcomeDraftText.trim();
        if (!trimmedId || !trimmedText) return;

        setCurriculumDraft((prev) => {
            const subjectData = prev[selectedSubjectId] || {};
            const gradeAreas = subjectData[selectedGrade] || [];
            return {
                ...prev,
                [selectedSubjectId]: {
                    ...subjectData,
                    [selectedGrade]: gradeAreas.map((area) =>
                        area.name === editingOutcome.area
                            ? {
                                  ...area,
                                  kazanimlar: area.kazanimlar.map((k) =>
                                      k.id === editingOutcome.originalId ? { id: trimmedId, text: trimmedText } : k
                                  ),
                              }
                            : area
                    ),
                },
            };
        });
        setEditingOutcome(null);
        setOutcomeDraftId('');
        setOutcomeDraftText('');
    };

    const handleGenerateCodeForSave = () => {
        if (!selectedSubjectId) return;
        const exportName = buildExportName(selectedSubjectId);
        const pretty = safeStringify(curriculumDraft[selectedSubjectId] || {}, { space: 2 });
        const snippet = `export const ${exportName}: Record<number, OgrenmeAlani[]> = ${pretty};`;
        setCodeToSave(snippet);
        setFilePathToSave(resolveCurriculumFilePath(selectedSubjectId));
        setExportNameToSave(exportName);
        setIsSaveModalOpen(true);
    };

    const handleSaveViaAgent = async () => {
        if (!filePathToSave || !codeToSave || !exportNameToSave || !selectedSubjectId) {
            showToast('Önce kaydedilecek kodu üretin.', 'error');
            return;
        }
        if (agentStatus === 'offline') {
            showToast('Curriculum Agent çalışmıyor. Lütfen masaüstü aracını başlatın.', 'error');
            return;
        }

        setIsAgentSaving(true);
        setAgentMessage(null);
        try {
            const response = await fetch(`${AGENT_ENDPOINT}/write-curriculum`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filePath: filePathToSave,
                    code: codeToSave,
                    token: agentToken || undefined,
                    subjectId: selectedSubjectId,
                    exportName: exportNameToSave,
                    subjectName: selectedSubjectName,
                }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.error || 'Agent kaydetme işlemi başarısız.');
            }
            setAgentMessage(`Agent güncellendi: ${payload?.filePath || filePathToSave}`);
            showToast('Müfredat dosyası agent üzerinden kaydedildi.', 'success');
            setAgentStatus('online');
        } catch (error: any) {
            console.error('Agent kaydetme hatası:', error);
            showToast(error?.message || 'Agent kaydetme işlemi başarısız.', 'error');
            setAgentStatus('error');
        } finally {
            setIsAgentSaving(false);
        }
    };

    const selectedSubjectName =
        selectedSubjectId && subjectNames[selectedSubjectId]
            ? subjectNames[selectedSubjectId]
            : inferSubjectName(selectedSubjectId);

    const agentStatusLabel = useMemo(() => {
        switch (agentStatus) {
            case 'online':
                return 'Agent bağlı';
            case 'checking':
                return 'Agent aranıyor...';
            case 'error':
                return 'Agent hatası';
            default:
                return 'Agent kapalı';
        }
    }, [agentStatus]);

    const agentStatusClass = useMemo(() => {
        switch (agentStatus) {
            case 'online':
                return 'text-green-400';
            case 'checking':
                return 'text-yellow-300';
            case 'error':
                return 'text-red-400';
            default:
                return 'text-slate-400';
        }
    }, [agentStatus]);

    const agentActionDisabled =
        !filePathToSave ||
        !codeToSave ||
        !exportNameToSave ||
        agentStatus === 'offline' ||
        agentStatus === 'checking' ||
        isAgentSaving;

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <h2 className="text-2xl font-semibold">Müfredat Düzenleyici</h2>
                <p className="text-sm text-slate-300">
                    Tüm değişiklikler yalnızca aşağıdaki &quot;Koda Kaydet&quot; çıktısında gösterilir. Firestore&apos;a
                    herhangi bir veri yazılmaz; ilgili dosyaları manuel olarak güncellemeniz gerekir.
                </p>
                {!canEdit && (
                    <p className="text-sm text-amber-300">
                        Bu bölümü yalnızca yetkili yöneticiler düzenleyebilir. Verileri görüntüleyebilirsiniz ancak
                        değişiklik yapamazsınız.
                    </p>
                )}
            </header>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-6 rounded-lg bg-slate-900/40 p-4">
                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-semibold">Dersler</h3>
                            {canEdit && <span className="text-xs text-slate-400">{subjectOptions.length} ders</span>}
                        </div>
                        <div className="space-y-2">
                            {subjectOptions.map((subjectId) => (
                                <div
                                    key={subjectId}
                                    className={`flex items-center gap-2 rounded border px-2 py-1 ${
                                        selectedSubjectId === subjectId
                                            ? 'border-violet-400 bg-violet-900/30'
                                            : 'border-slate-700 bg-slate-800/40'
                                    }`}
                                >
                                    <button
                                        className="flex-1 text-left text-sm font-medium"
                                        onClick={() => handleSelectSubject(subjectId)}
                                    >
                                        {subjectNames[subjectId] || inferSubjectName(subjectId)}
                                    </button>
                                    {canEdit && (
                                        <button
                                            className="text-xs text-red-400 hover:text-red-300"
                                            onClick={() => handleDeleteSubject(subjectId)}
                                        >
                                            Sil
                                        </button>
                                    )}
                                </div>
                            ))}
                            {canEdit && (
                                <div className="rounded border border-dashed border-slate-600 p-3 text-sm">
                                    <p className="mb-2 font-semibold">Yeni Ders</p>
                                    <input
                                        type="text"
                                        placeholder="ders-id (örn: coding)"
                                        value={newSubjectId}
                                        onChange={(e) => setNewSubjectId(e.target.value)}
                                        className="mb-2 w-full rounded bg-slate-900/60 p-2 text-xs outline-none placeholder:text-slate-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Görünen ad"
                                        value={newSubjectName}
                                        onChange={(e) => setNewSubjectName(e.target.value)}
                                        className="mb-3 w-full rounded bg-slate-900/60 p-2 text-xs outline-none placeholder:text-slate-500"
                                    />
                                    <Button
                                        onClick={handleAddSubject}
                                        disabled={!newSubjectId.trim() || !newSubjectName.trim()}
                                        variant="secondary"
                                        className="w-full !py-1.5 text-xs"
                                    >
                                        Ders Ekle
                                    </Button>
                                </div>
                            )}
                        </div>
                        {selectedSubjectId && (
                            <div className="mt-4 space-y-2">
                                <p className="text-xs text-slate-400">Görünen ad</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={subjectNameDraft}
                                        disabled={!canEdit}
                                        onChange={(e) => setSubjectNameDraft(e.target.value)}
                                        className="flex-1 rounded bg-slate-900/80 p-2 text-sm outline-none disabled:opacity-60"
                                    />
                                    <Button
                                        onClick={handleSubjectNameSave}
                                        disabled={!canEdit}
                                        variant="primary"
                                        className="!py-1.5 text-sm"
                                    >
                                        Kaydet
                                    </Button>
                                </div>
                            </div>
                        )}
                    </section>

                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-semibold">Sınıflar</h3>
                        </div>
                        <div className="space-y-2">
                            {gradeOptions.length ? (
                                gradeOptions.map((grade) => (
                                    <div
                                        key={grade}
                                        className={`flex items-center gap-2 rounded border px-2 py-1 ${
                                            selectedGrade === grade
                                                ? 'border-fuchsia-400 bg-fuchsia-900/30'
                                                : 'border-slate-700 bg-slate-800/40'
                                        }`}
                                    >
                                        <button
                                            className="flex-1 text-left text-sm font-medium"
                                            onClick={() => setSelectedGrade(grade)}
                                        >
                                            {grade}. Sınıf
                                        </button>
                                        {canEdit && (
                                            <button
                                                className="text-xs text-red-400 hover:text-red-300"
                                                onClick={() => handleDeleteGrade(grade)}
                                            >
                                                Sil
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="rounded bg-slate-900/40 p-2 text-center text-sm text-slate-400">
                                    Bu ders için henüz sınıf eklenmedi.
                                </p>
                            )}
                        </div>
                        {canEdit && (
                            <div className="mt-3 space-y-2 rounded border border-dashed border-slate-600 p-3 text-sm">
                                <input
                                    type="number"
                                    placeholder="Sınıf (örn: 5)"
                                    value={newGradeValue}
                                    onChange={(e) => setNewGradeValue(e.target.value)}
                                    className="w-full rounded bg-slate-900/60 p-2 outline-none placeholder:text-slate-500"
                                />
                                <Button
                                    onClick={handleAddGrade}
                                    disabled={!newGradeValue.trim()}
                                    variant="secondary"
                                    className="w-full !py-1.5 text-xs"
                                >
                                    Sınıf Ekle
                                </Button>
                            </div>
                        )}
                    </section>
                </div>

                <div className="md:col-span-2 space-y-4 rounded-lg bg-slate-900/30 p-4">
                    {selectedGrade ? (
                        <>
                            <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-400">Seçili Ders</p>
                                    <p className="text-lg font-semibold">{selectedSubjectName}</p>
                                    <p className="text-sm text-slate-400">{selectedGrade}. sınıf</p>
                                </div>
                                {canEdit && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Öğrenme alanı adı"
                                            value={newLearningAreaName}
                                            onChange={(e) => setNewLearningAreaName(e.target.value)}
                                            className="flex-1 rounded bg-slate-900/70 p-2 text-sm outline-none placeholder:text-slate-500"
                                        />
                                        <Button
                                            onClick={handleAddLearningArea}
                                            disabled={!newLearningAreaName.trim()}
                                            variant="primary"
                                            className="!py-1.5 text-sm"
                                        >
                                            Alan Ekle
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                {learningAreas.length ? (
                                    learningAreas.map((area) => (
                                        <div key={area.name} className="rounded-lg bg-slate-800/50 p-3">
                                            <div className="flex flex-col gap-2 border-b border-slate-700 pb-2 sm:flex-row sm:items-center sm:justify-between">
                                                {areaEditing === area.name ? (
                                                    <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                                                        <input
                                                            type="text"
                                                            value={areaDraftName}
                                                            onChange={(e) => setAreaDraftName(e.target.value)}
                                                            className="flex-1 rounded bg-slate-900/70 p-2 text-sm outline-none"
                                                        />
                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={handleSaveAreaName}
                                                                variant="success"
                                                                className="!py-1.5 text-xs"
                                                            >
                                                                Kaydet
                                                            </Button>
                                                            <Button
                                                                onClick={() => setAreaEditing(null)}
                                                                variant="secondary"
                                                                className="!py-1.5 text-xs"
                                                            >
                                                                Vazgeç
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <h4 className="text-base font-semibold">{area.name}</h4>
                                                )}
                                                {canEdit && areaEditing !== area.name && (
                                                    <div className="flex gap-2 text-xs">
                                                        <button
                                                            className="text-yellow-300 hover:text-yellow-200"
                                                            onClick={() => handleStartEditingArea(area.name)}
                                                        >
                                                            Düzenle
                                                        </button>
                                                        <button
                                                            className="text-red-400 hover:text-red-300"
                                                            onClick={() => handleDeleteLearningArea(area.name)}
                                                        >
                                                            Sil
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-3 space-y-2">
                                                {area.kazanimlar.length ? (
                                                    area.kazanimlar.map((kazanim) => {
                                                        const isEditing =
                                                            editingOutcome?.area === area.name &&
                                                            editingOutcome.originalId === kazanim.id;
                                                        return (
                                                            <div
                                                                key={kazanim.id}
                                                                className="rounded border border-slate-700 bg-slate-900/40 p-3 text-sm"
                                                            >
                                                                {isEditing ? (
                                                                    <div className="space-y-2">
                                                                        <input
                                                                            type="text"
                                                                            value={outcomeDraftId}
                                                                            onChange={(e) => setOutcomeDraftId(e.target.value)}
                                                                            className="w-full rounded bg-slate-900/70 p-2 text-xs outline-none"
                                                                            placeholder="Kazanım kodu"
                                                                        />
                                                                        <textarea
                                                                            value={outcomeDraftText}
                                                                            onChange={(e) => setOutcomeDraftText(e.target.value)}
                                                                            className="w-full rounded bg-slate-900/70 p-2 text-sm outline-none"
                                                                            rows={3}
                                                                        />
                                                                        <div className="flex gap-2">
                                                                            <Button
                                                                                onClick={handleSaveOutcome}
                                                                                variant="success"
                                                                                className="!py-1.5 text-xs"
                                                                            >
                                                                                Kaydet
                                                                            </Button>
                                                                            <Button
                                                                                onClick={() => setEditingOutcome(null)}
                                                                                variant="secondary"
                                                                                className="!py-1.5 text-xs"
                                                                            >
                                                                                Vazgeç
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                                        <div>
                                                                            <p className="font-semibold">{kazanim.id}</p>
                                                                            <p className="text-slate-200">{kazanim.text}</p>
                                                                        </div>
                                                                        {canEdit && (
                                                                            <div className="flex gap-3 text-xs">
                                                                                <button
                                                                                    className="text-yellow-300 hover:text-yellow-200"
                                                                                    onClick={() => handleStartEditingOutcome(area.name, kazanim)}
                                                                                >
                                                                                    Düzenle
                                                                                </button>
                                                                                <button
                                                                                    className="text-red-400 hover:text-red-300"
                                                                                    onClick={() => handleDeleteOutcome(area.name, kazanim.id)}
                                                                                >
                                                                                    Sil
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="rounded bg-slate-900/40 p-2 text-center text-slate-400">
                                                        Bu öğrenme alanı için kazanım eklenmedi.
                                                    </p>
                                                )}

                                                {canEdit &&
                                                    (outcomeForm.area === area.name ? (
                                                        <div className="rounded border border-dashed border-slate-600 p-3 text-sm">
                                                            <p className="mb-2 font-semibold">{area.name} için yeni kazanım</p>
                                                            <input
                                                                type="text"
                                                                placeholder="Kazanım kodu (örn: SB.5.1.1)"
                                                                value={outcomeForm.id}
                                                                onChange={(e) =>
                                                                    setOutcomeForm((prev) => ({ ...prev, id: e.target.value }))
                                                                }
                                                                className="mb-2 w-full rounded bg-slate-900/60 p-2 text-xs outline-none placeholder:text-slate-500"
                                                            />
                                                            <textarea
                                                                placeholder="Kazanım metni"
                                                                value={outcomeForm.text}
                                                                onChange={(e) =>
                                                                    setOutcomeForm((prev) => ({ ...prev, text: e.target.value }))
                                                                }
                                                                className="mb-2 w-full rounded bg-slate-900/60 p-2 text-sm outline-none placeholder:text-slate-500"
                                                                rows={3}
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    onClick={handleAddOutcome}
                                                                    disabled={!outcomeForm.id.trim() || !outcomeForm.text.trim()}
                                                                    variant="primary"
                                                                    className="!py-1.5 text-xs"
                                                                >
                                                                    Ekle
                                                                </Button>
                                                                <Button
                                                                    onClick={() => setOutcomeForm({ area: null, id: '', text: '' })}
                                                                    variant="secondary"
                                                                    className="!py-1.5 text-xs"
                                                                >
                                                                    Vazgeç
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="text-xs font-semibold text-green-300 hover:text-green-200"
                                                            onClick={() => handleShowOutcomeForm(area.name)}
                                                        >
                                                            + Kazanım Ekle
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="rounded bg-slate-900/40 p-4 text-center text-slate-400">
                                        Bu sınıf için henüz öğrenme alanı yok. Yukarıdaki formu kullanarak ekleyebilirsiniz.
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex min-h-[280px] items-center justify-center rounded bg-slate-900/30 text-slate-400">
                            <p>Devam etmek için bir sınıf seçin veya yeni bir sınıf oluşturun.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3 rounded-lg bg-slate-900/40 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-slate-300">Curriculum Agent Durumu</p>
                        <p className={`font-semibold ${agentStatusClass}`}>{agentStatusLabel}</p>
                    </div>
                    <p className="text-xs text-slate-400">
                        {agentMessage ||
                            'Agent çalışıyorsa değişiklikler doğrudan data/curriculum dosyalarına yazılır.'}
                    </p>
                </div>
                <input
                    type="text"
                    placeholder="Agent anahtarı (opsiyonel)"
                    value={agentToken}
                    onChange={(e) => setAgentToken(e.target.value)}
                    className="w-full rounded bg-slate-900/70 p-2 text-sm outline-none placeholder:text-slate-500"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                        onClick={handleGenerateCodeForSave}
                        disabled={!selectedSubjectId}
                        variant="success"
                        className="w-full sm:w-auto !py-2 !text-base"
                    >
                        📋 Koda Kaydet
                    </Button>
                    <Button
                        onClick={handleSaveViaAgent}
                        disabled={agentActionDisabled}
                        variant="secondary"
                        className="w-full sm:w-auto !py-2 !text-base"
                    >
                        {isAgentSaving ? 'Agent kaydediyor...' : '⚡ Agent ile Kaydet'}
                    </Button>
                </div>
            </div>

            <InfoModal
                isOpen={isSaveModalOpen}
                title="Kod çıktısı hazır"
                onClose={() => setIsSaveModalOpen(false)}
            >
                <div className="space-y-3 text-sm">
                    <p className="rounded border border-yellow-700 bg-yellow-900/40 p-3 text-yellow-200">
                        Aşağıdaki kod, <code className="mx-1 rounded bg-slate-900 px-1 py-0.5">{filePathToSave}</code>
                        dosyasındaki {selectedSubjectName} dersini temsil eder. İlgili dosyayı açıp bu çıktıyla
                        güncelleyerek müfredatı kodda tutabilirsiniz.
                    </p>
                    <pre className="max-h-80 overflow-auto rounded bg-slate-900 p-3 text-xs">
                        <code>{codeToSave}</code>
                    </pre>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                if (navigator?.clipboard) {
                                    void navigator.clipboard.writeText(codeToSave);
                                }
                            }}
                            variant="primary"
                            className="w-full"
                        >
                            Kopyala
                        </Button>
                        <Button onClick={() => setIsSaveModalOpen(false)} variant="secondary" className="w-full">
                            Kapat
                        </Button>
                    </div>
                </div>
            </InfoModal>
        </div>
    );
};
