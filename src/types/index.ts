// 数据类型定义

export interface Student {
  exam: number;
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
  assignedScores?: {
    chinese: number;
    math: number;
    english: number;
    physics: number;
    chemistry: number;
    politics: number;
    history: number;
    geography: number;
    biology: number;
  };
  assignedTotal?: number; // 赋分总分（使用赋分后的分数计算）
}

export interface ExamData {
  examNumber: number;
  examName: string; // 考试名称，来自 sheet name
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

export interface ParseOrderFile {
  id: string;
  name: string;
  order: string[]; // 工作表名称的顺序数组
  createdAt: number;
  isActive: boolean;
  isDefault: boolean; // 是否为默认文件，不允许删除
}

export interface FieldMappingFile {
  id: string;
  name: string;
  mappings: { [excelColumn: string]: string }; // Excel列名 -> 映射后的列名（默认是自身）
  createdAt: number;
  isActive: boolean;
  isDefault: boolean; // 是否为默认文件，不允许删除
}

export interface ScoreAssignmentRule {
  grade: string; // A, B, C, D, E
  percentage: number; // 百分比区间
  maxScore: number; // 赋分最高值
  minScore: number; // 赋分最低值
}

export interface ScoreAssignmentFile {
  id: string;
  name: string;
  rules: ScoreAssignmentRule[]; // 赋分规则列表
  enabledFields: string[]; // 生效的科目字段列表（如 ['physics', 'chemistry', 'biology']）
  enabled: boolean; // 是否启用
  createdAt: number;
  isDefault: boolean; // 是否为默认文件，不允许删除
}
