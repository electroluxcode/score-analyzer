import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { Select } from '../components/Select';
import { Input } from '../components/Input';
import { MultiDimensionLineChart } from '../components/charts/MultiDimensionLineChart';
import { HeatmapChart } from '../components/charts/HeatmapChart';
import { BarChart } from '../components/charts/BarChart';
import { RadarChart } from '../components/charts/RadarChart';
import {
  getExamNumbers,
  getClasses,
  filterByExamNumbers,
  getAverageScores,
  getCorrelationMatrix,
  getTopStudents,
  getStandardDeviation,
} from '../utils/analysis';
import { SUBJECTS } from '../types';

export function ClassAnalysis() {
  const { activeFile } = useData();
  const [selectedExams, setSelectedExams] = useState<number[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchClass, setSearchClass] = useState('');
  const [subjectType, setSubjectType] = useState<'total' | 'subject'>('total');
  const [selectedSubject, setSelectedSubject] = useState<string>('total');

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

  const classes = useMemo(() => {
    if (!activeFile) return [];
    return getClasses(activeFile.data);
  }, [activeFile]);

  const filteredData = useMemo(() => {
    if (!activeFile) return [];
    return filterByExamNumbers(
      activeFile.data,
      selectedExams.length > 0 ? selectedExams : null
    );
  }, [activeFile, selectedExams]);

  const classData = useMemo(() => {
    if (!selectedClass) return [];
    return filteredData.map(exam => ({
      ...exam,
      students: exam.students.filter(s => s.classNumber === selectedClass),
    }));
  }, [filteredData, selectedClass]);

  const classAverageScores = useMemo(() => {
    const scores = getAverageScores(classData, selectedClass);
    // 如果选择了单科，只返回该学科的数据
    if (subjectType === 'subject' && selectedSubject !== 'total') {
      const filtered: { [key: string]: { exam: number; subject: string; average: number }[] } = {};
      filtered[selectedSubject] = scores[selectedSubject] || [];
      return filtered;
    }
    return scores;
  }, [classData, selectedClass, subjectType, selectedSubject]);

  const gradeAverageScores = useMemo(() => {
    const scores = getAverageScores(filteredData);
    // 如果选择了单科，只返回该学科的数据
    if (subjectType === 'subject' && selectedSubject !== 'total') {
      const filtered: { [key: string]: { exam: number; subject: string; average: number }[] } = {};
      filtered[selectedSubject] = scores[selectedSubject] || [];
      return filtered;
    }
    return scores;
  }, [filteredData, subjectType, selectedSubject]);

  const classCorrelationMatrix = useMemo(() => {
    return getCorrelationMatrix(classData);
  }, [classData]);

  const classTopStudents = useMemo(() => {
    const subject = subjectType === 'total' ? 'total' : selectedSubject;
    return getTopStudents(classData, 20, subject);
  }, [classData, subjectType, selectedSubject]);

  const classStandardDeviation = useMemo(() => {
    const deviation = getStandardDeviation(classData, selectedClass);
    // 如果选择了单科，只返回该学科的数据
    if (subjectType === 'subject' && selectedSubject !== 'total') {
      const filtered: { [key: string]: { exam: number; subject: string; stdDev: number }[] } = {};
      filtered[selectedSubject] = deviation[selectedSubject] || [];
      return filtered;
    }
    return deviation;
  }, [classData, selectedClass, subjectType, selectedSubject]);

  const studentAverages = useMemo(() => {
    if (!selectedClass || classData.length === 0) return [];
    
    const studentMap = new Map<string, { name: string; values: number[] }>();
    
    classData.forEach(exam => {
      exam.students.forEach(student => {
        if (!studentMap.has(student.studentId)) {
          studentMap.set(student.studentId, {
            name: student.name,
            values: [],
          });
        }
      });
    });

    SUBJECTS.filter(s => s.key !== 'total').forEach(subject => {
      const subjectKey = subject.key;
      studentMap.forEach((data, studentId) => {
        const scores: number[] = [];
        classData.forEach(exam => {
          const student = exam.students.find(s => s.studentId === studentId);
          if (student) {
            const score = student.scores[subjectKey as keyof typeof student.scores];
            if (score && score > 0) {
              scores.push(score);
            }
          }
        });
        const average = scores.length > 0
          ? scores.reduce((sum, s) => sum + s, 0) / scores.length
          : 0;
        data.values.push(average);
      });
    });

    return Array.from(studentMap.values()).slice(0, 10);
  }, [classData, selectedClass]);

  const filteredClasses = useMemo(() => {
    if (!searchClass) return classes;
    return classes.filter(c => c.includes(searchClass));
  }, [classes, searchClass]);

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
        <h1 className="text-3xl font-bold text-dark-text mb-2">成绩班级分析</h1>
        <p className="text-dark-textSecondary">
          分析指定班级的成绩趋势、学生表现和学科分布
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-dark-textSecondary mb-3 block">
              选择考试次数（不选择则分析全部）
            </label>
            <div className="flex flex-wrap gap-2.5">
              {examNumbers.map((num) => (
                <label
                  key={num}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-surface2 border border-dark-border cursor-pointer hover:bg-dark-surface3 transition-colors"
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
                    className="rounded w-4 h-4"
                  />
                  <span className="text-sm text-dark-textSecondary font-medium">{examNames[num] || `第${num}次`}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="border-t border-dark-border pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Select
                  label="学科类型"
                  value={subjectType}
                  onChange={(e) => {
                    const type = e.target.value as 'total' | 'subject';
                    setSubjectType(type);
                    if (type === 'total') {
                      setSelectedSubject('total');
                    } else if (selectedSubject === 'total') {
                      setSelectedSubject('chinese');
                    }
                  }}
                >
                  <option value="total">总分</option>
                  <option value="subject">单科</option>
                </Select>
                <Select
                  label="选择学科"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={subjectType === 'total'}
                >
                  {subjectType === 'total' ? (
                    <option value="total">总分</option>
                  ) : (
                    SUBJECTS.filter(s => s.key !== 'total').map((subject) => (
                      <option key={subject.key} value={subject.key}>
                        {subject.label}
                      </option>
                    ))
                  )}
                </Select>
              </div>
              <div className="space-y-4">
                <Input
                  label="搜索班级"
                  value={searchClass}
                  onChange={(e) => setSearchClass(e.target.value)}
                  placeholder="输入班级名称..."
                />
                <Select
                  label="选择班级"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">请选择班级</option>
                  {filteredClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {!selectedClass ? (
        <Card>
          <div className="text-center py-12 text-dark-textTertiary">
            <p>请选择一个班级开始分析</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Subject Trends */}
          <Card title="学科趋势与平均分" subtitle={`${selectedClass} 班级各学科平均分趋势（与年级平均对比）`}>
            {(() => {
              const chartData = [
                ...Object.values(classAverageScores).flat().map(d => ({ ...d, type: 'class' })),
                ...Object.values(gradeAverageScores).flat().map(d => ({ ...d, type: 'grade' })),
              ];
              console.log('ClassAnalysis - Subject Trends Chart Data:', {
                subjectType,
                selectedSubject,
                classAverageScores,
                gradeAverageScores,
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

          {/* Student Averages */}
          <Card title="学生各科平均" subtitle={`${selectedClass} 班级内学生各科平均分雷达图`}>
            <RadarChart data={studentAverages} height={500} />
          </Card>

          {/* Correlation */}
          <Card title="科目关联性" subtitle={`${selectedClass} 班级各科目成绩相关性`}>
            <HeatmapChart matrix={classCorrelationMatrix} height={500} />
          </Card>

          {/* Standard Deviation */}
          <Card title="标准差分析" subtitle={`${selectedClass} 班级各学科成绩离散程度`}>
            <MultiDimensionLineChart
              data={Object.values(classStandardDeviation).flat().map(d => ({ ...d, average: d.stdDev }))}
              height={550}
            />
          </Card>

          {/* Top Students */}
          <Card 
            title="班级领航榜单" 
            subtitle={`${selectedClass} 班级${SUBJECTS.find(s => s.key === (subjectType === 'total' ? 'total' : selectedSubject))?.label || '总分'}排名`}
          >
            <BarChart data={classTopStudents} topN={20} height={500} />
          </Card>
        </>
      )}
    </div>
  );
}
