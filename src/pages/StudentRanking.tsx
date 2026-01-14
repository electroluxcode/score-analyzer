import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { StudentRankingFilter } from '../components/StudentRankingFilter';
import {
  getExamNumbers,
  filterByExamNumbers,
} from '../utils/analysis';

export function StudentRanking() {
  const { activeFile } = useData();
  const [selectedExams, setSelectedExams] = useState<number[]>([]);

  const examNumbers = useMemo(() => {
    if (!activeFile) return [];
    return getExamNumbers(activeFile.data);
  }, [activeFile]);

  const filteredData = useMemo(() => {
    if (!activeFile) return [];
    return filterByExamNumbers(
      activeFile.data,
      selectedExams.length > 0 ? selectedExams : null
    );
  }, [activeFile, selectedExams]);

  if (!activeFile) {
    return (
      <div className="text-center py-12 text-dark-textTertiary">
        <p>请先在数据管理页面导入并选择生效的 Excel 文件</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark-text mb-2">学生排名筛选</h1>
        <p className="text-dark-textSecondary">
          根据年级/班级、学科/总分筛选前N名学生，支持导出Excel
        </p>
      </div>

      {/* Exam Selector */}
      <Card>
        <div>
          <label className="text-sm font-medium text-dark-textSecondary mb-2 block">
            选择考试次数（不选择则分析全部）
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {examNumbers.map((num) => (
              <label
                key={num}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-surface2 border border-dark-border cursor-pointer hover:bg-dark-surface3 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedExams.includes(num)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedExams([...selectedExams, num]);
                    } else {
                      setSelectedExams(selectedExams.filter(n => n !== num));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm text-dark-textSecondary">第{num}次</span>
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Student Ranking Filter */}
      <StudentRankingFilter data={filteredData} />
    </div>
  );
}
