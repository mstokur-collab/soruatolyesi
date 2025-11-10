import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob } from '@google/genai';
import type { QuizQuestion } from '../types';
import { useGame, useData } from '../contexts/AppContext';
import { LoadingSpinner, Button, Modal } from './UI';
import { useToast } from '../components/Toast';

// --- Audio Helper Functions ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): GenaiBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const SYSTEM_INSTRUCTION = `You are a friendly and encouraging quiz master for an English language learner. Your task is to conduct a multiple-choice voice quiz.
You can speak both Turkish and English based on the user's interaction.
Follow these steps strictly:
1. I will provide you with the question data in a block starting with [QUESTION]. This block contains the question, four options (A, B, C, D), the correct answer, and an explanation.
2. Read the question and all four options aloud clearly. For example, say "Question 1. What is the capital of Turkey? A, Ankara. B, Istanbul...".
3. After reading the options, stop and wait for the user to answer.
4. The user will say a letter (A, B, C, or D) or the full option text. They might speak Turkish or English.
5. I will send you the user's answer in a block starting with [FEEDBACK].
6. Based on the feedback, you will tell the user if they were correct or incorrect.
   - If correct, say something like "That's correct! Well done."
   - If incorrect, say "Sorry, that's not right." and then read the provided explanation.
7. After giving feedback, ask "Are you ready for the next question?". Wait for the user to say "yes" or a similar affirmative response.
8. When the user confirms they are ready, I will send you the next question. Do not proceed until you hear an affirmative response.
Do not say anything else or deviate from this script.`;


type GameStatus = 'initializing' | 'requesting_mic' | 'connecting' | 'asking_question' | 'waiting_for_answer' | 'processing_answer' | 'giving_feedback' | 'waiting_for_continue' | 'game_over' | 'error';

const VoiceGameScreen: React.FC = () => {
    const navigate = useNavigate();
    const { gameQuestions, handleGameEnd } = useGame();
    const { handleQuestionAnswered, setAiCredits, isGlobalQuestionsLoading } = useData();
    const { showToast } = useToast();
    
    const [status, setStatus] = useState<GameStatus>('initializing');
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [userTranscript, setUserTranscript] = useState('');
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [answerState, setAnswerState] = useState<{ selected: string, isCorrect: boolean } | null>(null);

    // FIX: Defensively filter for 'quiz' type questions within the component.
    // This makes the component more robust against context timing issues and ensures it only works with suitable questions.
    const questions = useMemo(() => gameQuestions.filter(q => q.type === 'quiz') as QuizQuestion[], [gameQuestions]);

    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioQueueRef = useRef(new Set<AudioBufferSourceNode>());
    const currentInputTranscriptionRef = useRef('');
    const sessionStarted = useRef(false);
    const sessionStartTimeRef = useRef<number | null>(null);
    const CREDITS_PER_MINUTE = 10;

    const currentQuestion = questions[questionIndex];

    const cleanup = useCallback(() => {
        console.log("Cleaning up resources...");
        if (sessionStartTimeRef.current) {
            const endTime = Date.now();
            const durationInSeconds = (endTime - sessionStartTimeRef.current) / 1000;
            const durationInMinutes = Math.ceil(durationInSeconds / 60);
            const creditsToDeduct = Math.max(1, durationInMinutes * CREDITS_PER_MINUTE); 

            setAiCredits(prev => {
                const newCredits = Math.max(0, (Number(prev) || 0) - creditsToDeduct);
                showToast(`Sesli alıştırma için ${creditsToDeduct} kredi kullanıldı. Kalan: ${newCredits}`, 'info');
                return newCredits;
            });
            sessionStartTimeRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then((session: any) => {
                if (session) {
                    console.log("Session closed.");
                    session.close();
                }
            }).catch((e:any) => console.error("Error closing session:", e));
            sessionPromiseRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => console.error("Error closing AudioContext:", e));
        }
        audioQueueRef.current.forEach(source => {
            try {
              source.stop();
            } catch(e) { /* Ignore errors */ }
        });
        audioQueueRef.current.clear();
        sessionStarted.current = false;
    }, [setAiCredits, showToast]);

    const finishGame = useCallback(() => {
        cleanup();
        setStatus('game_over');
        handleGameEnd(score);
    }, [cleanup, score, handleGameEnd]);
    
    const processUserAnswer = useCallback((transcript: string) => {
        if (!currentQuestion || answerState) return;
    
        const normalizedTranscript = transcript.toLowerCase().trim();
        let selectedOption: string | null = null;
        
        const optionMap: { [key: string]: number } = { a: 0, b: 1, c: 2, d: 3 };
    
        const singleLetterMatch = normalizedTranscript.match(/^(a|b|c|d)$/);
        const optionLetterMatch = normalizedTranscript.match(/^option ([a-d])$/);
        const turkishLetterMatch = normalizedTranscript.match(/^(be|ce)$/);
        const englishLetterMatch = normalizedTranscript.match(/^(see|sea)$/);
        
        if (singleLetterMatch) {
            selectedOption = currentQuestion.options[optionMap[singleLetterMatch[1]]];
        } else if (optionLetterMatch) {
            selectedOption = currentQuestion.options[optionMap[optionLetterMatch[1]]];
        } else if (turkishLetterMatch) {
            if (turkishLetterMatch[1] === 'be') selectedOption = currentQuestion.options[1];
            else if (turkishLetterMatch[1] === 'ce') selectedOption = currentQuestion.options[2];
        } else if (englishLetterMatch) {
             selectedOption = currentQuestion.options[2];
        } else {
            for (const option of currentQuestion.options) {
                if (normalizedTranscript.includes(option.toLowerCase())) {
                    selectedOption = option;
                    break;
                }
            }
        }
        
        if (selectedOption) {
            setStatus('processing_answer');
            const isCorrect = selectedOption === currentQuestion.answer;
            
            setAnswerState({ selected: selectedOption, isCorrect });
            handleQuestionAnswered(currentQuestion, isCorrect);
            if (isCorrect) setScore(s => s + 10);
    
            const feedbackPrompt = `[FEEDBACK] The user's answer was '${selectedOption}'. This is ${isCorrect ? 'correct' : 'incorrect'}.`;
            
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session: any) => {
                    session.sendRealtimeInput({ text: feedbackPrompt });
                });
            }
            setStatus('giving_feedback');
        }
    
    }, [currentQuestion, answerState, handleQuestionAnswered]);

    const processContinue = useCallback((transcript: string) => {
        const normalized = transcript.toLowerCase();
        if (normalized.includes('yes') || normalized.includes('ready') || normalized.includes('ok') || normalized.includes('next') || normalized.includes('continue')) {
            const nextIndex = questionIndex + 1;
            if (nextIndex < questions.length) {
                setQuestionIndex(nextIndex);
            } else {
                finishGame();
            }
        }
    }, [questionIndex, questions, finishGame]);

    const askQuestion = useCallback((index: number) => {
        const question = questions[index];
        if (!question) {
            finishGame();
            return;
        }
        
        setAnswerState(null);
        setUserTranscript('');

        const prompt = `[QUESTION]\nQuestion: ${question.question}\nA: ${question.options[0]}\nB: ${question.options[1]}\nC: ${question.options[2]}\nD: ${question.options[3]}\nCorrect Answer: ${question.answer}\nExplanation: ${question.explanation || 'No explanation available.'}`;

        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then((session: any) => {
                session.sendRealtimeInput({ text: prompt });
                setStatus('asking_question');
            });
        }
    }, [questions, finishGame]);

    useEffect(() => {
        if(questionIndex > 0) {
            askQuestion(questionIndex);
        }
    }, [questionIndex, askQuestion]);


    useEffect(() => {
        if (!isGlobalQuestionsLoading && questions.length === 0 && !sessionStarted.current) {
            setError('Sesli alıştırma için bu konuda çoktan seçmeli soru bulunamadı.');
            setStatus('error');
            return;
        }

        if (questions.length === 0 || sessionStarted.current) {
            return;
        }
        sessionStarted.current = true;

        if (!aiRef.current) {
            aiRef.current = new GoogleGenAI({ apiKey: (globalThis as any).process?.env?.API_KEY });
        }
        const ai = aiRef.current;

        async function setupAndStart() {
            try {
                setStatus('requesting_mic');
                streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

                setStatus('connecting');
                const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                audioContextRef.current = outputAudioContext;

                const sessionPromise = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    callbacks: {
                        onopen: () => {
                            const source = inputAudioContext.createMediaStreamSource(streamRef.current!);
                            const processor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                            scriptProcessorRef.current = processor;
                            
                            processor.onaudioprocess = (e) => {
                                const inputData = e.inputBuffer.getChannelData(0);
                                const pcmBlob = createBlob(inputData);
                                sessionPromise.then((s: any) => s.sendRealtimeInput({ media: pcmBlob }));
                            };
                            source.connect(processor);
                            processor.connect(inputAudioContext.destination);
                        },
                        onmessage: async (msg: LiveServerMessage) => {
                            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                            if (audioData) {
                                try {
                                    const decoded = decode(audioData);
                                    const buffer = await decodeAudioData(decoded, outputAudioContext, 24000, 1);
                                    const source = outputAudioContext.createBufferSource();
                                    source.buffer = buffer;
                                    source.connect(outputAudioContext.destination);
                                    
                                    const currentTime = outputAudioContext.currentTime;
                                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
                                    source.start(nextStartTimeRef.current);
                                    nextStartTimeRef.current += buffer.duration;
                                    audioQueueRef.current.add(source);
                                    source.onended = () => audioQueueRef.current.delete(source);
                                } catch (e) { console.error("Error processing audio:", e); }
                            }

                            if (msg.serverContent?.inputTranscription) {
                                const text = msg.serverContent.inputTranscription.text;
                                currentInputTranscriptionRef.current += text;
                                setUserTranscript(currentInputTranscriptionRef.current);
                            }
                            
                             if (msg.serverContent?.turnComplete) {
                                const fullTranscript = currentInputTranscriptionRef.current;
                                currentInputTranscriptionRef.current = '';
                                
                                setStatus(prevStatus => {
                                    if (prevStatus === 'processing_answer') return 'giving_feedback';
                                    if (prevStatus === 'waiting_for_answer') {
                                        processUserAnswer(fullTranscript);
                                        return 'processing_answer';
                                    }
                                    if (prevStatus === 'waiting_for_continue') {
                                        processContinue(fullTranscript);
                                        return prevStatus; 
                                    }
                                    if (prevStatus === 'asking_question') return 'waiting_for_answer';
                                    if (prevStatus === 'giving_feedback') return 'waiting_for_continue';
                                    return prevStatus;
                                });
                            }
                        },
                        onclose: () => console.log('Session closed.'),
                        onerror: (e) => {
                            console.error('Session error:', e);
                            setError('Bağlantı hatası oluştu. Lütfen sayfayı yenileyin.');
                            setStatus('error');
                            cleanup();
                        }
                    },
                    config: {
                        responseModalities: [Modality.AUDIO],
                        inputAudioTranscription: {},
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' }}},
                        systemInstruction: SYSTEM_INSTRUCTION,
                    }
                });
                
                sessionPromiseRef.current = sessionPromise;
                const session = await sessionPromise;
                sessionStartTimeRef.current = Date.now();
                
                askQuestion(0);

            } catch (err) {
                console.error(err);
                if ((err as Error).name === 'NotAllowedError') {
                    setError('Mikrofon erişimine izin vermeniz gerekiyor.');
                } else {
                    setError('Oturum başlatılamadı. Cihazınız desteklenmiyor olabilir.');
                }
                setStatus('error');
                cleanup();
            }
        }

        setupAndStart();
        return cleanup;
    }, [questions, isGlobalQuestionsLoading, cleanup, askQuestion, processContinue, processUserAnswer]);

    const goToNextQuestion = () => {
        if (questionIndex < questions.length - 1) {
            setQuestionIndex(prevIndex => prevIndex + 1);
        } else {
            finishGame();
        }
    };

    const goToPreviousQuestion = () => {
        if (questionIndex > 0) {
            setQuestionIndex(prevIndex => prevIndex - 1);
        }
    };

    const StatusIndicator: React.FC = () => {
        const messages: Record<GameStatus, { text: string; icon: string }> = {
            initializing: { text: "Hazırlanıyor...", icon: "⚙️" },
            requesting_mic: { text: "Mikrofon izni bekleniyor...", icon: "🎤" },
            connecting: { text: "Yapay zekaya bağlanılıyor...", icon: "☁️" },
            asking_question: { text: "Soru soruluyor...", icon: "🤖" },
            waiting_for_answer: { text: "Cevabınız bekleniyor...", icon: "🎤" },
            processing_answer: { text: "Cevap işleniyor...", icon: "🤔" },
            giving_feedback: { text: "Geri bildirim veriliyor...", icon: "🤖" },
            waiting_for_continue: { text: "Devam etmeniz bekleniyor...", icon: "👍" },
            game_over: { text: "Oyun Bitti!", icon: "🎉" },
            error: { text: "Hata!", icon: "❌" },
        };
        const { text, icon } = messages[status] || messages.initializing;
        const isListening = status === 'waiting_for_answer' || status === 'waiting_for_continue';
        
        return (
            <div className="flex items-center justify-center gap-4 p-4 bg-slate-900/50 rounded-lg">
                <div className={`text-4xl ${isListening ? 'animate-pulse' : ''}`}>{icon}</div>
                <p className="text-xl font-semibold text-slate-200">{text}</p>
            </div>
        );
    }

    if (isGlobalQuestionsLoading || (status === 'initializing' && questions.length === 0)) {
        return (
            <div className="w-full h-full flex flex-col justify-center items-center bg-teal-900">
                <LoadingSpinner />
                <p className="mt-4 text-xl text-slate-300">Sesli Alıştırma hazırlanıyor...</p>
            </div>
        );
    }
    
     if (status === 'error') {
        return (
            <div className="w-full h-full flex flex-col justify-center items-center bg-teal-900 text-center p-8">
                <h2 className="text-3xl font-bold text-red-400 mb-4">Bir Sorun Oluştu</h2>
                <p className="text-lg text-slate-300 mb-8">{error}</p>
                <Button onClick={() => navigate('/ders-sec')}>Ana Menüye Dön</Button>
            </div>
        );
    }

    if (status === 'game_over') {
        return (
            <div className="w-full h-full flex flex-col justify-center items-center text-center p-6 bg-teal-900">
                <h1 className="text-6xl font-extrabold text-yellow-400 mb-8 animate-fadeIn">Alıştırma Bitti!</h1>
                <div className="text-3xl font-bold mb-10 text-white">
                    Skorun: <span className="text-4xl">{score}</span>
                </div>
                <Button onClick={() => navigate('/ders-sec')} variant="primary">Harika!</Button>
            </div>
        )
    }

    if (!currentQuestion) {
        return (
            <div className="w-full h-full flex flex-col justify-center items-center bg-teal-900">
                <LoadingSpinner />
                <p className="mt-4 text-xl text-slate-300">Sorular ayarlanıyor...</p>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col p-4 sm:p-6 bg-teal-900 text-white gap-4">
             <header className="flex-shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Button onClick={() => setShowQuitConfirm(true)} variant="secondary" className="!py-2 !px-4 !text-base">Çık</Button>
                    <button onClick={goToPreviousQuestion} disabled={questionIndex === 0} className="nav-btn">Önceki Soru</button>
                </div>
                 <div className="text-center">
                    <p className="text-lg">Skor: <span className="font-bold text-2xl text-yellow-400">{score}</span></p>
                    <p className="text-sm text-slate-300">Soru: {questionIndex + 1} / {questions.length}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={goToNextQuestion} className="nav-btn">Sonraki Soru</button>
                 </div>
            </header>

            <main className="flex-grow bg-slate-900 rounded-xl p-4 sm:p-6 border border-indigo-500/30 flex flex-col gap-4">
                <div className="flex-shrink-0 text-center">
                    <StatusIndicator />
                </div>

                <div className="flex-grow w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center">
                    <p className="text-2xl sm:text-3xl font-semibold">{currentQuestion.question}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {currentQuestion.options.map((opt, index) => {
                        const letter = String.fromCharCode(65 + index);
                        let optionClass = 'bg-gradient-to-b from-teal-600 to-teal-800 border-teal-700';
                        if (answerState) {
                           if (opt === currentQuestion.answer) {
                               optionClass = 'bg-green-600/80 border-green-500';
                           } else if (opt === answerState.selected) {
                               optionClass = 'bg-red-600/80 border-red-500';
                           } else {
                               optionClass = 'bg-slate-800/50 border-slate-700 opacity-50';
                           }
                        }
                        return (
                            <div key={index} className={`p-4 rounded-lg border text-lg transition-all duration-300 ${optionClass}`}>
                                <span className="font-bold mr-2">{letter})</span>
                                <span>{opt}</span>
                            </div>
                        );
                    })}
                </div>
            </main>

            <footer className="flex-shrink-0 flex justify-between items-center gap-4">
                 <div className="flex-grow p-3 bg-slate-900 rounded-lg text-slate-300 italic min-h-[48px] border border-slate-700/50">
                    {userTranscript}
                 </div>
            </footer>

            <Modal
                isOpen={showQuitConfirm}
                title="Alıştırmadan Çık"
                message="Mevcut alıştırmadan çıkmak istediğinizden emin misiniz? İlerlemeniz kaydedilmeyecek."
                onConfirm={() => {
                    cleanup();
                    navigate('/ders-sec');
                }}
                onCancel={() => setShowQuitConfirm(false)}
            />
        </div>
    );
};

export default VoiceGameScreen;