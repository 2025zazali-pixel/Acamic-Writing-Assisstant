import React, { useState } from 'react';
import { Chatbot } from './components/Chatbot';
import { EssayReviewer } from './components/EssayReviewer';
import { Sidebar } from './components/Sidebar';
import { ContentDisplay } from './components/ContentDisplay';
import { Section } from './types';
import { BookOpenIcon } from './components/icons';

const App: React.FC = () => {
    const [activeSection, setActiveSection] = useState<Section>('Essay Reviewer');

    const renderContent = () => {
        if (activeSection === 'Essay Reviewer') {
            return <EssayReviewer />;
        }
        return <ContentDisplay activeSection={activeSection} />;
    };

    return (
        <div className="relative h-screen bg-gray-50 text-gray-800 flex flex-col">
            <header className="bg-white border-b border-gray-200 p-4 flex items-center space-x-3 flex-shrink-0">
                 <div className="p-2 bg-blue-600 rounded-lg">
                    <BookOpenIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-800">AI Academic Writing Assistant</h1>
            </header>
            <div className="flex flex-1 overflow-hidden">
                <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
                <main className="flex-1 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
            <Chatbot />
        </div>
    );
};

export default App;
