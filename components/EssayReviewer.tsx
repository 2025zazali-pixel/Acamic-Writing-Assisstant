import React, { useState, useEffect } from 'react';
import { essayMarkingScheme, commonEssayTypes, thesisMarkingScheme } from '../data/academicData';
import { getAiEssayReview, getAiThesisChapterReview } from '../services/geminiService';
import { ReviewFeedback } from '../types';
import { EssayReviewerIcon, WarningIcon, SaveIcon, UploadIcon, LightBulbIcon } from './icons';
import { FileUpload } from './FileUpload';

// A simple markdown-to-html renderer
const renderMarkdown = (text: string) => {
    if (!text) return '';
    return text
        .replace(/\n/g, '<br />')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>');
};

const exampleEssayData = commonEssayTypes.find(e => e.type === 'Argumentative / persuasive');
const exampleEssayText = exampleEssayData?.exampleEssay.text ?? '';
const exampleEssayType = exampleEssayData?.type ?? essayMarkingScheme[0].items[0].type;


export const EssayReviewer: React.FC = () => {
    // FIX: Moved derived constants before their use to resolve declaration error.
    const undergraduateEssayTypes = essayMarkingScheme.find(s => s.level === 'Undergraduate')?.items || [];
    const mastersEssayTypes = essayMarkingScheme.find(s => s.level === 'Master’s')?.items || [];
    const thesisLevels = thesisMarkingScheme.map(s => s.level);
    
    const [reviewMode, setReviewMode] = useState<'essay' | 'thesis'>('essay');
    const [essayText, setEssayText] = useState('');
    
    // Essay states
    const [selectedEssayLevel, setSelectedEssayLevel] = useState<'Undergraduate' | 'Master’s'>('Undergraduate');
    const [selectedEssayType, setSelectedEssayType] = useState(undergraduateEssayTypes[0]?.type || '');

    // Thesis states
    const [selectedThesisLevel, setSelectedThesisLevel] = useState('Undergraduate');
    const [selectedThesisChapter, setSelectedThesisChapter] = useState(thesisMarkingScheme.find(s => s.level === 'Undergraduate')?.items[0].chapter || '');
    
    // Generic states
    const [feedback, setFeedback] = useState<ReviewFeedback | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [highlightedQuote, setHighlightedQuote] = useState<string | null>(null);


    // Draft states
    const [isDraftSaved, setIsDraftSaved] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

    const availableChapters = thesisMarkingScheme.find(s => s.level === selectedThesisLevel)?.items || [];

    // Check for saved draft on component mount
    useEffect(() => {
        const savedDraft = localStorage.getItem('essayReviewerDraft');
        if (savedDraft) {
            setIsDraftSaved(true);
        }
    }, []);

    // When essay level changes, update the selected essay type to the first in the new list
    useEffect(() => {
        if (reviewMode === 'essay') {
            if (selectedEssayLevel === 'Undergraduate') {
                setSelectedEssayType(undergraduateEssayTypes[0]?.type || '');
            } else {
                setSelectedEssayType(mastersEssayTypes[0]?.type || '');
            }
        }
    }, [selectedEssayLevel, reviewMode, undergraduateEssayTypes, mastersEssayTypes]);

    // When thesis level changes, update the selected chapter
    useEffect(() => {
        if (reviewMode === 'thesis') {
            const chapters = thesisMarkingScheme.find(s => s.level === selectedThesisLevel)?.items || [];
            setSelectedThesisChapter(chapters[0]?.chapter || '');
        }
    }, [selectedThesisLevel, reviewMode]);

     // Reset feedback when review mode changes, but keep user's text
    useEffect(() => {
        setFeedback(null);
        setError(null);
    }, [reviewMode]);


    const handleReview = async () => {
        if (!essayText.trim()) {
            setError('Please provide some text by typing, pasting, or uploading a file.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setFeedback(null);

        try {
            let result;
            if (reviewMode === 'essay') {
                result = await getAiEssayReview(essayText, selectedEssayType, selectedEssayLevel);
            } else {
                result = await getAiThesisChapterReview(essayText, selectedThesisLevel, selectedThesisChapter);
            }
            setFeedback(result);
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleLoadExample = () => {
        setReviewMode('essay');
        setSelectedEssayLevel('Undergraduate');
        setSelectedEssayType(exampleEssayType);
        setEssayText(exampleEssayText);
        setFeedback(null);
        setError(null);
    };

    const handleSaveDraft = () => {
        const draft = {
            reviewMode,
            essayText,
            selectedEssayLevel,
            selectedEssayType,
            selectedThesisLevel,
            selectedThesisChapter,
        };
        localStorage.setItem('essayReviewerDraft', JSON.stringify(draft));
        setIsDraftSaved(true);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const handleLoadDraft = () => {
        const savedDraftJSON = localStorage.getItem('essayReviewerDraft');
        if (savedDraftJSON) {
            const savedDraft = JSON.parse(savedDraftJSON);
            setReviewMode(savedDraft.reviewMode);
            setEssayText(savedDraft.essayText);
            setSelectedEssayLevel(savedDraft.selectedEssayLevel);
            setSelectedEssayType(savedDraft.selectedEssayType);
            setSelectedThesisLevel(savedDraft.selectedThesisLevel);
            setSelectedThesisChapter(savedDraft.selectedThesisChapter);
        }
    };

    const renderHighlightedText = (text: string, quote: string | null) => {
        if (!quote || !text.includes(quote)) {
            return <p className="whitespace-pre-wrap">{text}</p>;
        }
        
        // Use regex to split and keep the delimiter
        const parts = text.split(new RegExp(`(${quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'));

        return (
            <p className="whitespace-pre-wrap">
                {parts.map((part, index) =>
                    part === quote ? (
                        <mark key={index} className="bg-yellow-200 rounded px-1 py-0.5 transition-all duration-300 ease-in-out">
                            {part}
                        </mark>
                    ) : (
                        <span key={index}>{part}</span>
                    )
                )}
            </p>
        );
    };

    let penaltyTriggersText: string | undefined = '';
    let currentSelectionTitle = '';
    if (reviewMode === 'essay') {
        const scheme = essayMarkingScheme.find(s => s.level === selectedEssayLevel);
        penaltyTriggersText = scheme?.items.find(item => item.type === selectedEssayType)?.penaltyTriggers;
        currentSelectionTitle = `${selectedEssayType} (${selectedEssayLevel})`;
    } else {
        const scheme = thesisMarkingScheme.find(s => s.level === selectedThesisLevel);
        penaltyTriggersText = scheme?.items.find(item => item.chapter === selectedThesisChapter)?.penaltyTriggers;
        currentSelectionTitle = `${selectedThesisChapter} (${selectedThesisLevel} Thesis)`;
    }


    return (
        <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
            <header className="mb-6 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-800">AI-Powered Academic Writing Reviewer</h2>
                <p className="text-gray-600 mt-1">Get instant, rubric-based feedback on your essays or thesis chapters.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
                {/* Input Column */}
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                     <div className="flex justify-between items-center mb-4">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button onClick={() => setReviewMode('essay')} className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${reviewMode === 'essay' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}>Review Essay</button>
                            <button onClick={() => setReviewMode('thesis')} className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${reviewMode === 'thesis' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}>Review Thesis</button>
                        </div>
                         <div className="flex items-center gap-4">
                            <button 
                                onClick={handleLoadExample}
                                className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-3 py-1 rounded-md hover:bg-blue-50"
                                aria-label="Load example essay"
                            >
                                <LightBulbIcon className="w-4 h-4 mr-2" />
                                Load Example
                            </button>
                            {isDraftSaved && (
                                <button 
                                    onClick={handleLoadDraft}
                                    className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-3 py-1 rounded-md hover:bg-blue-50"
                                    aria-label="Load saved draft"
                                >
                                    <UploadIcon className="w-4 h-4 mr-2" />
                                    Load Draft
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {reviewMode === 'essay' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="essayLevel" className="block text-sm font-medium text-gray-700 mb-1">Academic Level</label>
                                <select id="essayLevel" value={selectedEssayLevel} onChange={e => setSelectedEssayLevel(e.target.value as 'Undergraduate' | 'Master’s')} className="w-full text-sm border-gray-300 rounded-md">
                                    <option value="Undergraduate">Undergraduate</option>
                                    <option value="Master’s">Master’s</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="essayType" className="block text-sm font-medium text-gray-700 mb-1">Essay Type</label>
                                <select id="essayType" value={selectedEssayType} onChange={e => setSelectedEssayType(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                                    {(selectedEssayLevel === 'Undergraduate' ? undergraduateEssayTypes : mastersEssayTypes).map(item => (
                                        <option key={item.type} value={item.type}>{item.type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="thesisLevel" className="block text-sm font-medium text-gray-700 mb-1">Thesis Level</label>
                                <select id="thesisLevel" value={selectedThesisLevel} onChange={e => setSelectedThesisLevel(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                                    {thesisLevels.map(level => <option key={level} value={level}>{level}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="thesisChapter" className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                                <select id="thesisChapter" value={selectedThesisChapter} onChange={e => setSelectedThesisChapter(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                                    {availableChapters.map(item => <option key={item.chapter} value={item.chapter}>{item.chapter}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 flex-1 flex flex-col">
                        <div className="flex-shrink-0">
                            <FileUpload onTextExtracted={setEssayText} setParentError={setError} />
                        </div>
                        <label htmlFor="essayText" className="block text-sm font-medium text-gray-700 mb-2 sr-only">
                           Your text
                        </label>
                        <textarea
                            id="essayText"
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md flex-1"
                            placeholder="Your text will appear here after uploading a file, or you can type/paste directly..."
                            value={essayText}
                            onChange={(e) => setEssayText(e.target.value)}
                        />
                    </div>
                     <div className="mt-6 flex items-center gap-4">
                        <button
                            onClick={handleSaveDraft}
                            disabled={!essayText.trim() || saveStatus !== 'idle'}
                            className="w-auto inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                            <SaveIcon className="w-5 h-5 mr-2" />
                            {saveStatus === 'saved' ? 'Saved!' : 'Save Draft'}
                        </button>
                        <button
                            onClick={handleReview}
                            disabled={isLoading || !essayText.trim()}
                            className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Analyzing...' : `Analyze My ${reviewMode === 'essay' ? 'Essay' : 'Chapter'}`}
                        </button>
                    </div>
                </div>

                {/* Feedback Column */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                    {isLoading && (
                         <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
                             <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 animate-spin" style={{borderTopColor: '#3498db'}}></div>
                             <h3 className="text-lg font-semibold">Analyzing your writing...</h3>
                             <p className="text-sm text-center">This may take a moment. The AI is reading your work carefully.</p>
                         </div>
                    )}
                    {error && (
                        <div className="flex flex-col items-center justify-center h-full text-red-600 bg-red-50 p-6 rounded-lg">
                             <h3 className="text-lg font-semibold">An Error Occurred</h3>
                             <p className="text-sm text-center mt-2">{error}</p>
                        </div>
                    )}
                    {!isLoading && !feedback && !error && (
                         <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                            <EssayReviewerIcon className="w-24 h-24 mb-4"/>
                            <h3 className="text-lg font-semibold text-gray-600">Your feedback will appear here</h3>
                            <p className="text-sm text-center mt-1">Select your writing type, paste or upload your text, and click "Analyze" to begin. You can also load an example to see how it works.</p>
                         </div>
                    )}
                    {feedback && (
                       <div className="grid grid-cols-1 xl:grid-cols-2 flex-1 min-h-0">
                           {/* Your Text with Highlighting */}
                           <div className="p-6 overflow-y-auto">
                               <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 sticky top-0 bg-white">Your Submission</h3>
                               <div className="text-sm text-gray-700 leading-relaxed">
                                   {renderHighlightedText(essayText, highlightedQuote)}
                               </div>
                           </div>

                           {/* Feedback Criteria */}
                           <div className="p-6 bg-gray-50 border-l border-gray-200 overflow-y-auto">
                               <div className="sticky top-0 bg-gray-50 pt-0 pb-4">
                                   <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Feedback Report</h3>
                                   <div className="bg-blue-50 p-4 rounded-lg">
                                       <h4 className="font-semibold text-blue-800">Overall Score: {feedback.overallScore}</h4>
                                       <p className="text-sm text-blue-700 mt-2" dangerouslySetInnerHTML={{ __html: renderMarkdown(feedback.overallSummary) }}></p>
                                   </div>
                               </div>

                               {penaltyTriggersText && (
                                   <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg my-6">
                                       <div className="flex items-start">
                                           <WarningIcon className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-1" />
                                           <div>
                                               <h4 className="font-semibold text-yellow-800">Note on Automatic Penalty Triggers</h4>
                                               <p className="text-sm text-yellow-700 mt-2">
                                                   For a '<strong>{currentSelectionTitle}</strong>', the following conditions trigger severe penalties:
                                               </p>
                                               <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
                                                   {penaltyTriggersText.split('\n').map((trigger, i) => (
                                                       <li key={i}>{trigger.replace(/•\s*/, '')}</li>
                                                   ))}
                                               </ul>
                                           </div>
                                       </div>
                                   </div>
                               )}

                               <div className="space-y-4">
                                   {feedback.criteriaFeedback.map((criterion, index) => (
                                       <div 
                                           key={index}
                                           className="border border-gray-200 bg-white rounded-lg p-4 cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all duration-200"
                                           onMouseEnter={() => setHighlightedQuote(criterion.quote)}
                                           onMouseLeave={() => setHighlightedQuote(null)}
                                       >
                                           <div className="flex justify-between items-center flex-wrap gap-2">
                                               <h5 className="font-semibold text-gray-700" dangerouslySetInnerHTML={{ __html: renderMarkdown(criterion.criterion) }}></h5>
                                               <span className="text-sm font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">{criterion.score}</span>
                                           </div>
                                           <p className="text-sm text-gray-600 mt-2" dangerouslySetInnerHTML={{ __html: renderMarkdown(criterion.feedback) }}></p>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       </div>
                    )}
                </div>
            </div>
        </div>
    );
};