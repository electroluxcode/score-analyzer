import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ExcelFile } from '../types';
import { loadExcelFiles, saveExcelFiles, getActiveFileId, setActiveFileId } from '../utils/storage';

interface DataContextType {
  files: ExcelFile[];
  activeFile: ExcelFile | null;
  setFiles: (files: ExcelFile[]) => void;
  addFile: (file: ExcelFile) => void;
  removeFile: (id: string) => void;
  updateFile: (id: string, updates: Partial<ExcelFile>) => void;
  setActiveFile: (id: string | null) => void;
  refreshFiles: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [files, setFilesState] = useState<ExcelFile[]>([]);
  const [activeFile, setActiveFileState] = useState<ExcelFile | null>(null);

  const refreshFiles = () => {
    const loadedFiles = loadExcelFiles();
    setFilesState(loadedFiles);
    
    const activeId = getActiveFileId();
    const active = loadedFiles.find(f => f.id === activeId) || null;
    setActiveFileState(active);
  };

  useEffect(() => {
    refreshFiles();
  }, []);

  const setFiles = (newFiles: ExcelFile[]) => {
    setFilesState(newFiles);
    saveExcelFiles(newFiles);
  };

  const addFile = (file: ExcelFile) => {
    const newFiles = [...files, file];
    setFiles(newFiles);
    if (!getActiveFileId()) {
      setActiveFile(file.id);
    }
  };

  const removeFile = (id: string) => {
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    if (activeFile?.id === id) {
      setActiveFile(newFiles.length > 0 ? newFiles[0].id : null);
    }
  };

  const updateFile = (id: string, updates: Partial<ExcelFile>) => {
    const newFiles = files.map(f => 
      f.id === id ? { ...f, ...updates } : f
    );
    setFiles(newFiles);
    if (activeFile?.id === id) {
      setActiveFileState({ ...activeFile, ...updates });
    }
  };

  const setActiveFile = (id: string | null) => {
    setActiveFileId(id);
    const active = id ? files.find(f => f.id === id) || null : null;
    setActiveFileState(active);
    refreshFiles();
  };

  return (
    <DataContext.Provider
      value={{
        files,
        activeFile,
        setFiles,
        addFile,
        removeFile,
        updateFile,
        setActiveFile,
        refreshFiles,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
