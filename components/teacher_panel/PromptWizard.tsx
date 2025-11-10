import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button, LoadingSpinner } from '../UI';
import { generatePromptFromExample, generatePromptFromImageExample } from '../../services/geminiService';
import { useToast } from '../Toast';

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


export const PromptWizard: React.FC = () => {
  const [wizardTab, setWizardTab] = useState<'text' | 'image'>('text');
  const [sampleQuestion, setSampleQuestion] = useState('');
  const [uploadedImage, setUploadedImage] = useState<{ name: string; content: { mimeType: string; data: string } } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('Şablonu Kopyala');
  const { showToast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const content = await fileToBase64(file);
      setUploadedImage({ name: file.name, content });
      handleGenerate(null, { name: file.name, content });
    } catch (err) {
      setError('Görsel işlenirken hata oluştu.');
      showToast('Görsel işlenirken hata oluştu.', 'error');
    } finally {
        setIsLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif'] },
    multiple: false
  });


  const handleGenerate = async (e?: React.MouseEvent, imageFile?: { name: string; content: { mimeType: string; data: string } }) => {
    e?.preventDefault();
    
    setIsLoading(true);
    setError('');
    setGeneratedPrompt('');

    try {
        let prompt = '';
        if (wizardTab === 'text') {
            if (!sampleQuestion.trim()) {
                setError('Lütfen analiz edilecek bir soru metni girin.');
                setIsLoading(false);
                return;
            }
            // FIX: Pass placeholder arguments for kazanımId and kazanımText as required by the function signature.
            prompt = await generatePromptFromExample(sampleQuestion, '[KAZANIM_ID_YAZINIZ]', '[KAZANIM_METNI_YAZINIZ]');
        } else {
            const imageToProcess = imageFile || uploadedImage;
            if (!imageToProcess) {
                 setError('Lütfen analiz edilecek bir görsel yükleyin.');
                 setIsLoading(false);
                 return;
            }
            // FIX: Pass placeholder arguments for kazanımId and kazanımText as required by the function signature.
            prompt = await generatePromptFromImageExample(imageToProcess.content, '[KAZANIM_ID_YAZINIZ]', '[KAZANIM_METNI_YAZINIZ]');
        }
      setGeneratedPrompt(prompt);
    } catch (err: any) {
      setError(err.message || 'Prompt üretilirken bir hata oluştu.');
      showToast('Prompt üretilirken bir hata oluştu.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopy = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt).then(() => {
        setCopyButtonText('✅ Kopyalandı!');
        setTimeout(() => setCopyButtonText('Şablonu Kopyala'), 2000);
    }, () => {
        setCopyButtonText('Hata!');
        showToast('Panoya kopyalanamadı.', 'error');
    });
  };

  return (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-violet-500/30 space-y-4">
      <h3 className="text-xl font-bold text-violet-300">AI Prompt Geliştirme Asistanı</h3>
      <p className="text-sm text-slate-400">
        Örnek bir soru metni veya görseli ile, yapay zekanın benzer formatta sorular üretmesi için özel bir prompt şablonu oluşturun.
      </p>

      <div className="flex bg-slate-700/50 p-1 rounded-lg gap-1">
        <button onClick={() => setWizardTab('text')} className={`w-1/2 p-2 rounded text-sm font-semibold transition-colors ${wizardTab === 'text' ? 'bg-violet-600' : 'hover:bg-slate-600'}`}>Metinden Üret</button>
        <button onClick={() => setWizardTab('image')} className={`w-1/2 p-2 rounded text-sm font-semibold transition-colors ${wizardTab === 'image' ? 'bg-violet-600' : 'hover:bg-slate-600'}`}>Görselden Üret</button>
      </div>
      
      {wizardTab === 'text' ? (
        <textarea
            value={sampleQuestion}
            onChange={(e) => setSampleQuestion(e.target.value)}
            placeholder="Örnek soru metnini buraya yapıştırın..."
            className="w-full h-32 p-2 bg-slate-700 rounded-md border border-slate-600 text-sm resize-y"
        />
      ) : (
        <div {...getRootProps()} className={`w-full h-32 p-2 rounded-md border-2 border-dashed flex items-center justify-center text-center cursor-pointer transition-colors ${isDragActive ? 'border-violet-400 bg-violet-900/50' : 'border-slate-600 hover:border-violet-500'}`}>
            <input {...getInputProps()} />
            {isLoading ? <LoadingSpinner /> : uploadedImage ? <p className="text-sm text-green-300">{uploadedImage.name} yüklendi. Analiz için butona tıklayın.</p> : <p>Analiz için bir soru görseli sürükleyin veya seçin</p>}
        </div>
      )}

      <Button onClick={handleGenerate} disabled={isLoading} variant="violet" className="w-full !py-2 !text-base">
        {isLoading ? 'Analiz Ediliyor...' : wizardTab === 'text' ? '🤖 Metni Analiz Et' : '🖼️ Görseli Analiz Et'}
      </Button>
      
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      
      {generatedPrompt && (
        <div className="space-y-4 animate-fadeIn">
          <h4 className="text-lg font-semibold text-teal-300">Üretilen Prompt Şablonu:</h4>
          <pre className="bg-slate-900 p-4 rounded-lg text-sm overflow-auto max-h-80 font-mono border border-slate-700">
            <code>{generatedPrompt}</code>
          </pre>
          <Button onClick={handleCopy} variant="primary" className="w-full !py-2 !text-base">{copyButtonText}</Button>
        </div>
      )}
    </div>
  );
};