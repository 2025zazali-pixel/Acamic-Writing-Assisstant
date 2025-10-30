export type Section =
  | 'Essay Types'
  | 'Thesis Formats'
  | 'Thesis Marking Scheme'
  | 'Essay Marking Scheme'
  | 'Writing Tips'
  | 'Essay Reviewer';

export interface EssayType {
  type: string;
  corePurpose: string;
  typicalDisciplines: string;
  level: 'Undergraduate' | 'Master’s';
  exampleEssay: {
    title: string;
    description: string;
    text: string;
  };
}

export interface ThesisFormat {
  level: string;
  commonThesisTypes: string;
  typicalPurpose: string;
}

export interface ThesisChecklistItem {
  item: string;
  undergraduate: string;
  masters: string;
  doctoral: string;
}

export interface MarkingSchemeItem {
  chapter: string;
  weight: string;
  coreRubric: string;
  penaltyTriggers: string;
}

export interface ThesisMarkingScheme {
  level: string;
  items: MarkingSchemeItem[];
}

export interface EssayMarkingSchemeItem {
  type: string;
  coreRubric: string;
  weight: string;
  penaltyTriggers: string;
}

export interface EssayMarkingScheme {
  level: string;
  items: EssayMarkingSchemeItem[];
}

export interface WritingTip {
  area: string;
  whatToDo: string;
  whyItWorks: string;
  quickStartTools: string;
}

export interface ChatMessage {
    sender: 'user' | 'ai';
    text: string;
}

export interface ReviewCriterionFeedback {
  criterion: string;
  score: string;
  feedback: string;
  quote: string;
}

export interface ReviewFeedback {
  overallScore: string;
  overallSummary: string;
  criteriaFeedback: ReviewCriterionFeedback[];
}