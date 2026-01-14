import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { MultiDimensionLineChart } from '../components/charts/MultiDimensionLineChart';
import { HeatmapChart } from '../components/charts/HeatmapChart';
import { RadarChart } from '../components/charts/RadarChart';
import {
  getStudents,
  getAverageScores,
  getCorrelationMatrix,
  getExamNumbers,
  filterByExamNumbers,
} from '../utils/analysis';
import { SUBJECTS } from '../types';

export function PersonalAnalysis() {
  const { activeFile } = useData();
  const [searchName, setSearchName] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
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

  const allStudents = useMemo(() => {
    if (!activeFile) return [];
    return getStudents(filteredData);
  }, [activeFile, filteredData]);

  const filteredStudents = useMemo(() => {
    if (!searchName) return allStudents.slice(0, 20);
    return allStudents.filter(s =>
      s.name.toLowerCase().includes(searchName.toLowerCase())
    ).slice(0, 20);
  }, [allStudents, searchName]);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId || !activeFile) return null;
    
    const studentData: { exam: number; scores: any; ranks: any }[] = [];
    
    filteredData.forEach(exam => {
      const student = exam.students.find(s => s.studentId === selectedStudentId);
      if (student) {
        studentData.push({
          exam: exam.examNumber,
          scores: student.scores,
          ranks: student.ranks,
        });
      }
    });
    
    return {
      info: allStudents.find(s => s.studentId === selectedStudentId),
      data: studentData.sort((a, b) => a.exam - b.exam),
    };
  }, [selectedStudentId, activeFile, filteredData, allStudents]);

  const studentTrendData = useMemo(() => {
    if (!selectedStudent) return [];
    
    const result: { exam: number; subject: string; score: number }[] = [];
    
    const subjectsToShow = subjectType === 'subject' && selectedSubject !== 'total'
      ? SUBJECTS.filter(s => s.key === selectedSubject)
      : SUBJECTS;
    
    subjectsToShow.forEach(subject => {
      selectedStudent.data.forEach(examData => {
        const score = examData.scores[subject.key as keyof typeof examData.scores];
        if (score && score > 0) {
          result.push({
            exam: examData.exam,
            subject: subject.label,
            score,
          });
        }
      });
    });
    
    return result;
  }, [selectedStudent, subjectType, selectedSubject]);

  const classAverageScores = useMemo(() => {
    if (!selectedStudent || !activeFile) return [];
    
    const studentClass = selectedStudent.info?.classNumber;
    if (!studentClass) return [];
    
    const scores = getAverageScores(
      filteredData.map(exam => ({
        ...exam,
        students: exam.students.filter(s => s.classNumber === studentClass),
      })),
      studentClass
    );
    
    // 如果选择了单科，只返回该学科的数据
    if (subjectType === 'subject' && selectedSubject !== 'total') {
      const filtered: { [key: string]: { exam: number; subject: string; average: number }[] } = {};
      filtered[selectedSubject] = scores[selectedSubject] || [];
      return filtered;
    }
    return scores;
  }, [selectedStudent, activeFile, filteredData, subjectType, selectedSubject]);

  const gradeAverageScores = useMemo(() => {
    if (!activeFile) return [];
    const scores = getAverageScores(filteredData);
    // 如果选择了单科，只返回该学科的数据
    if (subjectType === 'subject' && selectedSubject !== 'total') {
      const filtered: { [key: string]: { exam: number; subject: string; average: number }[] } = {};
      filtered[selectedSubject] = scores[selectedSubject] || [];
      return filtered;
    }
    return scores;
  }, [activeFile, filteredData, subjectType, selectedSubject]);

  const studentCorrelationMatrix = useMemo(() => {
    if (!selectedStudent || !activeFile) return [];
    
    // 创建只包含该学生的数据
    const studentData = filteredData.map(exam => ({
      ...exam,
      students: exam.students.filter(s => s.studentId === selectedStudentId),
    }));
    
    return getCorrelationMatrix(studentData);
  }, [selectedStudent, selectedStudentId, activeFile, filteredData]);

  const studentRadarData = useMemo(() => {
    if (!selectedStudent) return [];
    
    const averages: number[] = [];
    const subjectsToShow = subjectType === 'subject' && selectedSubject !== 'total'
      ? SUBJECTS.filter(s => s.key === selectedSubject && s.key !== 'total')
      : SUBJECTS.filter(s => s.key !== 'total');
    
    subjectsToShow.forEach(subject => {
      const scores = selectedStudent.data
        .map(d => d.scores[subject.key as keyof typeof d.scores])
        .filter(s => s && s > 0);
      const avg = scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;
      averages.push(avg);
    });
    
    return [{
      name: selectedStudent.info?.name || '',
      values: averages,
    }];
  }, [selectedStudent, subjectType, selectedSubject]);

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
        <h1 className="text-3xl font-bold text-dark-text mb-2">成绩个人分析</h1>
        <p className="text-dark-textSecondary">
          分析单个学生的成绩趋势、能力分布和学科关联性
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
                  <span className="text-sm text-dark-textSecondary font-medium">第{num}次</span>
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
                  label="搜索学生（支持姓名模糊搜索）"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="输入学生姓名..."
                />
                <Select
                  label="选择学生"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  <option value="">请选择学生</option>
                  {filteredStudents.map((student) => (
                    <option key={student.studentId} value={student.studentId}>
                      {student.name} ({student.classNumber})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {!selectedStudent ? (
        <Card>
          <div className="text-center py-12 text-dark-textTertiary">
            <p>请搜索并选择一个学生开始分析</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Personal Trend */}
          <Card
            title="个人成绩趋势"
            subtitle={`${selectedStudent.info?.name} 历次考试各科成绩及总分趋势（可对比班级/年级平均）`}
          >
            {(() => {
              const chartData = [
                ...studentTrendData.map(d => ({ ...d, average: d.score, type: 'personal' })),
                ...Object.values(classAverageScores).flat().map(d => ({ ...d, type: 'class' })),
                ...Object.values(gradeAverageScores).flat().map(d => ({ ...d, type: 'grade' })),
              ];
              console.log('PersonalAnalysis - Personal Trend Chart Data:', {
                subjectType,
                selectedSubject,
                studentTrendData,
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

          {/* Personal Ability Radar */}
          <Card
            title="个人能力象限"
            subtitle={`${selectedStudent.info?.name} 各学科的长期平均分雷达图`}
          >
            <RadarChart data={studentRadarData} height={500} />
          </Card>

          {/* Personal Correlation */}
          <Card
            title="学科关联性分析"
            subtitle={`${selectedStudent.info?.name} 自身各科目成绩间的相关性`}
          >
            <HeatmapChart matrix={studentCorrelationMatrix} height={500} />
          </Card>

          {/* Score Distribution */}
          <Card
            title="成绩分布对比"
            subtitle={`${selectedStudent.info?.name} 单次考试成绩与班级/年级分数分布对比`}
          >
            <div className="text-dark-textTertiary text-sm">
              <p>该功能需要更详细的统计数据进行可视化展示</p>
              <p className="mt-2">
                学生信息：{selectedStudent.info?.name} | 班级：{selectedStudent.info?.classNumber} | 学号：{selectedStudent.info?.studentId}
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
