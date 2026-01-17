import { useState, useRef } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Upload, Trash2, Check, X, Download } from 'lucide-react';
import {
  loadFieldMappingFiles,
  saveFieldMappingFiles,
  setActiveFieldMappingId,
  getActiveFieldMappingId,
  getDefaultFieldMapping,
} from '../utils/storage';
import type { FieldMappingFile } from '../types';

export function FieldMappingManagement() {
  const [files, setFiles] = useState<FieldMappingFile[]>(() => loadFieldMappingFiles());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeId = getActiveFieldMappingId() || 'default';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      const mappings: { [excelColumn: string]: string } = {};
      let hasError = false;
      const errors: string[] = [];

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        const parts = trimmed.split('=').map(p => p.trim());
        if (parts.length !== 2) {
          hasError = true;
          errors.push(`第 ${index + 1} 行格式错误：应为 "Excel列名=映射后的列名"`);
          return;
        }
        
        const [excelColumn, mappedColumn] = parts;
        if (!excelColumn || !mappedColumn) {
          hasError = true;
          errors.push(`第 ${index + 1} 行格式错误：Excel列名和映射后的列名不能为空`);
          return;
        }
        
        mappings[excelColumn] = mappedColumn;
      });

      if (hasError) {
        alert(`文件解析失败：\n${errors.join('\n')}`);
        return;
      }

      if (Object.keys(mappings).length === 0) {
        alert('文件解析成功，但没有找到有效的映射关系');
        return;
      }

      const newFile: FieldMappingFile = {
        id: Date.now().toString(),
        name: file.name.replace(/\.txt$/i, ''),
        mappings,
        createdAt: Date.now(),
        isActive: false,
        isDefault: false,
      };

      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);
      saveFieldMappingFiles(updatedFiles);

      alert(`文件导入成功！\n- 映射关系数量: ${Object.keys(mappings).length}`);
    } catch (error) {
      console.error('Failed to parse mapping file:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`文件解析失败：${errorMessage}\n\n请确保文件格式为：\nExcel列名=系统字段名\n每行一个映射关系`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个字段映射文件吗？')) {
      const updatedFiles = files.filter(f => f.id !== id);
      setFiles(updatedFiles);
      saveFieldMappingFiles(updatedFiles);
      
      if (activeId === id) {
        // 如果删除的是当前激活的文件，清除激活状态（将使用默认模板）
        setActiveFieldMappingId(null);
      }
    }
  };

  const handleRename = (id: string, newName: string) => {
    if (newName.trim()) {
      const updatedFiles = files.map(f =>
        f.id === id ? { ...f, name: newName.trim() } : f
      );
      setFiles(updatedFiles);
      saveFieldMappingFiles(updatedFiles);
    }
  };

  const handleSetActive = (id: string) => {
    setActiveFieldMappingId(id);
    setFiles(loadFieldMappingFiles()); // 重新加载以更新状态
  };

  const handleExport = (file: FieldMappingFile) => {
    const lines = Object.entries(file.mappings).map(([excelColumn, mappedColumn]) => 
      `${excelColumn}=${mappedColumn}`
    );
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportDefaultTemplate = () => {
    const defaultMapping = getDefaultFieldMapping();
    handleExport(defaultMapping);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark-text mb-2">解析字段管理</h1>
        <p className="text-dark-textSecondary">
          管理 Excel 列名与系统字段名的映射关系，支持导入导出映射文件
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-dark-text mb-1">
                导入字段映射文件
              </h3>
              <p className="text-sm text-dark-textTertiary">
                支持 .txt 格式，每行一个映射关系，格式：Excel列名=系统字段名
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
                id="mapping-upload"
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
                onClick={handleExportDefaultTemplate}
                className="flex items-center gap-2"
              >
                <Download size={18} />
                导出默认模板
              </Button>
            </div>
          </div>
          <div className="text-xs text-dark-textTertiary bg-dark-surface2 rounded-lg p-3">
            <p className="font-semibold mb-1">提示：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>文件格式：每行一个映射关系，格式为 "Excel列名=映射后的列名"</li>
              <li>示例：姓名=姓名、语文=语文、数学=数学（默认自身映射）</li>
              <li>如果Excel中的列名与标准列名不同，可以自定义映射，例如：学生姓名=姓名、数学成绩=数学</li>
              <li>标准列名包括：考试、考试顺序、考试时间、班号、学号、姓名、各科名称（语文、数学、英语、物理、化学、生物、政治、历史、地理）</li>
              <li>注意：总分和排名列不需要映射，系统会根据学生类型（物理生/历史生）自动计算</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Files List */}
      <Card>
        <h3 className="text-lg font-semibold text-dark-text mb-4">
          自定义字段映射文件 ({files.length})
        </h3>
        {files.length === 0 ? (
          <div className="text-center py-12 text-dark-textTertiary">
            <p>还没有导入任何自定义字段映射文件</p>
            <p className="text-sm mt-2">点击上方按钮导入映射文件，或使用默认模板</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <MappingFileItem
                key={file.id}
                file={file}
                isActive={activeId === file.id}
                onDelete={handleDelete}
                onRename={handleRename}
                onSetActive={handleSetActive}
                onExport={handleExport}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

interface MappingFileItemProps {
  file: FieldMappingFile;
  isActive: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onSetActive: (id: string) => void;
  onExport: (file: FieldMappingFile) => void;
}

function MappingFileItem({
  file,
  isActive,
  onDelete,
  onRename,
  onSetActive,
  onExport,
}: MappingFileItemProps) {
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
                <p>映射关系数量: {Object.keys(file.mappings).length}</p>
                <p>
                  创建时间:{' '}
                  {new Date(file.createdAt).toLocaleString('zh-CN')}
                </p>
                <div className="mt-2">
                  <p className="font-semibold mb-1">映射关系预览（前5条）：</p>
                  <div className="space-y-1">
                    {Object.entries(file.mappings).slice(0, 5).map(([excelColumn, systemField]) => (
                      <p key={excelColumn} className="text-xs">
                        {excelColumn} → {systemField}
                      </p>
                    ))}
                    {Object.keys(file.mappings).length > 5 && (
                      <p className="text-xs text-dark-textTertiary">
                        ...还有 {Object.keys(file.mappings).length - 5} 条映射关系
                      </p>
                    )}
                  </div>
                </div>
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
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onExport(file)}
            className="flex items-center gap-1"
          >
            <Download size={16} />
            导出
          </Button>
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
