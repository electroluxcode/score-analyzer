import { useState, useMemo } from 'react';
import type { ExamData, Student } from '../types';
import { SUBJECTS } from '../types';
import { getClasses } from '../utils/analysis';
import { Card } from './Card';
import { Select } from './Select';
import { Input } from './Input';
import { Button } from './Button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface StudentRankingFilterProps {
  data: ExamData[];
}

export function StudentRankingFilter({ data }: StudentRankingFilterProps) {
  const [scopeType, setScopeType] = useState<'grade' | 'class'>('grade');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [subjectType, setSubjectType] = useState<'subject' | 'total'>('total');
  const [selectedSubject, setSelectedSubject] = useState<string>('total');
  const [topN, setTopN] = useState<number>(50);

  const classes = useMemo(() => {
    return getClasses(data);
  }, [data]);

  const filteredStudents = useMemo(() => {
    if (data.length === 0) return [];

    // 合并所有考试的学生数据
    const allStudents: (Student & { examNumber: number })[] = [];
    data.forEach(exam => {
      exam.students.forEach(student => {
        allStudents.push({
          ...student,
          examNumber: exam.examNumber,
        });
      });
    });

    // 根据范围筛选
    let scopeFiltered = allStudents;
    if (scopeType === 'class' && selectedClass) {
      scopeFiltered = allStudents.filter(s => s.classNumber === selectedClass);
    }

    // 根据学科筛选并排序
    const subjectKey = selectedSubject as keyof Student['scores'];
    const sorted = scopeFiltered
      .filter(s => {
        const score = s.scores[subjectKey];
        return score !== null && score !== undefined && score > 0;
      })
      .sort((a, b) => {
        const scoreA = a.scores[subjectKey] || 0;
        const scoreB = b.scores[subjectKey] || 0;
        return scoreB - scoreA; // 降序
      })
      .slice(0, topN);

    return sorted;
  }, [data, scopeType, selectedClass, selectedSubject, topN]);

  const handleExport = () => {
    if (filteredStudents.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheetData: any[][] = [];

    // 表头
    worksheetData.push([
      '排名',
      '姓名',
      '学号',
      '班级',
      '考试次数',
      '考试时间',
      ...SUBJECTS.map(s => s.label),
      ...SUBJECTS.map(s => `${s.label}排名`),
    ]);

    // 数据行
    filteredStudents.forEach((student, index) => {
      worksheetData.push([
        index + 1,
        student.name,
        student.studentId,
        student.classNumber,
        student.examNumber,
        student.examTime,
        student.scores.chinese,
        student.scores.math,
        student.scores.english,
        student.scores.physics,
        student.scores.chemistry,
        student.scores.politics,
        student.scores.history,
        student.scores.geography,
        student.scores.biology,
        student.scores.total,
        student.ranks.chinese,
        student.ranks.math,
        student.ranks.english,
        student.ranks.physics,
        student.ranks.chemistry,
        student.ranks.politics,
        student.ranks.history,
        student.ranks.geography,
        student.ranks.biology,
        student.ranks.total,
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // 设置列宽
    const colWidths = [
      { wch: 8 },  // 排名
      { wch: 10 }, // 姓名
      { wch: 12 }, // 学号
      { wch: 12 }, // 班级
      { wch: 10 }, // 考试次数
      { wch: 15 }, // 考试时间
      ...Array(10).fill({ wch: 8 }),  // 各科成绩
      ...Array(10).fill({ wch: 12 }), // 各科排名
    ];
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, '学生排名');

    const scopeLabel = scopeType === 'grade' ? '年级' : selectedClass;
    const subjectLabel = SUBJECTS.find(s => s.key === selectedSubject)?.label || '总分';
    const filename = `学生排名_${scopeLabel}_${subjectLabel}_前${topN}名_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
  };

  return (
    <Card title="学生排名筛选" subtitle="根据年级/班级、学科/总分筛选前N名学生">
      <div className="space-y-4">
        {/* 筛选条件 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="范围"
            value={scopeType}
            onChange={(e) => {
              setScopeType(e.target.value as 'grade' | 'class');
              if (e.target.value === 'grade') {
                setSelectedClass('');
              }
            }}
          >
            <option value="grade">年级</option>
            <option value="class">班级</option>
          </Select>

          {scopeType === 'class' && (
            <Select
              label="选择班级"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">请选择班级</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </Select>
          )}

          <Select
            label="类型"
            value={subjectType}
            onChange={(e) => {
              setSubjectType(e.target.value as 'subject' | 'total');
              if (e.target.value === 'total') {
                setSelectedSubject('total');
              } else if (selectedSubject === 'total') {
                setSelectedSubject('chinese');
              }
            }}
          >
            <option value="total">总分</option>
            <option value="subject">单科</option>
          </Select>

          {subjectType === 'subject' && (
            <Select
              label="选择学科"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              {SUBJECTS.filter(s => s.key !== 'total').map((subject) => (
                <option key={subject.key} value={subject.key}>
                  {subject.label}
                </option>
              ))}
            </Select>
          )}

          <Input
            label="前N名"
            type="number"
            value={topN}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value > 0) {
                setTopN(Math.min(value, 1000)); // 限制最大1000
              }
            }}
            min={1}
            max={1000}
          />
        </div>

        {/* 统计信息 */}
        <div className="flex items-center justify-between p-4 bg-dark-surface2 rounded-xl">
          <div className="text-sm text-dark-textSecondary">
            <span className="font-semibold text-dark-text">
              {filteredStudents.length}
            </span>
            {' '}名学生
            {scopeType === 'class' && selectedClass && (
              <>（{selectedClass}）</>
            )}
          </div>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={filteredStudents.length === 0}
            className="flex items-center gap-2"
          >
            <Download size={18} />
            导出Excel
          </Button>
        </div>

        {/* 学生列表 */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-dark-textTertiary">
            <p>没有符合条件的学生</p>
            <p className="text-sm mt-2">请调整筛选条件</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-dark-border">
            <div className="min-w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-dark-surface2 border-b border-dark-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-text uppercase tracking-wider">
                      排名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-text uppercase tracking-wider">
                      姓名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-text uppercase tracking-wider hidden md:table-cell">
                      学号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-text uppercase tracking-wider">
                      班级
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-text uppercase tracking-wider hidden lg:table-cell">
                      考试
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-dark-text uppercase tracking-wider">
                      {SUBJECTS.find(s => s.key === selectedSubject)?.label || '总分'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-dark-text uppercase tracking-wider">
                      排名
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {filteredStudents.map((student, index) => {
                    const subjectKey = selectedSubject as keyof Student['scores'];
                    const score = student.scores[subjectKey] || 0;
                    const rank = student.ranks[subjectKey as keyof Student['ranks']] || 0;
                    const isTop3 = index < 3;
                    
                    return (
                      <tr
                        key={`${student.studentId}-${student.examNumber}`}
                        className={`hover:bg-dark-surface2 transition-colors ${
                          isTop3 ? 'bg-dark-surface2/50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                            index === 0 
                              ? 'bg-yellow-500/20 text-yellow-400 font-bold' 
                              : index === 1 
                              ? 'bg-gray-400/20 text-gray-300 font-bold'
                              : index === 2
                              ? 'bg-orange-500/20 text-orange-400 font-bold'
                              : 'text-dark-textSecondary'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-dark-text">
                          {student.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-dark-textSecondary hidden md:table-cell">
                          {student.studentId}
                        </td>
                        <td className="px-4 py-3 text-sm text-dark-textSecondary">
                          {student.classNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-dark-textSecondary hidden lg:table-cell">
                          第{student.examNumber}次
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-right text-dark-text">
                          <span className="text-blue-400">
                            {typeof score === 'number' ? score.toFixed(1) : score}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-dark-textSecondary">
                          {rank || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
