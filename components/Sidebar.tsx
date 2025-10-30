import React from 'react';
import { Section } from '../types';
import { BookOpenIcon, ClipboardListIcon, LightBulbIcon, EssayReviewerIcon } from './icons';

const sections: { name: Section; icon: React.ReactNode }[] = [
    { name: 'Essay Reviewer', icon: <EssayReviewerIcon className="w-5 h-5 mr-3" /> },
    { name: 'Essay Types', icon: <BookOpenIcon className="w-5 h-5 mr-3" /> },
    { name: 'Thesis Formats', icon: <BookOpenIcon className="w-5 h-5 mr-3" /> },
    { name: 'Thesis Marking Scheme', icon: <ClipboardListIcon className="w-5 h-5 mr-3" /> },
    { name: 'Essay Marking Scheme', icon: <ClipboardListIcon className="w-5 h-5 mr-3" /> },
    { name: 'Writing Tips', icon: <LightBulbIcon className="w-5 h-5 mr-3" /> },
];

interface SidebarProps {
    activeSection: Section;
    setActiveSection: (section: Section) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection }) => {
    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 p-4 hidden md:block">
            <nav className="flex flex-col space-y-1">
                {sections.map(section => (
                    <button
                        key={section.name}
                        onClick={() => setActiveSection(section.name)}
                        className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                            activeSection === section.name
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                    >
                        {section.icon}
                        <span>{section.name}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
};
