import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LiveServerMessage, Modality, Blob } from '@google/genai';
import { ChatIcon, CloseIcon, SendIcon, UserIcon, AiIcon, MicrophoneIcon, ClipboardCheckIcon, SearchIcon } from './icons';
import { getAiResponse, ai, checkReferencesOnline, getAiResponseWithSearch } from '../services/geminiService';
import { ChatMessage } from '../types';
import { fullTextContext } from '../data/academicData';

// --- Audio Utility Functions ---
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

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
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
// --- End Audio Utility Functions ---

export const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [currentInputTranscription, setCurrentInputTranscription] = useState('');
    const [currentOutputTranscription, setCurrentOutputTranscription] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const outputSourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, currentInputTranscription, currentOutputTranscription]);
    
    const handleSend = useCallback(async () => {
        if (input.trim() === '' || isLoading || isRecording) return;
        
        const userMessage: ChatMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const aiResponseText = await getAiResponse(input);
        const aiMessage: ChatMessage = { sender: 'ai', text: aiResponseText };

        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
    }, [input, isLoading, isRecording]);

    const handleReferenceCheck = async () => {
        if (input.trim() === '' || isLoading || isRecording) return;
        
        const userMessageText = `**Reference Check Request:**\n${input}`;
        const userMessage: ChatMessage = { sender: 'user', text: userMessageText };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const result = await checkReferencesOnline(input);
        
        let aiResponseText = result.text;
        if (result.sources && result.sources.length > 0) {
            aiResponseText += '\n\n**Sources Found:**\n';
            const uniqueSources = new Map<string, string>();
            result.sources.forEach((chunk: any) => {
                if (chunk.web && chunk.web.uri && chunk.web.title) {
                    uniqueSources.set(chunk.web.uri, chunk.web.title);
                }
            });

            uniqueSources.forEach((title, uri) => {
                aiResponseText += `- [${title}](${uri})\n`;
            });
        }

        const aiMessage: ChatMessage = { sender: 'ai', text: aiResponseText };

        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
    };
    
    const handleOnlineSearch = async () => {
        if (input.trim() === '' || isLoading || isRecording) return;
        
        const userMessageText = `**Online Search Request:**\n${input}`;
        const userMessage: ChatMessage = { sender: 'user', text: userMessageText };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const result = await getAiResponseWithSearch(input);
        
        let aiResponseText = result.text;
        if (result.sources && result.sources.length > 0) {
            aiResponseText += '\n\n**Sources Found:**\n';
            const uniqueSources = new Map<string, string>();
            result.sources.forEach((chunk: any) => {
                if (chunk.web && chunk.web.uri && chunk.web.title) {
                    uniqueSources.set(chunk.web.uri, chunk.web.title);
                }
            });

            uniqueSources.forEach((title, uri) => {
                aiResponseText += `- [${title}](${uri})\n`;
            });
        }

        const aiMessage: ChatMessage = { sender: 'ai', text: aiResponseText };

        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
    };

    const toggleChat = () => setIsOpen(!isOpen);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    const cleanupLiveSession = useCallback(async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.onaudioprocess = null;
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (sourceNodeRef.current) {
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            await inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            await outputAudioContextRef.current.close();
        }
        setIsRecording(false);
    }, []);

    const stopLiveSession = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing session:", e);
            }
            sessionPromiseRef.current = null;
        }
        await cleanupLiveSession();
    }, [cleanupLiveSession]);
    
    const startLiveSession = useCallback(async () => {
        setIsRecording(true);
        setCurrentInputTranscription('');
        setCurrentOutputTranscription('');

        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            outputSourcesRef.current.clear();
            
            let turnInput = '';
            let turnOutput = '';

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: fullTextContext,
                },
                callbacks: {
                    onopen: () => {
                        sourceNodeRef.current = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
                        scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        sourceNodeRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.addEventListener('ended', () => outputSourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            outputSourcesRef.current.add(source);
                        }
                        
                        if (message.serverContent?.inputTranscription) {
                            turnInput += message.serverContent.inputTranscription.text;
                            setCurrentInputTranscription(turnInput);
                        }
                        if (message.serverContent?.outputTranscription) {
                            turnOutput += message.serverContent.outputTranscription.text;
                            setCurrentOutputTranscription(turnOutput);
                        }
                        if (message.serverContent?.turnComplete) {
                            const finalInput = turnInput;
                            const finalOutput = turnOutput;

                            if (finalInput || finalOutput) {
                                setMessages(prev => {
                                    const newMessages: ChatMessage[] = [];
                                    if (finalInput) newMessages.push({ sender: 'user', text: finalInput });
                                    if (finalOutput) newMessages.push({ sender: 'ai', text: finalOutput });
                                    return [...prev, ...newMessages];
                                });
                            }
                            
                            setCurrentInputTranscription('');
                            setCurrentOutputTranscription('');
                            turnInput = '';
                            turnOutput = '';
                        }
                        if (message.serverContent?.interrupted) {
                            for (const source of outputSourcesRef.current.values()) {
                                source.stop();
                                outputSourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        stopLiveSession();
                    },
                    onclose: (e: CloseEvent) => {
                        cleanupLiveSession();
                    },
                }
            });

        } catch (error) {
            console.error("Failed to start voice session:", error);
            alert("Could not start voice session. Please ensure you have granted microphone permissions.");
            setIsRecording(false);
        }
    }, [stopLiveSession, cleanupLiveSession]);

    const handleToggleRecording = useCallback(() => {
        if (isRecording) {
            stopLiveSession();
        } else {
            startLiveSession();
        }
    }, [isRecording, startLiveSession, stopLiveSession]);

    const renderMessage = (msg: ChatMessage, index: number | string, isLive: boolean = false) => {
        const formattedText = msg.text
            .replace(/\n/g, '<br />')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');

        return (
            <div key={index} className={`flex items-start gap-3 my-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} ${isLive ? 'opacity-70' : ''}`}>
                {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><AiIcon className="w-5 h-5 text-blue-600" /></div>}
                <div className={`max-w-xs md:max-w-sm rounded-lg p-3 ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: formattedText }}></p>
                </div>
                {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><UserIcon className="w-5 h-5 text-gray-600" /></div>}
            </div>
        );
    };

    return (
        <>
            <button
                onClick={toggleChat}
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-transform transform hover:scale-110"
                aria-label="Toggle Chatbot"
            >
                {isOpen ? <CloseIcon className="w-6 h-6" /> : <ChatIcon className="w-6 h-6" />}
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-full max-w-md h-[70vh] max-h-[600px] bg-white rounded-lg shadow-2xl flex flex-col transition-all duration-300 ease-in-out origin-bottom-right transform scale-100 opacity-100">
                    <header className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                        <h2 className="text-lg font-semibold">AI Writing Assistant</h2>
                    </header>
                    <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
                        {messages.length === 0 && !isRecording && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <ChatIcon className="w-16 h-16 mb-4"/>
                                <p className="text-center">Ask me anything about academic writing, or use the microphone to start a voice conversation!</p>
                            </div>
                        )}
                        {messages.map((msg, i) => renderMessage(msg, i))}
                        {currentInputTranscription && renderMessage({ sender: 'user', text: currentInputTranscription }, 'live-input', true)}
                        {currentOutputTranscription && renderMessage({ sender: 'ai', text: currentOutputTranscription }, 'live-output', true)}

                         {isLoading && (
                            <div className="flex items-start gap-3 my-4 justify-start">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><AiIcon className="w-5 h-5 text-blue-600" /></div>
                                <div className="max-w-xs md:max-w-sm rounded-lg p-3 bg-white text-gray-800 border border-gray-200 rounded-bl-none">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </main>
                    <footer className="border-t p-4 bg-white rounded-b-lg">
                        <div className="flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={isRecording ? "Listening..." : "Type your question..."}
                                className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                disabled={isLoading || isRecording}
                            />
                            <button onClick={handleSend} disabled={isLoading || isRecording || !input.trim()} className="ml-2 inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300" title="Send message">
                                <SendIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={handleReferenceCheck} disabled={isLoading || isRecording || !input.trim()} className="ml-2 inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300" title="Check References Online">
                                <ClipboardCheckIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={handleOnlineSearch} disabled={isLoading || isRecording || !input.trim()} className="ml-2 inline-flex items-center justify-center rounded-md border border-transparent bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-purple-300" title="Search Online">
                                <SearchIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={handleToggleRecording} disabled={isLoading} className={`ml-2 inline-flex items-center justify-center rounded-full h-9 w-9 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`} title={isRecording ? 'Stop recording' : 'Start voice conversation'}>
                                <MicrophoneIcon className="w-5 h-5 text-white"/>
                            </button>
                        </div>
                    </footer>
                </div>
            )}
        </>
    );
};