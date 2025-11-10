import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, InfoModal } from '../UI';
import { useAuth, useData, useGame } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import type { OgrenmeAlani, Kazanım, AltKonu } from '../../types';
import { allCurriculumData as staticCurriculum } from '../../data/curriculum/index';
import { deepmerge } from '../../utils/deepmerge';
import safeStringify from '../../utils/safeStringify';


// Helper function to convert kebab-case to camelCase for variable names
const toCamelCase = (str: string) => str.replace(/-([a-z])/g, g => g[1].toUpperCase());

// Helper for deep cloning without JSON.stringify issues
const deepClone = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    const cloned: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
};


export const CurriculumManager: React.FC = () => {
    const { isDevUser } = useAuth();
    const { 
        customCurriculum, setCustomCurriculum, 
        globalCurriculum, setGlobalCurriculum, 
    } = useData();
    const { allSubjects } = useGame();
    const { showToast } = useToast();

    const [managementMode, setManagementMode] = useState<'local' | 'global'>('local');
    
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('social-studies');
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
    const [currentData, setCurrentData] = useState<Record<number, OgrenmeAlani[]>>({});

    const [newItemForms, setNewItemForms] = useState<{
        class?: boolean;
        learningArea?: boolean;
        subTopic?: string; // Will store the learning area name
        kazanim?: string; // Will store the sub-topic name
    }>({});
    const [newItemName, setNewItemName] = useState('');
    const [isAddingNewSubject, setIsAddingNewSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    
    // State for editing items
    const [editingItem, setEditingItem] = useState<{ type: string, id: string } | null>(null);
    const [editedName, setEditedName] = useState('');

    // State for the "Save to Code" modal
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [codeToSave, setCodeToSave] = useState('');
    const [filePathToSave, setFilePathToSave] = useState('');

    const fullGlobalCurriculum = useMemo(() => deepmerge(staticCurriculum, globalCurriculum || {}), [globalCurriculum]);


    useEffect(() => {
        const targetData = managementMode === 'local' 
            ? customCurriculum?.[selectedSubjectId] || {}
            : fullGlobalCurriculum[selectedSubjectId] || {};
        
        setCurrentData(targetData);
        // Also reset selected grade when subject changes to avoid showing stale data
        setSelectedGrade(null); 
    }, [managementMode, selectedSubjectId, customCurriculum, fullGlobalCurriculum]);

    const handleDataUpdate = useCallback((newSubjectData: Record<number, OgrenmeAlani[]>) => {
        if (managementMode === 'local') {
            setCustomCurriculum(prev => ({ ...prev, [selectedSubjectId]: newSubjectData }));
            showToast('Kişisel müfredatınız güncellendi.', 'success');
        } else {
            setGlobalCurriculum(prev => ({ ...prev, [selectedSubjectId]: newSubjectData }));
            showToast('Global müfredat bellekte güncellendi. Kalıcı hale getirmek için "Koda Kaydet" kullanın.', 'info');
        }
    }, [managementMode, selectedSubjectId, setCustomCurriculum, setGlobalCurriculum, showToast]);
    
    const handleAddNewSubject = () => {
        const name = newSubjectName.trim();
        if (!name) {
            showToast('Lütfen bir ders adı girin.', 'error');
            return;
        }

        const newSubjectId = name.toLowerCase()
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ı/g, 'i')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');

        if (allSubjects[newSubjectId]) {
            showToast('Bu ID ile bir ders zaten mevcut.', 'error');
            return;
        }

        const handler = managementMode === 'global' && isDevUser ? setGlobalCurriculum : setCustomCurriculum;
        const modeText = managementMode === 'global' && isDevUser ? 'Global Müfredata' : 'Kişisel Müfredatınıza';

        handler(prev => ({
            ...prev,
            [newSubjectId]: {}
        }));
        showToast(`'${name}' dersi ${modeText} eklendi.`, 'success');


        setNewSubjectName('');
        setIsAddingNewSubject(false);
        setSelectedSubjectId(newSubjectId); // Select the new subject automatically
    };

    const handleAddItem = (type: 'class' | 'learningArea' | 'subTopic' | 'kazanim', parentName?: string) => {
        if (!newItemName.trim()) {
            showToast('Lütfen bir isim girin.', 'error');
            return;
        }

        const newData = deepClone(currentData);
        
        switch (type) {
            case 'class':
                const gradeNum = parseInt(newItemName);
                if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 12) {
                    showToast('Geçersiz sınıf seviyesi. Lütfen 1-12 arasında bir sayı girin.', 'error');
                    return;
                }
                if (newData[gradeNum]) {
                    showToast('Bu sınıf zaten mevcut.', 'error');
                    return;
                }
                newData[gradeNum] = [];
                break;
            case 'learningArea':
                if (!selectedGrade) return;
                newData[selectedGrade].push({ name: newItemName.trim(), altKonular: [] });
                break;
            case 'subTopic':
                 if (!selectedGrade || !parentName) return;
                 const la = newData[selectedGrade].find((o: OgrenmeAlani) => o.name === parentName);
                 if (la) la.altKonular.push({ name: newItemName.trim(), kazanımlar: [] });
                break;
            case 'kazanim':
                if (!selectedGrade || !parentName) return;
                 const [laName, stName] = parentName.split('__');
                 const targetLa = newData[selectedGrade].find((o: OgrenmeAlani) => o.name === laName);
                 const targetSt = targetLa?.altKonular.find((s: AltKonu) => s.name === stName);
                 if (targetSt) targetSt.kazanımlar.push({ id: `USER.${Date.now()}`, text: newItemName.trim() });
                break;
        }

        handleDataUpdate(newData);
        setNewItemName('');
        setNewItemForms({});
    };

    const handleDeleteItem = (type: 'subject' | 'class' | 'learningArea' | 'subTopic' | 'kazanim', id: string) => {
        if (!window.confirm('Bu öğeyi ve (varsa) tüm alt öğelerini silmek istediğinizden emin misiniz?')) return;

        if (type === 'subject') {
            const handler = managementMode === 'local' ? setCustomCurriculum : setGlobalCurriculum;
            handler(prev => {
                const newCurriculum = { ...prev };
                delete newCurriculum[id];
                return newCurriculum;
            });
            if (selectedSubjectId === id) {
                 const remainingSubjects = Object.keys(allSubjects).filter(subId => subId !== id);
                 setSelectedSubjectId(remainingSubjects[0] || '');
            }
            return;
        }

        const newData = deepClone(currentData);
        
        if (type === 'class') {
            delete newData[parseInt(id)];
            if (selectedGrade === parseInt(id)) setSelectedGrade(null);
        } else if (selectedGrade) {
            const path = id.split('__');
            if (type === 'learningArea') {
                newData[selectedGrade] = newData[selectedGrade].filter((o: OgrenmeAlani) => o.name !== path[0]);
            } else if (type === 'subTopic') {
                const la = newData[selectedGrade].find((o: OgrenmeAlani) => o.name === path[0]);
                if(la) la.altKonular = la.altKonular.filter((st: AltKonu) => st.name !== path[1]);
            } else if (type === 'kazanim') {
                const la = newData[selectedGrade].find((o: OgrenmeAlani) => o.name === path[0]);
                const st = la?.altKonular.find((s: AltKonu) => s.name === path[1]);
                if(st) st.kazanımlar = st.kazanımlar.filter((k: Kazanım) => k.id !== path[2]);
            }
        }

        handleDataUpdate(newData);
    };

    const handleStartEditing = (type: string, id: string, currentName: string) => {
        setEditingItem({ type, id });
        setEditedName(currentName);
    };

    const handleCancelEditing = () => {
        setEditingItem(null);
        setEditedName('');
    };

    const handleUpdateItem = () => {
        if (!editingItem || !editedName.trim() || !selectedGrade) {
            handleCancelEditing();
            return;
        }
        
        const { type, id } = editingItem;
        const newName = editedName.trim();
        const newData = deepClone(currentData);
        const path = id.split('__');
        
        try {
            if (type === 'learningArea') {
                const item = newData[selectedGrade].find((o: OgrenmeAlani) => o.name === path[0]);
                if (item) item.name = newName;
            } else if (type === 'subTopic') {
                const la = newData[selectedGrade].find((o: OgrenmeAlani) => o.name === path[0]);
                const st = la?.altKonular.find((s: AltKonu) => s.name === path[1]);
                if (st) st.name = newName;
            } else if (type === 'kazanim') {
                const la = newData[selectedGrade].find((o: OgrenmeAlani) => o.name === path[0]);
                const st = la?.altKonular.find((s: AltKonu) => s.name === path[1]);
                const k = st?.kazanımlar.find((k: Kazanım) => k.id === path[2]);
                if (k) k.text = newName;
            }
            handleDataUpdate(newData);
        } catch(e) {
            showToast('Öğe güncellenirken bir hata oluştu.', 'error');
        } finally {
            handleCancelEditing();
        }
    };


const renderNewItemForm = (type: 'class' | 'learningArea' | 'subTopic' | 'kazanim', parentName?: string, placeholder?: string) => (
        <div className="p-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <input
                type="text"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder={placeholder || 'Yeni öğe adı...'}
                className="w-full flex-1 p-2 bg-slate-700 rounded-md border border-slate-600 text-sm"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem(type, parentName)}
            />
            <button onClick={() => handleAddItem(type, parentName)} className="w-full sm:w-auto px-3 py-1 bg-green-600 rounded-md text-sm font-semibold">Ekle</button>
            <button onClick={() => { setNewItemForms({}); setNewItemName(''); }} className="w-full sm:w-auto px-3 py-1 bg-red-600 rounded-md text-sm font-semibold">İptal</button>
        </div>
    );
    
    const renderEditForm = () => (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <input
                type="text"
                value={editedName}
                onChange={e => setEditedName(e.target.value)}
                className="w-full flex-1 p-1 bg-slate-900 rounded-md border border-slate-600 text-sm"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateItem()}
            />
            <div className="flex w-full gap-2 sm:w-auto sm:flex-none">
                <button onClick={handleUpdateItem} className="w-full sm:w-auto text-xl">✅</button>
                <button onClick={handleCancelEditing} className="w-full sm:w-auto text-xl">❌</button>
            </div>
        </div>
    );

    const handleGenerateCodeForSave = () => {
        if (managementMode !== 'global' || !isDevUser) {
            showToast("Bu özellik sadece Geliştirici-Adminler içindir.", "error");
            return;
        }

        const dataToSave = fullGlobalCurriculum[selectedSubjectId] || {};
        const subjectVarName = `${toCamelCase(selectedSubjectId)}Curriculum`;
        const filePath = `data/curriculum/${selectedSubjectId}.ts`;

        const code = `import type { OgrenmeAlani } from '../../types';\n\nexport const ${subjectVarName}: Record<number, OgrenmeAlani[]> = ${safeStringify(dataToSave, { space: 2 })};\n`;
        setCodeToSave(code);
        setFilePathToSave(filePath);
        setIsSaveModalOpen(true);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(codeToSave).then(() => {
            showToast("Kod panoya kopyalandı!", "success");
        }).catch(() => {
            showToast("Kopyalama başarısız oldu.", "error");
        });
    };


    const grades = useMemo(() => Object.keys(currentData).map(Number).sort((a, b) => a - b), [currentData]);

    return (
        <div className={`p-4 rounded-xl space-y-4 transition-all duration-300 ${managementMode === 'global' && isDevUser ? 'border-2 border-yellow-500 bg-yellow-900/20 shadow-lg shadow-yellow-500/20' : 'border border-violet-500/30'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                 <h3 className={`text-xl font-bold ${managementMode === 'global' && isDevUser ? 'text-yellow-300' : 'text-violet-300'}`}>Müfredat Yöneticisi</h3>
                {isDevUser && (
                    <div className="flex flex-wrap items-center justify-center gap-1 bg-slate-700/50 p-1 rounded-lg sm:justify-end">
                        <button onClick={() => setManagementMode('local')} className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${managementMode === 'local' ? 'bg-violet-600' : 'hover:bg-slate-600'}`}>Kişisel</button>
                        <button onClick={() => setManagementMode('global')} className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${managementMode === 'global' ? 'bg-yellow-500 text-black' : 'hover:bg-slate-600'}`}>Global (Admin)</button>
                    </div>
                )}
            </div>
            
            {managementMode === 'global' && isDevUser && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-600/50 rounded-lg text-center sticky top-0 z-10 backdrop-blur-sm">
                    <p className="font-bold text-yellow-300">DİKKAT: Global Müfredat Modu. Burada yapılan değişiklikler tüm kullanıcıları etkileyecektir.</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 items-start md:grid-cols-3 md:gap-6">
                {/* Left Column: Subjects and Grades */}
                <div className="md:col-span-1 space-y-4 md:space-y-6 min-w-0">
                    <div>
                        <h4 className="font-semibold mb-2 flex justify-between items-center">
                            <span>Dersler</span>
                             <button onClick={() => setIsAddingNewSubject(true)} className="text-xs bg-green-600 px-2 py-0.5 rounded" title="Yeni Ders Ekle">+</button>
                        </h4>
{isAddingNewSubject && (
                             <div className="p-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                <input type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Yeni Ders Adı..." className="w-full flex-1 p-2 bg-slate-700 rounded-md border border-slate-600 text-sm" autoFocus onKeyDown={e => e.key === 'Enter' && handleAddNewSubject()} />
                                <button onClick={handleAddNewSubject} className="w-full sm:w-auto px-3 py-1 bg-green-600 rounded-md text-sm font-semibold">Ekle</button>
                                <button onClick={() => { setIsAddingNewSubject(false); setNewSubjectName(''); }} className="w-full sm:w-auto px-3 py-1 bg-red-600 rounded-md text-sm font-semibold">İptal</button>
                            </div>
                        )}
                        <div className="space-y-1">
                            {Object.keys(allSubjects).map(id => (
                                <div key={id} className="flex flex-wrap items-center gap-1 sm:gap-2">
                                    <button onClick={() => { setSelectedSubjectId(id); }} className={`flex-1 min-w-0 text-left p-2 rounded transition-colors text-sm ${selectedSubjectId === id ? 'bg-violet-600 font-bold' : 'bg-slate-700/50 hover:bg-slate-700'}`}>
                                        {allSubjects[id].name}
                                    </button>
                                    {managementMode === 'global' && isDevUser && (
                                        <button onClick={() => handleDeleteItem('subject', id)} className="p-1 text-red-400 hover:text-red-300 text-lg">🗑️</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2 flex justify-between items-center">
                            <span>Sınıflar</span>
                            <button onClick={() => setNewItemForms({ class: true })} className="text-xs bg-green-600 px-2 py-0.5 rounded">+</button>
                        </h4>
                         {newItemForms.class && renderNewItemForm('class', undefined, 'Sınıf (Örn: 5)')}
                        <div className="space-y-1">
                             {grades.length > 0 ? grades.map(grade => (
                                <div key={grade} className="flex flex-wrap items-center gap-1 sm:gap-2">
                                    <button onClick={() => setSelectedGrade(grade)} className={`flex-1 min-w-0 text-left p-2 rounded transition-colors text-sm ${selectedGrade === grade ? 'bg-violet-800 font-bold' : 'bg-slate-700/50 hover:bg-slate-700'}`}>
                                        {grade}. Sınıf
                                    </button>
                                    {managementMode === 'global' && isDevUser && <button onClick={() => handleDeleteItem('class', String(grade))} className="p-1 text-red-400 hover:text-red-300 text-lg">🗑️</button>}
                                </div>
                            )) : <p className="text-sm text-slate-400 text-center p-2">Sınıf ekleyin.</p>}
                        </div>
                    </div>
                </div>

                {/* Right Column: Curriculum Details */}
                <div className="md:col-span-2 bg-slate-900/30 p-4 rounded-lg min-h-[300px] min-w-0">
                    {selectedGrade ? (
                         <div className="space-y-3">
                             <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h4 className="text-lg font-bold">{selectedGrade}. Sınıf Müfredatı</h4>
                                <button onClick={() => setNewItemForms({ learningArea: true })} className="text-sm bg-green-600 px-2 py-1 rounded font-semibold">+ Öğrenme Alanı</button>
                            </div>
                             {newItemForms.learningArea && renderNewItemForm('learningArea', undefined, 'Öğrenme Alanı Adı')}

                            {(currentData[selectedGrade] || []).map(la => (
                                <details key={la.name} open className="bg-slate-800/50 p-2 rounded-lg">
                                    <summary className="font-semibold cursor-pointer flex flex-wrap items-center gap-2">
                                        {editingItem?.type === 'learningArea' && editingItem.id === la.name ? renderEditForm() : <span className="flex-grow min-w-0 break-words">{la.name}</span>}
                                        {managementMode === 'global' && isDevUser && !editingItem && <div className="flex flex-shrink-0 flex-wrap items-center gap-1 sm:flex-nowrap"><button onClick={() => handleStartEditing('learningArea', la.name, la.name)} className="p-1 text-yellow-400 hover:text-yellow-300 text-lg">✏️</button><button onClick={() => handleDeleteItem('learningArea', la.name)} className="p-1 text-red-400 hover:text-red-300 text-lg">🗑️</button></div>}
                                    </summary>
                                    <div className="pl-4 pt-2 space-y-2">
                                        {la.altKonular.map(st => (
                                            <details key={st.name} open className="bg-slate-700/40 p-2 rounded">
                                                <summary className="text-sm font-semibold cursor-pointer flex flex-wrap items-center gap-2">
                                                    {editingItem?.type === 'subTopic' && editingItem.id === `${la.name}__${st.name}` ? renderEditForm() : <span className="flex-grow min-w-0 break-words">{st.name}</span>}
                                                    {managementMode === 'global' && isDevUser && !editingItem && <div className="flex flex-shrink-0 flex-wrap items-center gap-1 sm:flex-nowrap"><button onClick={() => handleStartEditing('subTopic', `${la.name}__${st.name}`, st.name)} className="p-1 text-yellow-400 hover:text-yellow-300 text-lg">✏️</button><button onClick={() => handleDeleteItem('subTopic', `${la.name}__${st.name}`)} className="p-1 text-red-400 hover:text-red-300 text-lg">🗑️</button></div>}
                                                </summary>
                                                <div className="pl-4 pt-2 text-xs space-y-1 sm:text-sm">
                                                     {st.kazanımlar.map(k => (
                                                        <div key={k.id} className="flex flex-col gap-2 bg-slate-600/30 p-2 rounded sm:flex-row sm:items-start sm:justify-between">
                                                            {editingItem?.type === 'kazanim' && editingItem.id === `${la.name}__${st.name}__${k.id}` ? renderEditForm() : <span className="flex-1 min-w-0 break-words">{k.text}</span>}
                                                            {managementMode === 'global' && isDevUser && !editingItem && <div className="flex flex-shrink-0 flex-wrap items-center gap-1 sm:flex-nowrap"><button onClick={() => handleStartEditing('kazanim', `${la.name}__${st.name}__${k.id}`, k.text)} className="p-1 text-yellow-500 hover:text-yellow-400">✏️</button><button onClick={() => handleDeleteItem('kazanim', `${la.name}__${st.name}__${k.id}`)} className="p-1 text-red-500 hover:text-red-400">🗑️</button></div>}
                                                        </div>
                                                    ))}
                                                    {newItemForms.kazanim === st.name ? renderNewItemForm('kazanim', `${la.name}__${st.name}`, 'Kazanım metni') : (
                                                        <button onClick={() => setNewItemForms({ kazanim: st.name })} className="text-xs text-green-400 hover:text-green-300 w-full text-left p-1">+ Kazanım Ekle</button>
                                                    )}
                                                </div>
                                            </details>
                                        ))}
                                        {newItemForms.subTopic === la.name ? renderNewItemForm('subTopic', la.name, 'Alt Konu Adı') : (
                                             <button onClick={() => setNewItemForms({ subTopic: la.name })} className="mt-2 w-full text-left text-sm text-green-300 hover:text-green-200 sm:w-auto">+ Alt Konu Ekle</button>
                                        )}
                                    </div>
                                </details>
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                            <p>İçeriği görmek için bir sınıf seçin.</p>
                        </div>
                    )}
                </div>
            </div>
             {isDevUser && managementMode === 'global' && (
                <div className="mt-4">
                    <Button onClick={handleGenerateCodeForSave} variant="success" className="w-full !py-2 !text-base">
                        💾 Değişiklikleri Koda Kaydet
                    </Button>
                </div>
            )}
            <InfoModal
                isOpen={isSaveModalOpen}
                title="Global Müfredatı Güncelle"
                onClose={() => setIsSaveModalOpen(false)}
            >
                <div className="space-y-4">
                    <p className="text-yellow-300 bg-yellow-900/50 p-3 rounded-lg border border-yellow-700">
                        <strong>DİKKAT!</strong> Bu işlem kalıcıdır ve tüm kullanıcıları etkiler. Aşağıdaki kodu kopyalayıp
                        <code className="bg-slate-900 px-1 py-0.5 rounded mx-1">{filePathToSave}</code>
                        dosyasının içeriğiyle tamamen değiştirin.
                    </p>
                    <pre className="bg-slate-900 p-3 rounded-lg text-sm overflow-auto max-h-60 font-mono border border-slate-700">
                        <code>{codeToSave}</code>
                    </pre>
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                        <Button onClick={handleCopyCode} variant="primary" className="w-full">Kodu Kopyala</Button>
                        <Button onClick={() => setIsSaveModalOpen(false)} variant="secondary" className="w-full">Kapat</Button>
                    </div>
                </div>
            </InfoModal>
        </div>
    );
};
