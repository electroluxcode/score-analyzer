// 数据类型定义

export interface Student {
  exam: number;
  examTime: string;
  classNumber: string;
  studentId: string;
  name: string;
  scores: {
    chinese: number;
    math: number;
    english: number;
    physics: number;
    chemistry: number;
    politics: number;
    history: number;
    geography: number;
    biology: number;
    total: number;
  };
  ranks: {
    chinese: number;
    math: number;
    english: number;
    physics: number;
    chemistry: number;
    politics: number;
    history: number;
    geography: number;
    biology: number;
    total: number;
  };
}

export interface ExamData {
  examNumber: number;
  examTime: string;
  students: Student[];
}

export interface ExcelFile {
  id: string;
  name: string;
  data: ExamData[];
  createdAt: number;
  isActive: boolean;
}

export interface Subject {
  key: string;
  label: string;
  colIndex: number;
}

export const SUBJECTS: Subject[] = [
  { key: 'chinese', label: '语文', colIndex: 5 },
  { key: 'math', label: '数学', colIndex: 6 },
  { key: 'english', label: '英语', colIndex: 7 },
  { key: 'physics', label: '物理', colIndex: 8 },
  { key: 'chemistry', label: '化学', colIndex: 9 },
  { key: 'politics', label: '政治', colIndex: 10 },
  { key: 'history', label: '历史', colIndex: 11 },
  { key: 'geography', label: '地理', colIndex: 12 },
  { key: 'biology', label: '生物', colIndex: 13 },
  { key: 'total', label: '总分', colIndex: 14 },
];

export const RANK_COLS = {
  chinese: 15,
  math: 16,
  english: 17,
  physics: 18,
  chemistry: 19,
  politics: 20,
  history: 21,
  geography: 22,
  biology: 23,
  total: 24,
};
