import { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { parseExcelFile, exportTemplate } from '../utils/excel';
import type { ExcelFile } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Upload, Trash2, Check, X, Download } from 'lucide-react';

export function DataManagement() {
  const { files, addFile, removeFile, updateFile, setActiveFile, activeFile } = useData();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const examData = await parseExcelFile(file);
      
      if (examData.length === 0) {
        alert('文件解析成功，但没有找到有效的数据。请检查：\n1. 工作表名称是否为数字或Sheet1格式\n2. 表头是否包含"姓名"列\n3. 是否有数据行');
        return;
      }
      
      const newFile: ExcelFile = {
        id: Date.now().toString(),
        name: file.name.replace(/\.(xlsx|xls)$/i, ''),
        data: examData,
        createdAt: Date.now(),
        isActive: false,
      };
      addFile(newFile);
      if (files.length === 0) {
        setActiveFile(newFile.id);
      }
      
      // 显示成功消息
      alert(`文件导入成功！\n- 考试次数: ${examData.length}\n- 学生总数: ${examData.reduce((sum, exam) => sum + exam.students.length, 0)}`);
    } catch (error) {
      console.error('Failed to parse Excel file:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`文件解析失败：${errorMessage}\n\n请检查：\n1. 文件格式是否正确（.xlsx 或 .xls）\n2. 表头是否包含必要的列（姓名、各科成绩等）\n3. 数据格式是否正确`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个文件吗？')) {
      removeFile(id);
    }
  };

  const handleRename = (id: string, newName: string) => {
    if (newName.trim()) {
      updateFile(id, { name: newName.trim() });
    }
  };

  const handleSetActive = (id: string) => {
    setActiveFile(id);
  };

  const handleExportTemplate = () => {
    exportTemplate();
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark-text mb-2">数据管理</h1>
        <p className="text-dark-textSecondary">
          导入和管理 Excel 文件，选择当前生效的数据文件
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-dark-text mb-1">
                导入 Excel 文件
              </h3>
              <p className="text-sm text-dark-textTertiary">
                支持 .xlsx 和 .xls 格式，每个工作表代表一次考试
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="primary"
                disabled={uploading}
                onClick={handleFileButtonClick}
                className="flex items-center gap-2"
              >
                <Upload size={18} />
                {uploading ? '上传中...' : '选择文件'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleExportTemplate}
                className="flex items-center gap-2"
              >
                <Download size={18} />
                导出模板
              </Button>
            </div>
          </div>
          <div className="text-xs text-dark-textTertiary bg-dark-surface2 rounded-lg p-3">
            <p className="font-semibold mb-1">提示：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Excel 文件格式要求：每个工作表（Sheet）代表一次考试，工作表名称应为数字（如：1, 2, 3...）</li>
              <li>表头应包含：考试、考试时间、班号、学号、姓名、各科成绩和排名列</li>
              <li>如果不确定格式，请先下载模板文件参考</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Files List */}
      <Card>
        <h3 className="text-lg font-semibold text-dark-text mb-4">
          已导入的文件 ({files.length})
        </h3>
        {files.length === 0 ? (
          <div className="text-center py-12 text-dark-textTertiary">
            <p>还没有导入任何文件</p>
            <p className="text-sm mt-2">点击上方按钮导入 Excel 文件</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                isActive={activeFile?.id === file.id}
                onDelete={handleDelete}
                onRename={handleRename}
                onSetActive={handleSetActive}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

interface FileItemProps {
  file: ExcelFile;
  isActive: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onSetActive: (id: string) => void;
}

function FileItem({
  file,
  isActive,
  onDelete,
  onRename,
  onSetActive,
}: FileItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.name);

  const handleSave = () => {
    onRename(file.id, editName);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(file.name);
    setIsEditing(false);
  };

  return (
    <div
      className={`p-4 rounded-xl border ${
        isActive
          ? 'bg-dark-surface2 border-blue-500/50'
          : 'bg-dark-surface border-dark-border'
      } transition-all duration-200`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
                autoFocus
              />
              <Button
                size="sm"
                variant="primary"
                onClick={handleSave}
                className="p-2"
              >
                <Check size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="p-2"
              >
                <X size={16} />
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-dark-text">{file.name}</h4>
                {isActive && (
                  <span className="px-2 py-0.5 text-xs rounded-lg bg-blue-500/20 text-blue-400">
                    当前生效
                  </span>
                )}
              </div>
              <div className="text-sm text-dark-textTertiary space-y-1">
                <p>考试次数: {file.data.length}</p>
                <p>
                  学生总数: {file.data.reduce((sum, exam) => sum + exam.students.length, 0)}
                </p>
                <p>
                  创建时间:{' '}
                  {new Date(file.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isActive && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSetActive(file.id)}
            >
              设为生效
            </Button>
          )}
          {!isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
            >
              重命名
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(file.id)}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
