import React, { useState } from 'react';
import { Section } from '../types';
import { 
    commonEssayTypes, 
    thesisFormats, 
    thesisChecklist,
    thesisMarkingScheme,
    essayMarkingScheme,
    writingTips
} from '../data/academicData';
import { ChevronDownIcon } from './icons';

interface ContentDisplayProps {
  activeSection: Section;
}

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white shadow-md rounded-lg overflow-hidden ${className}`}>
        <div className="bg-gray-100 px-4 py-3 border-b">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="p-4">
            {children}
        </div>
    </div>
);

const Table: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    {headers.map(header => (
                        <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {children}
            </tbody>
        </table>
    </div>
);


export const ContentDisplay: React.FC<ContentDisplayProps> = ({ activeSection }) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const renderContent = () => {
        switch (activeSection) {
            case 'Essay Types':
                return (
                    <Card title="Common Essay Types (Click row to see example)">
                        <Table headers={['Level', 'Essay Type', 'Core Purpose', 'Typical Disciplines', '']}>
                            {commonEssayTypes.map((item, index) => (
                                <React.Fragment key={index}>
                                    <tr onClick={() => setExpandedIndex(expandedIndex === index ? null : index)} className="cursor-pointer hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.level}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">{item.type}</td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{item.corePurpose}</td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{item.typicalDisciplines}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${expandedIndex === index ? 'transform rotate-180' : ''}`} />
                                        </td>
                                    </tr>
                                    {expandedIndex === index && (
                                        <tr>
                                            <td colSpan={5} className="p-0">
                                                <div className="p-4 bg-gray-50 border-t border-gray-200">
                                                    <div className="bg-white p-4 rounded-md border">
                                                        <h4 className="text-md font-bold text-blue-700">{item.exampleEssay.title}</h4>
                                                        <p className="text-sm text-gray-600 mt-2 italic border-l-4 border-blue-200 pl-3">{item.exampleEssay.description}</p>
                                                        <p className="text-sm text-gray-800 mt-4 whitespace-pre-wrap font-mono bg-gray-100 p-3 rounded-md">{item.exampleEssay.text}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </Table>
                    </Card>
                );
            case 'Thesis Formats':
                 return (
                    <div className="space-y-6">
                        <Card title="Thesis Formats by Degree Level">
                            <Table headers={['Level', 'Common Thesis Types', 'Typical Purpose & Structure']}>
                                {thesisFormats.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.level}</td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{item.commonThesisTypes.replace(/, /g, '\n')}</td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{item.typicalPurpose}</td>
                                    </tr>
                                ))}
                            </Table>
                        </Card>
                         <Card title="Quick Checklist for Each Level">
                            <Table headers={['Checklist Item', 'Undergraduate', 'Master’s', 'Doctoral']}>
                                {thesisChecklist.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.item}</td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{item.undergraduate}</td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{item.masters}</td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{item.doctoral}</td>
                                    </tr>
                                ))}
                            </Table>
                        </Card>
                    </div>
                );
            case 'Thesis Marking Scheme':
                 return (
                     <Card title="Thesis Marking Scheme Blueprint">
                         <Table headers={['Chapter', 'Weight', 'Core Rubric', 'Harsh Penalty Triggers']}>
                            {thesisMarkingScheme[0].items.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.chapter}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.weight}</td>
                                    <td className="px-6 py-4 whitespace-pre-wrap text-sm text-gray-500">{item.coreRubric}</td>
                                    <td className="px-6 py-4 whitespace-pre-wrap text-sm text-red-600">{item.penaltyTriggers}</td>
                                </tr>
                            ))}
                         </Table>
                     </Card>
                 );
            case 'Essay Marking Scheme':
                return (
                     <Card title="Essay Marking Scheme">
                         <Table headers={['Essay Type', 'Core Rubric', 'Weight', 'Harsh Penalty Triggers']}>
                            {essayMarkingScheme[0].items.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900">{item.type}</td>
                                    <td className="px-6 py-4 whitespace-pre-wrap text-sm text-gray-500">{item.coreRubric}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.weight}</td>
                                    <td className="px-6 py-4 whitespace-pre-wrap text-sm text-red-600">{item.penaltyTriggers}</td>
                                </tr>
                            ))}
                         </Table>
                     </Card>
                 );
            case 'Writing Tips':
                return (
                    <Card title="Beyond The Rubric – Practical Tips to Excel">
                        <Table headers={['Area', 'What to Do', 'Why It Works', 'Quick Start Tools']}>
                            {writingTips.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.area}</td>
                                    <td className="px-6 py-4 whitespace-pre-wrap text-sm text-gray-500">{item.whatToDo}</td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{item.whyItWorks}</td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{item.quickStartTools}</td>
                                </tr>
                            ))}
                        </Table>
                    </Card>
                );
            default:
                return <div>Select a section</div>;
        }
    };

    return <div className="p-4 sm:p-6 md:p-8">{renderContent()}</div>;
};