import { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { parseExcelFile, exportTemplate, exportSummaryStatistics, exportPersonalRanks, exportToExcel } from '../utils/excel';
import type { ExcelFile } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Upload, Trash2, Check, X, Download, FileDown, Edit } from 'lucide-react';

export function DataManagement() {
  const { files, addFile, removeFile, updateFile, setActiveFile, activeFile } = useData();
  const [uploading, setUploading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  const handleExportSummary = () => {
    if (!activeFile) {
      alert('请先选择生效的数据文件');
      return;
    }
    setExporting(true);
    try {
      exportSummaryStatistics(activeFile.data);
      alert('总体统计文件导出成功！');
      setShowExportModal(false);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPersonal = () => {
    if (!activeFile) {
      alert('请先选择生效的数据文件');
      return;
    }
    setExporting(true);
    try {
      exportPersonalRanks(activeFile.data);
      alert('个人排名扩展文件导出成功！');
      setShowExportModal(false);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleExportBoth = () => {
    if (!activeFile) {
      alert('请先选择生效的数据文件');
      return;
    }
    setExporting(true);
    try {
      exportSummaryStatistics(activeFile.data);
      setTimeout(() => {
        exportPersonalRanks(activeFile.data);
        alert('两个文件都已导出成功！');
        setShowExportModal(false);
        setExporting(false);
      }, 500);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
      setExporting(false);
    }
  };

  const handleExportOriginal = (file: ExcelFile) => {
    try {
      const filename = `${file.name}_原始数据_${new Date().toISOString().split('T')[0]}.xlsx`;
      exportToExcel(file.data, filename);
      alert('原始数据导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
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
              <li>Excel 文件格式要求：每个工作表（Sheet）代表一次考试，工作表名称即为考试名称</li>
              <li>表头应包含：考试、考试时间、班号、学号、姓名、各科成绩（语文、数学、英语、物理、化学、生物、政治、历史、地理）</li>
              <li>导入的Excel文件将根据"解析字段管理"中的解析规则进行解析</li>
              <li>总分和排名将通过系统自动计算，无需在Excel中填写</li>
              <li>系统会自动判断学生是物理生还是历史生，并计算对应的总分和排名</li>
              <li>如果不确定格式，请先下载模板文件参考</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Parse Order Management Link */}
      {/* <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-dark-text mb-1">
              解析顺序管理
            </h3>
            <p className="text-sm text-dark-textTertiary">
              管理 Excel 工作表的解析顺序，控制数据读取顺序
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/parse-order')}
            className="flex items-center gap-2"
          >
            <Settings size={18} />
            管理解析顺序
          </Button>
        </div>
      </Card> */}

      {/* Files List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-text">
            已导入的文件 ({files.length})
          </h3>
          {activeFile && (
            <Button
              variant="secondary"
              onClick={handleExportClick}
              className="flex items-center gap-2"
            >
              <FileDown size={18} />
              高阶数据导出
            </Button>
          )}
        </div>
        <div className="text-xs text-dark-textTertiary bg-dark-surface2 rounded-lg p-3 mb-4">
          <p className="font-semibold mb-1">说明：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>点击"高阶数据导出"可导出以下数据(数据源是当前生效表)：</li>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>总体统计</strong>：各考试班级各科平均分、多考试平均分趋势、有效值分析（包含赋分维度数据）等</li>
              <li><strong>个人排名扩展</strong>：个人各科排名、四总/六总/九总排名、班级排名、学生类型（物理生/历史生）、赋分数据等</li>
            </ul>
          </ul>
        </div>
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
                onExportOriginal={handleExportOriginal}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="数据导出"
        size="lg"
      >
        <div className="space-y-6">
          <div className="text-sm text-dark-textTertiary">
            <p>请选择要导出的数据类型：</p>
          </div>

          <div className="space-y-4">
            <Card>
              <div className="space-y-3">
                <h3 className="font-semibold text-dark-text">总体统计</h3>
                <p className="text-sm text-dark-textTertiary">
                  包含：各考试班级各科平均分、多考试平均分趋势、有效值分析（前10/50/100/200名）
                </p>
                <p className="text-xs text-dark-textTertiary">
                  注：如果启用了赋分功能，将包含赋分维度的数据
                </p>
                <Button
                  variant="primary"
                  onClick={handleExportSummary}
                  disabled={exporting || !activeFile}
                  className="w-full"
                >
                  {exporting ? '导出中...' : '导出总体统计'}
                </Button>
              </div>
            </Card>

            <Card>
              <div className="space-y-3">
                <h3 className="font-semibold text-dark-text">个人排名扩展</h3>
                <p className="text-sm text-dark-textTertiary">
                  包含：个人各科排名、四总/六总/九总排名、班级排名、学生类型（物理生/历史生）
                </p>
                <p className="text-xs text-dark-textTertiary">
                  注：四总=语数英+物理/历史，六总=四总+其他科目中分数最高的两科
                </p>
                <Button
                  variant="primary"
                  onClick={handleExportPersonal}
                  disabled={exporting || !activeFile}
                  className="w-full"
                >
                  {exporting ? '导出中...' : '导出个人排名'}
                </Button>
              </div>
            </Card>

            <Card>
              <div className="space-y-3">
                <h3 className="font-semibold text-dark-text">导出全部</h3>
                <p className="text-sm text-dark-textTertiary">
                  同时导出总体统计和个人排名扩展两个文件
                </p>
                <Button
                  variant="secondary"
                  onClick={handleExportBoth}
                  disabled={exporting || !activeFile}
                  className="w-full"
                >
                  {exporting ? '导出中...' : '导出全部'}
                </Button>
              </div>
            </Card>
          </div>

          {!activeFile && (
            <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
              请先选择生效的数据文件
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

interface FileItemProps {
  file: ExcelFile;
  isActive: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onSetActive: (id: string) => void;
  onExportOriginal: (file: ExcelFile) => void;
}

function FileItem({
  file,
  isActive,
  onDelete,
  onRename,
  onSetActive,
  onExportOriginal,
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onExportOriginal(file)}
            className="flex items-center gap-1"
            title="导出原始数据"
          >
            <Download size={16} />
          </Button>
          {!isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1"
              title="重命名"
            >
              <Edit size={16} />
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
