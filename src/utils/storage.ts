import type { ExcelFile } from '../types';

const STORAGE_KEY = 'excel_files';
const ACTIVE_FILE_KEY = 'active_excel_file_id';

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
