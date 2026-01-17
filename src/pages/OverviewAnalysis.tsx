import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { ExamSubjectFilter } from '../components/ExamSubjectFilter';
import { MultiDimensionLineChart } from '../components/charts/MultiDimensionLineChart';
import { HeatmapChart } from '../components/charts/HeatmapChart';
import { BarChart } from '../components/charts/BarChart';
import {
  getExamNumbers,
  filterByExamNumbers,
  getAverageScores,
  getCorrelationMatrix,
  getTopStudents,
  getStandardDeviation,
  getClassAdvantage,
} from '../utils/analysis';
import { SUBJECTS } from '../types';

export function OverviewAnalysis() {
  const { activeFile } = useData();
  const [selectedExams, setSelectedExams] = useState<number[]>([]);
  const [subjectType, setSubjectType] = useState<'total' | 'subject'>('total');
  const [selectedSubject, setSelectedSubject] = useState<string>('total');

  const filteredData = useMemo(() => {
    if (!activeFile) return [];
    return filterByExamNumbers(
      activeFile.data,
      selectedExams.length > 0 ? selectedExams : null
    );
  }, [activeFile, selectedExams]);

  const examNumbers = useMemo(() => {
    if (!activeFile) return [];
    return getExamNumbers(activeFile.data);
  }, [activeFile]);

  const examNames = useMemo(() => {
    if (!activeFile) return {};
    const names: { [key: number]: string } = {};
    activeFile.data.forEach(exam => {
      names[exam.examNumber] = exam.examName;
    });
    return names;
  }, [activeFile]);

  const averageScores = useMemo(() => {
    const scores = getAverageScores(filteredData);
    // 如果选择了单科，只返回该学科的数据
    if (subjectType === 'subject' && selectedSubject !== 'total') {
      const filtered: { [key: string]: { exam: number; subject: string; average: number }[] } = {};
      filtered[selectedSubject] = scores[selectedSubject] || [];
      return filtered;
    }
    return scores;
  }, [filteredData, subjectType, selectedSubject]);

  const correlationMatrix = useMemo(() => {
    return getCorrelationMatrix(filteredData);
  }, [filteredData]);

  const topStudents = useMemo(() => {
    const subject = subjectType === 'total' ? 'total' : selectedSubject;
    return getTopStudents(filteredData, 20, subject);
  }, [filteredData, subjectType, selectedSubject]);

  const standardDeviation = useMemo(() => {
    const deviation = getStandardDeviation(filteredData);
    // 如果选择了单科，只返回该学科的数据
    if (subjectType === 'subject' && selectedSubject !== 'total') {
      const filtered: { [key: string]: { exam: number; subject: string; stdDev: number }[] } = {};
      filtered[selectedSubject] = deviation[selectedSubject] || [];
      return filtered;
    }
    return deviation;
  }, [filteredData, subjectType, selectedSubject]);

  const classAdvantage = useMemo(() => {
    return getClassAdvantage(filteredData, 50);
  }, [filteredData]);

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
        <h1 className="text-3xl font-bold text-dark-text mb-2">成绩总体分析</h1>
        <p className="text-dark-textSecondary">
          分析所有班级和学生的整体成绩趋势与分布
        </p>
      </div>

      {/* Exam and Subject Filter */}
      <ExamSubjectFilter
        examNumbers={examNumbers}
        examNames={examNames}
        selectedExams={selectedExams}
        onExamsChange={setSelectedExams}
        subjectType={subjectType}
        selectedSubject={selectedSubject}
        onSubjectTypeChange={setSubjectType}
        onSubjectChange={setSelectedSubject}
      />

      {/* Subject Trends */}
      <Card title="学科趋势与平均分" subtitle="各学科历次考试的平均分变化趋势">
        {(() => {
          const chartData = Object.values(averageScores).flat();
          console.log('OverviewAnalysis - Subject Trends Chart Data:', {
            subjectType,
            selectedSubject,
            averageScores,
            chartData,
            uniqueSubjects: Array.from(new Set(chartData.map(d => d.subject))),
          });
          return (
            <MultiDimensionLineChart
              data={chartData}
              height={550}
            />
          );
        })()}
      </Card>

      {/* Correlation Matrix */}
      <Card title="科目成绩关联性" subtitle="各科目成绩之间的相关性分析">
        <HeatmapChart matrix={correlationMatrix} height={500} />
      </Card>

      {/* Top Students */}
      <Card 
        title="领航榜单" 
        subtitle={`年级${SUBJECTS.find(s => s.key === (subjectType === 'total' ? 'total' : selectedSubject))?.label || '总分'}前20名学生`}
      >
        <BarChart data={topStudents} topN={20} height={500} />
      </Card>

      {/* Standard Deviation */}
      <Card title="标准差分析" subtitle="各学科成绩的离散程度">
        <MultiDimensionLineChart
          data={Object.values(standardDeviation).flat().map(d => ({ ...d, average: d.stdDev }))}
          height={550}
        />
      </Card>

      {/* Class Advantage */}
      <Card title="班级学科优势分析" subtitle="各班级在不同学科上的前50名人数占比">
        <div className="text-dark-textTertiary text-sm mb-4">
          数据展示各班级在各学科前50名中的人数占比
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(subjectType === 'subject' && selectedSubject !== 'total'
            ? SUBJECTS.filter(s => s.key === selectedSubject)
            : SUBJECTS.filter(s => s.key !== 'total')
          ).map((subject) => {
            const subjectData = classAdvantage.filter(
              d => d.subject === subject.label
            );
            return (
              <div key={subject.key} className="bg-dark-surface2 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-dark-text mb-2">
                  {subject.label}
                </h4>
                <div className="space-y-1">
                  {subjectData.slice(0, 5).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-dark-textSecondary">{item.class}</span>
                      <span className="text-dark-text">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
