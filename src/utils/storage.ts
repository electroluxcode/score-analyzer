import type { ExcelFile, ParseOrderFile, FieldMappingFile, ScoreAssignmentFile } from '../types';

const STORAGE_KEY = 'excel_files';
const ACTIVE_FILE_KEY = 'active_excel_file_id';
const PARSE_ORDER_KEY = 'parse_order_files';
const ACTIVE_PARSE_ORDER_KEY = 'active_parse_order_id';
const FIELD_MAPPING_KEY = 'field_mapping_files';
const ACTIVE_FIELD_MAPPING_KEY = 'active_field_mapping_id';
const SCORE_ASSIGNMENT_KEY = 'score_assignment_files';
const ACTIVE_SCORE_ASSIGNMENT_KEY = 'active_score_assignment_id';

export function saveExcelFiles(files: ExcelFile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch (error) {
    console.error('Failed to save Excel files:', error);
  }
}

export function loadExcelFiles(): ExcelFile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load Excel files:', error);
    return [];
  }
}

export function setActiveFileId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_FILE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_FILE_KEY);
  }
}

export function getActiveFileId(): string | null {
  return localStorage.getItem(ACTIVE_FILE_KEY);
}

export function getActiveFile(): ExcelFile | null {
  const files = loadExcelFiles();
  const activeId = getActiveFileId();
  return files.find(f => f.id === activeId) || null;
}

// 解析顺序文件存储
export function saveParseOrderFiles(files: ParseOrderFile[]) {
  try {
    localStorage.setItem(PARSE_ORDER_KEY, JSON.stringify(files));
  } catch (error) {
    console.error('Failed to save parse order files:', error);
  }
}

export function loadParseOrderFiles(): ParseOrderFile[] {
  try {
    const data = localStorage.getItem(PARSE_ORDER_KEY);
    if (!data) {
      // 如果没有数据，创建默认的解析顺序文件
      const defaultFile: ParseOrderFile = {
        id: 'default',
        name: '默认解析顺序',
        order: [], // 空数组表示按照Excel文件中的顺序
        createdAt: Date.now(),
        isActive: true,
        isDefault: true,
      };
      saveParseOrderFiles([defaultFile]);
      setActiveParseOrderId('default');
      return [defaultFile];
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load parse order files:', error);
    return [];
  }
}

export function setActiveParseOrderId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_PARSE_ORDER_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_PARSE_ORDER_KEY);
  }
}

export function getActiveParseOrderId(): string | null {
  return localStorage.getItem(ACTIVE_PARSE_ORDER_KEY);
}

export function getActiveParseOrder(): ParseOrderFile | null {
  const files = loadParseOrderFiles();
  const activeId = getActiveParseOrderId();
  return files.find(f => f.id === activeId) || files.find(f => f.isDefault) || null;
}

// 字段映射文件存储
export function saveFieldMappingFiles(files: FieldMappingFile[]) {
  try {
    localStorage.setItem(FIELD_MAPPING_KEY, JSON.stringify(files));
  } catch (error) {
    console.error('Failed to save field mapping files:', error);
  }
}

/**
 * 获取默认字段映射（硬编码，不存储在 localStorage）
 */
export function getDefaultFieldMapping(): FieldMappingFile {
  return {
    id: 'default-template',
    name: '默认字段映射模板',
    mappings: {
      '考试时间': '考试时间',
      '班号': '班号',
      '学号': '学号',
      '姓名': '姓名',
      '语文': '语文',
      '数学': '数学',
      '英语': '英语',
      '物理': '物理',
      '化学': '化学',
      '政治': '政治',
      '历史': '历史',
      '地理': '地理',
      '生物': '生物',
      // 总分和排名不再需要映射，系统会自动计算
    },
    createdAt: 0,
    isActive: false,
    isDefault: false,
  };
}

export function loadFieldMappingFiles(): FieldMappingFile[] {
  try {
    const data = localStorage.getItem(FIELD_MAPPING_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load field mapping files:', error);
    return [];
  }
}

export function setActiveFieldMappingId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_FIELD_MAPPING_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_FIELD_MAPPING_KEY);
  }
}

export function getActiveFieldMappingId(): string | null {
  return localStorage.getItem(ACTIVE_FIELD_MAPPING_KEY);
}

export function getActiveFieldMapping(): FieldMappingFile | null {
  const files = loadFieldMappingFiles();
  const activeId = getActiveFieldMappingId();
  const activeFile = files.find(f => f.id === activeId);
  
  // 如果找到了激活的文件，返回它
  if (activeFile) {
    return activeFile;
  }
  
  // 如果没有激活的文件，返回默认模板（硬编码）
  return getDefaultFieldMapping();
}

// 赋分规则文件存储
export function getDefaultScoreAssignment(): ScoreAssignmentFile {
  return {
    id: 'default-score-assignment',
    name: '默认赋分规则',
    rules: [
      { grade: 'A', percentage: 15, maxScore: 95, minScore: 83 },
      { grade: 'B', percentage: 34, maxScore: 82, minScore: 71 },
      { grade: 'C', percentage: 34, maxScore: 70, minScore: 59 },
      { grade: 'D', percentage: 15, maxScore: 58, minScore: 41 },
      { grade: 'E', percentage: 2, maxScore: 40, minScore: 30 },
    ],
    enabledFields: ['chemistry', 'biology', 'politics', 'geography'], // 默认对所有选考科目生效
    enabled: true,
    createdAt: 0,
    isDefault: true,
  };
}

export function saveScoreAssignmentFiles(files: ScoreAssignmentFile[]) {
  try {
    localStorage.setItem(SCORE_ASSIGNMENT_KEY, JSON.stringify(files));
  } catch (error) {
    console.error('Failed to save score assignment files:', error);
  }
}

export function loadScoreAssignmentFiles(): ScoreAssignmentFile[] {
  try {
    const data = localStorage.getItem(SCORE_ASSIGNMENT_KEY);
    if (!data) {
      // 如果没有数据，返回空数组（使用硬编码的默认规则）
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load score assignment files:', error);
    return [];
  }
}

export function setActiveScoreAssignmentId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_SCORE_ASSIGNMENT_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_SCORE_ASSIGNMENT_KEY);
  }
}

export function getActiveScoreAssignmentId(): string | null {
  return localStorage.getItem(ACTIVE_SCORE_ASSIGNMENT_KEY);
}

export function getActiveScoreAssignment(): ScoreAssignmentFile | null {
  const files = loadScoreAssignmentFiles();
  const activeId = getActiveScoreAssignmentId();
  const activeFile = files.find(f => f.id === activeId);
  
  // 如果找到了激活的文件，返回它
  if (activeFile) {
    return activeFile;
  }
  
  // 如果没有激活的文件，返回默认模板（硬编码）
  return getDefaultScoreAssignment();
}
