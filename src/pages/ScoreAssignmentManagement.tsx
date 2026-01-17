import { useState, useRef } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Upload, Trash2, Download } from 'lucide-react';
import {
  loadScoreAssignmentFiles,
  saveScoreAssignmentFiles,
  setActiveScoreAssignmentId,
  getActiveScoreAssignmentId,
  getDefaultScoreAssignment,
  getActiveFieldMapping,
} from '../utils/storage';
import type { ScoreAssignmentFile, ScoreAssignmentRule } from '../types';

export function ScoreAssignmentManagement() {
  const [files, setFiles] = useState<ScoreAssignmentFile[]>(() => loadScoreAssignmentFiles());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeId = getActiveScoreAssignmentId();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        alert('文件为空');
        return;
      }

      // 第一行：生效字段（格式：生效字段:物理,化学,生物,政治,历史,地理）
      // 注意：这里应该使用解析字段管理中映射后的列名（如"物理"），而不是Excel原始列名（如"物理成绩"）
      const firstLine = lines[0].trim();
      let enabledFields: string[] = [];
      let ruleStartIndex = 0;

      // 获取当前激活的字段映射
      const fieldMapping = getActiveFieldMapping();
      const mappings = fieldMapping?.mappings || {};
      
      // 创建映射后的列名到系统字段key的映射
      const mappedNameToKeyMap: { [key: string]: string } = {};
      const standardMappings: { [key: string]: string } = {
        '考试': 'exam',
        '考试顺序': 'exam',
        '班号': 'classNumber',
        '学号': 'studentId',
        '姓名': 'name',
        '语文': 'chinese',
        '数学': 'math',
        '英语': 'english',
        '物理': 'physics',
        '化学': 'chemistry',
        '政治': 'politics',
        '历史': 'history',
        '地理': 'geography',
        '生物': 'biology',
      };
      
      // 构建映射后的列名到系统字段key的映射
      // 注意：mappings 的值是映射后的列名（如"物理"），而不是Excel原始列名（如"物理成绩"）
      Object.values(mappings).forEach((mappedCol) => {
        const systemKey = standardMappings[mappedCol];
        if (systemKey) {
          mappedNameToKeyMap[mappedCol] = systemKey;
        }
      });
      
      // 如果没有自定义映射，使用默认映射
      if (Object.keys(mappedNameToKeyMap).length === 0) {
        Object.entries(standardMappings).forEach(([name, key]) => {
          if (['语文', '数学', '英语', '物理', '化学', '政治', '历史', '地理', '生物'].includes(name)) {
            mappedNameToKeyMap[name] = key;
          }
        });
      }

      if (firstLine.startsWith('生效字段:') || firstLine.startsWith('生效字段：')) {
        const fieldsStr = firstLine.replace(/^生效字段[:：]\s*/, '').trim();
        if (fieldsStr) {
          const fieldNames = fieldsStr.split(/\s+/).map(f => f.trim()).filter(f => f);
          enabledFields = fieldNames
            .map(name => {
              // 先尝试使用映射后的列名查找（如"物理"）
              const key = mappedNameToKeyMap[name];
              if (key) return key;
              // 如果找不到，尝试直接使用（可能是系统字段key）
              return name.toLowerCase();
            })
            .filter(field => {
              // 验证是否为有效的系统字段key
              return ['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'geography', 'biology'].includes(field);
            });
          
          if (enabledFields.length === 0) {
            const availableFields = Object.keys(mappedNameToKeyMap).join(' ');
            alert(`第一行格式错误：未找到有效的生效字段\n格式应为：生效字段:${availableFields}\n请使用解析字段管理中映射后的列名（如"物理"），而不是Excel原始列名（如"物理成绩"）\n多个字段用空格分隔`);
            return;
          }
        }
        ruleStartIndex = 1;
      } else {
        // 如果没有第一行指定，使用默认的选考科目
        enabledFields = ['physics', 'chemistry', 'biology', 'politics', 'history', 'geography'];
      }
      
      const rules: ScoreAssignmentRule[] = [];
      let hasError = false;
      const errors: string[] = [];

      // 从第二行开始解析规则
      for (let i = ruleStartIndex; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue; // 跳过空行和注释
        
        // 格式：等级,百分比,最高分,最低分
        const parts = trimmed.split(',').map(p => p.trim());
        if (parts.length !== 4) {
          hasError = true;
          errors.push(`第 ${i + 1} 行格式错误：应为 "等级,百分比,最高分,最低分"`);
          continue;
        }
        
        const [grade, percentageStr, maxScoreStr, minScoreStr] = parts;
        const percentage = parseFloat(percentageStr);
        const maxScore = parseFloat(maxScoreStr);
        const minScore = parseFloat(minScoreStr);
        
        if (isNaN(percentage) || isNaN(maxScore) || isNaN(minScore)) {
          hasError = true;
          errors.push(`第 ${i + 1} 行格式错误：百分比、最高分、最低分必须为数字`);
          continue;
        }
        
        if (percentage < 0 || percentage > 100) {
          hasError = true;
          errors.push(`第 ${i + 1} 行格式错误：百分比必须在0-100之间`);
          continue;
        }
        
        if (maxScore < minScore) {
          hasError = true;
          errors.push(`第 ${i + 1} 行格式错误：最高分不能小于最低分`);
          continue;
        }
        
        rules.push({
          grade,
          percentage,
          maxScore,
          minScore,
        });
      }

      if (hasError) {
        alert(`文件解析失败：\n${errors.join('\n')}`);
        return;
      }

      if (rules.length === 0) {
        alert('文件解析成功，但没有找到有效的赋分规则');
        return;
      }

      // 验证百分比总和是否为100
      const totalPercentage = rules.reduce((sum, rule) => sum + rule.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        alert(`文件解析失败：百分比总和必须为100%，当前为${totalPercentage}%`);
        return;
      }

      const newFile: ScoreAssignmentFile = {
        id: Date.now().toString(),
        name: file.name.replace(/\.txt$/i, ''),
        rules,
        enabledFields: enabledFields.length > 0 ? enabledFields : ['physics', 'chemistry', 'biology', 'politics', 'history', 'geography'], // 确保有默认值
        enabled: true, // 新导入的默认启用
        createdAt: Date.now(),
        isDefault: false,
      };

      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);
      saveScoreAssignmentFiles(updatedFiles);

      // 将系统字段key转换回映射后的列名用于显示
      const keyToMappedNameForDisplay: { [key: string]: string } = {};
      Object.entries(mappedNameToKeyMap).forEach(([name, key]) => {
        keyToMappedNameForDisplay[key] = name;
      });
      const enabledFieldsDisplay = enabledFields.map(f => keyToMappedNameForDisplay[f] || f).join(' ');

      alert(`文件导入成功！\n- 赋分规则数量: ${rules.length}\n- 生效字段: ${enabledFieldsDisplay}`);
    } catch (error) {
      console.error('Failed to parse score assignment file:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`文件解析失败：${errorMessage}\n\n请确保文件格式为：\n第一行：生效字段:物理 化学 生物 政治 历史 地理（多个字段用空格分隔）\n后续行：等级,百分比,最高分,最低分\n每行一个规则`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个赋分规则文件吗？')) {
      const updatedFiles = files.filter(f => f.id !== id);
      setFiles(updatedFiles);
      saveScoreAssignmentFiles(updatedFiles);
      
      if (activeId === id) {
        // 如果删除的是当前激活的文件，清除激活状态（将使用硬编码的默认规则）
        setActiveScoreAssignmentId(null);
      }
    }
  };

  const handleSetActive = (id: string) => {
    setActiveScoreAssignmentId(id);
    const loadedFiles = loadScoreAssignmentFiles();
    // 验证并修复文件数据，确保 enabledFields 存在
    const validatedFiles = loadedFiles.map(file => ({
      ...file,
      enabledFields: file.enabledFields || ['physics', 'chemistry', 'biology', 'politics', 'history', 'geography'],
    }));
    setFiles(validatedFiles);
    saveScoreAssignmentFiles(validatedFiles); // 保存修复后的数据
  };

  const handleExportTemplate = () => {
    const defaultRules = getDefaultScoreAssignment();
    
    // 获取当前激活的字段映射，用于显示映射后的列名
    const fieldMapping = getActiveFieldMapping();
    const mappings = fieldMapping?.mappings || {};
    
    // 创建系统字段key到映射后列名的映射
    const keyToMappedNameMap: { [key: string]: string } = {};
    const standardMappings: { [key: string]: string } = {
      '语文': 'chinese',
      '数学': 'math',
      '英语': 'english',
      '物理': 'physics',
      '化学': 'chemistry',
      '政治': 'politics',
      '历史': 'history',
      '地理': 'geography',
      '生物': 'biology',
    };
    
    // 先建立默认映射
    Object.entries(standardMappings).forEach(([name, key]) => {
      keyToMappedNameMap[key] = name;
    });
    
    // 然后用自定义映射覆盖（如果有）
    Object.entries(mappings).forEach(([, mappedCol]) => {
      const systemKey = standardMappings[mappedCol];
      if (systemKey) {
        keyToMappedNameMap[systemKey] = mappedCol;
      }
    });
    
    const enabledFieldsStr = (defaultRules.enabledFields || [])
      .map(field => keyToMappedNameMap[field] || field)
      .join(' ');
    
    const content = `生效字段:${enabledFieldsStr}\n${defaultRules.rules
      .map(rule => `${rule.grade},${rule.percentage},${rule.maxScore},${rule.minScore}`)
      .join('\n')}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '赋分规则模板.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleExport = (file: ScoreAssignmentFile) => {
    // 获取当前激活的字段映射，用于显示映射后的列名
    const fieldMapping = getActiveFieldMapping();
    const mappings = fieldMapping?.mappings || {};
    
    // 创建系统字段key到映射后列名的映射
    const keyToMappedNameMap: { [key: string]: string } = {};
    const standardMappings: { [key: string]: string } = {
      '语文': 'chinese',
      '数学': 'math',
      '英语': 'english',
      '物理': 'physics',
      '化学': 'chemistry',
      '政治': 'politics',
      '历史': 'history',
      '地理': 'geography',
      '生物': 'biology',
    };
    
    // 先建立默认映射
    Object.entries(standardMappings).forEach(([name, key]) => {
      keyToMappedNameMap[key] = name;
    });
    
    // 然后用自定义映射覆盖（如果有）
    Object.entries(mappings).forEach(([, mappedCol]) => {
      const systemKey = standardMappings[mappedCol];
      if (systemKey) {
        keyToMappedNameMap[systemKey] = mappedCol;
      }
    });
    
    const enabledFieldsStr = (file.enabledFields || [])
      .map(field => keyToMappedNameMap[field] || field)
      .join(' ');
    
    const content = `生效字段:${enabledFieldsStr}\n${file.rules
      .map(rule => `${rule.grade},${rule.percentage},${rule.maxScore},${rule.minScore}`)
      .join('\n')}`;
    
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

  const defaultFile = getDefaultScoreAssignment();
  
  // 获取当前激活的字段映射，用于显示
  const fieldMapping = getActiveFieldMapping();
  const mappings = fieldMapping?.mappings || {};
  
  // 创建系统字段key到映射后列名的映射（用于显示）
  const getKeyToMappedNameMap = (): { [key: string]: string } => {
    const keyToMappedNameMap: { [key: string]: string } = {};
    const standardMappings: { [key: string]: string } = {
      '语文': 'chinese',
      '数学': 'math',
      '英语': 'english',
      '物理': 'physics',
      '化学': 'chemistry',
      '政治': 'politics',
      '历史': 'history',
      '地理': 'geography',
      '生物': 'biology',
    };
    
    // 先建立默认映射
    Object.entries(standardMappings).forEach(([name, key]) => {
      keyToMappedNameMap[key] = name;
    });
    
    // 然后用自定义映射覆盖（如果有）
    Object.entries(mappings).forEach(([, mappedCol]) => {
      const systemKey = standardMappings[mappedCol];
      if (systemKey) {
        keyToMappedNameMap[systemKey] = mappedCol;
      }
    });
    
    return keyToMappedNameMap;
  };
  
  const keyToMappedNameMap = getKeyToMappedNameMap();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark-text mb-2">赋分规则管理</h1>
        <p className="text-dark-textSecondary">
          管理赋分规则，支持导入导出赋分规则文件
        </p>
        <p className="text-sm text-dark-textTertiary mt-1">
          注意：生效字段应使用解析字段管理中映射后的列名（当前激活的字段映射：{fieldMapping?.name || '默认'}）
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-dark-text mb-1">
                导入赋分规则文件
              </h3>
              <p className="text-sm text-dark-textTertiary">
                支持 .txt 格式，每行一个规则，格式：等级,百分比,最高分,最低分
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
                id="score-assignment-upload"
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
                导出默认模板
              </Button>
            </div>
          </div>
          <div className="text-xs text-dark-textTertiary bg-dark-surface2 rounded-lg p-3">
            <p className="font-semibold mb-1">提示：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>第一行：生效字段，格式为 "生效字段:物理 化学 生物 政治 历史 地理"（可选，不指定则默认对所有选考科目生效，多个字段用空格分隔）</li>
              <li>后续行：每行一个规则，格式为 "等级,百分比,最高分,最低分"</li>
              <li>示例：A,15,95,83</li>
              <li>百分比总和必须为100%</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Default Template */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-text">默认赋分规则模板</h2>
        </div>
        <div className="mb-4">
          <p className="text-sm text-dark-textSecondary mb-2">
            <span className="font-semibold">生效字段：</span>
            {defaultFile.enabledFields.map(field => keyToMappedNameMap[field] || field).join('、')}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 px-4 text-dark-text font-medium">等级</th>
                <th className="text-left py-2 px-4 text-dark-text font-medium">区间</th>
                <th className="text-left py-2 px-4 text-dark-text font-medium">赋分最高值</th>
                <th className="text-left py-2 px-4 text-dark-text font-medium">赋分最低值</th>
              </tr>
            </thead>
            <tbody>
              {defaultFile.rules.map((rule, index) => (
                <tr key={index} className="border-b border-dark-border/50">
                  <td className="py-2 px-4 text-dark-text">{rule.grade}</td>
                  <td className="py-2 px-4 text-dark-text">{rule.percentage}%</td>
                  <td className="py-2 px-4 text-dark-text">{rule.maxScore}</td>
                  <td className="py-2 px-4 text-dark-text">{rule.minScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Files List */}
      <Card>
        <h3 className="text-lg font-semibold text-dark-text mb-4">
          赋分规则文件 ({files.length})
        </h3>
        {files.length === 0 ? (
          <div className="text-center py-12 text-dark-textTertiary">
            <p>还没有导入任何赋分规则文件</p>
            <p className="text-sm mt-2">点击上方按钮导入规则文件，或使用默认模板</p>
            {!activeId && (
              <p className="text-sm mt-2 text-blue-400">
                当前使用硬编码的默认赋分规则
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className={`p-4 rounded-xl border ${
                  activeId === file.id
                    ? 'bg-dark-surface2 border-blue-500/50'
                    : 'bg-dark-surface border-dark-border'
                } transition-all duration-200`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-dark-text">{file.name}</h4>
                      {file.isDefault && (
                        <span className="px-2 py-0.5 text-xs rounded-lg bg-dark-surface text-dark-textSecondary">
                          默认
                        </span>
                      )}
                      {activeId === file.id && (
                        <span className="px-2 py-0.5 text-xs rounded-lg bg-blue-500/20 text-blue-400">
                          当前生效
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-dark-textTertiary space-y-1">
                      <p>规则数量: {file.rules.length}</p>
                      <p>
                        生效字段:{' '}
                        {(file.enabledFields || []).map(field => keyToMappedNameMap[field] || field).join('、')}
                      </p>
                      <p>
                        创建时间:{' '}
                        {new Date(file.createdAt || 0).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeId !== file.id && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetActive(file.id)}
                      >
                        设为生效
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleExport(file)}
                      className="flex items-center gap-1"
                    >
                      <Download size={16} />
                      导出
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(file.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
