import React, { useState, useCallback, useRef } from 'react';
import { getTextFromImage } from '../services/geminiService';
import { UploadCloudIcon, FileTextIcon, FileImageIcon, FilePdfIcon, FileVideoIcon, FileAudioIcon } from './icons';

interface FileUploadProps {
    onTextExtracted: (text: string) => void;
    setParentError: (error: string | null) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onTextExtracted, setParentError }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File) => {
        if (!file) return;

        setParentError(null);
        setIsProcessing(true);
        setFileName(file.name);

        if (file.type.startsWith('text/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                onTextExtracted(e.target?.result as string);
                setIsProcessing(false);
            };
            reader.onerror = () => {
                setParentError('Failed to read the text file.');
                setIsProcessing(false);
            };
            reader.readAsText(file);
        } else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const base64DataUrl = e.target?.result as string;
                    const base64Image = base64DataUrl.split(',')[1];
                    const extractedText = await getTextFromImage(base64Image, file.type);
                    onTextExtracted(extractedText);
                } catch (error: any) {
                    setParentError(error.message || 'Failed to extract text from image.');
                } finally {
                    setIsProcessing(false);
                }
            };
            reader.onerror = () => {
                setParentError('Failed to read the image file.');
                setIsProcessing(false);
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
             alert('PDF processing is in development. For now, please copy and paste the text from your PDF directly into the text box.');
             setIsProcessing(false);
        } else if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
             alert('Audio and video transcription is a planned feature. For now, please provide a text transcript.');
             setIsProcessing(false);
        } else {
            setParentError(`Unsupported file type: ${file.type}. Please upload text or image files.`);
            setIsProcessing(false);
        }
    }, [onTextExtracted, setParentError]);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };
    
    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
        // Reset the input value so the user can re-upload the same file
        if (e.target) {
            e.target.value = "";
        }
    };

    return (
        <div className="mb-4">
            <div
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`relative block w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ease-in-out ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="text/*,image/*,application/pdf,audio/*,video/*"
                />
                
                {isProcessing ? (
                     <div className="flex flex-col items-center justify-center text-gray-500">
                         <div className="loader ease-linear rounded-full border-2 border-t-2 border-gray-200 h-6 w-6 mb-2 animate-spin" style={{borderTopColor: '#3498db'}}></div>
                         <p className="text-sm font-medium">Processing "{fileName}"...</p>
                     </div>
                ) : (
                    <>
                        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                            Drag & drop a file here, or click to upload
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                           Get feedback on your writing from any source.
                        </span>
                    </>
                )}
            </div>
             <div className="mt-2 flex items-center justify-center space-x-4">
                <div className="flex items-center text-xs text-gray-500"><FileTextIcon className="w-4 h-4 mr-1 text-blue-500" /> Text</div>
                <div className="flex items-center text-xs text-gray-500"><FileImageIcon className="w-4 h-4 mr-1 text-green-500" /> Image</div>
                <div className="flex items-center text-xs text-gray-400"><FilePdfIcon className="w-4 h-4 mr-1" /> PDF*</div>
                <div className="flex items-center text-xs text-gray-400"><FileVideoIcon className="w-4 h-4 mr-1" /> Video*</div>
                <div className="flex items-center text-xs text-gray-400"><FileAudioIcon className="w-4 h-4 mr-1" /> Speech*</div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-1">*Support for these formats is in development.</p>
        </div>
    );
};