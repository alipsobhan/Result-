import { Timestamp } from 'firebase/firestore';

export interface Student {
  id?: string;
  rollNumber: string;
  name: string;
  parentPhone?: string;
  parentEmail?: string;
}

export interface Result {
  id?: string;
  userId: string;
  rollNumber: string;
  studentName: string;
  marks: Record<string, number>;
  totalMarks: number;
  average: number;
  passMark: number;
  status: 'Pass' | 'Fail';
  gpa?: number;
  createdAt: Timestamp | Date;
  savedToGallery?: boolean;
  galleryNotes?: string;
  // Advanced Upgrade Fields
  gradingScale?: string; // e.g. "board_5" (5.0 scale), "univ_4" (4.0 scale), "cambridge" (A*-F)
  boardName?: string;    // e.g. "Dhaka", "Rajshahi", "Standard University", "GCE Board"
  pdfTemplate?: 'modern' | 'classic' | 'colorful';
  schoolName?: string;
  examDate?: string;
  principalName?: string;
  aiRemarks?: string;
  aiStrengths?: string[];
  aiWeaknesses?: string[];
  aiSuggestions?: string[];
}

export interface UserSetting {
  userId: string;
  passMark: number;
  defaultSubjects?: string[];
  subjectCredits?: Record<string, number>;
}

export interface MCQQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
}

export interface CQQuestion {
  id: string;
  scenario: string;
  subQuestions: string[];
}

export interface ShortQuestion {
  id: string;
  questionText: string;
  sampleAnswer: string;
}

export interface QuestionPaper {
  id?: string;
  userId: string;
  title: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'MCQ' | 'CQ' | 'Short';
  language: 'Bangla' | 'English';
  timerEnabled: boolean;
  timerDuration: number;
  questions: any[];
  createdAt: any;
}

export const PREDEFINED_SUBJECTS = [
  'Mathematics',
  'English',
  'Physics',
  'Chemistry',
  'Biology',
  'Higher Math',
  'ICT',
  'Accounting',
  'Business Studies',
  'Economics',
  'Accounting',
  'Geography',
  'History',
  'Civics',
  'Sociology'
];
