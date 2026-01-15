import type { ExamData, Student } from '../types';
import { SUBJECTS } from '../types';

export function getExamNumbers(data: ExamData[]): number[] {
  return data.map(exam => exam.examNumber);
}

export function getClasses(data: ExamData[]): string[] {
  const classesSet = new Set<string>();
  data.forEach(exam => {
    exam.students.forEach(student => {
      if (student.classNumber) {
        classesSet.add(student.classNumber);
      }
    });
  });
  return Array.from(classesSet).sort();
}

export function getStudents(data: ExamData[]): Student[] {
  const studentsMap = new Map<string, Student>();
  data.forEach(exam => {
    exam.students.forEach(student => {
      if (!studentsMap.has(student.studentId)) {
        studentsMap.set(student.studentId, student);
      }
    });
  });
  return Array.from(studentsMap.values());
}

export function filterByExamNumbers(
  data: ExamData[],
  examNumbers: number[] | null
): ExamData[] {
  if (!examNumbers || examNumbers.length === 0) {
    return data;
  }
  return data.filter(exam => examNumbers.includes(exam.examNumber));
}

export function getAverageScores(
  data: ExamData[],
  classFilter?: string
): { [key: string]: { exam: number; subject: string; average: number }[] } {
  const result: { [key: string]: { exam: number; subject: string; average: number }[] } = {};
  
  SUBJECTS.forEach(subject => {
    result[subject.key] = [];
  });

  data.forEach(exam => {
    let students = exam.students;
    if (classFilter) {
      students = students.filter(s => s.classNumber === classFilter);
    }

    SUBJECTS.forEach(subject => {
      const scores = students
        .map(s => s.scores[subject.key as keyof typeof s.scores])
        .filter(score => score !== null && score !== undefined && score > 0);
      
      if (scores.length > 0) {
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        result[subject.key].push({
          exam: exam.examNumber,
          subject: subject.label,
          average: Math.round(average * 10) / 10,
        });
      }
    });
  });

  return result;
}

export function getCorrelationMatrix(data: ExamData[]): number[][] {
  const subjectKeys = SUBJECTS.map(s => s.key).filter(k => k !== 'total');
  const matrix: number[][] = [];

  subjectKeys.forEach((subject1, i) => {
    matrix[i] = [];
    subjectKeys.forEach((subject2, j) => {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        const scores1: number[] = [];
        const scores2: number[] = [];
        
        data.forEach(exam => {
          exam.students.forEach(student => {
            const s1 = student.scores[subject1 as keyof typeof student.scores];
            const s2 = student.scores[subject2 as keyof typeof student.scores];
            if (s1 && s2 && s1 > 0 && s2 > 0) {
              scores1.push(s1);
              scores2.push(s2);
            }
          });
        });

        if (scores1.length > 0) {
          matrix[i][j] = calculateCorrelation(scores1, scores2);
        } else {
          matrix[i][j] = 0;
        }
      }
    });
  });

  return matrix;
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100) / 100;
}

export function getTopStudents(
  data: ExamData[],
  topN: number,
  subject: string = 'total'
): { name: string; score: number; class: string; exam: number }[] {
  const results: { name: string; score: number; class: string; exam: number }[] = [];

  data.forEach(exam => {
    const students = [...exam.students]
      .map(s => ({
        name: s.name,
        score: s.scores[subject as keyof typeof s.scores] || 0,
        class: s.classNumber,
        exam: exam.examNumber,
      }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    results.push(...students);
  });

  return results;
}

export function getStandardDeviation(
  data: ExamData[],
  classFilter?: string
): { [key: string]: { exam: number; subject: string; stdDev: number }[] } {
  const result: { [key: string]: { exam: number; subject: string; stdDev: number }[] } = {};
  
  SUBJECTS.forEach(subject => {
    result[subject.key] = [];
  });

  data.forEach(exam => {
    let students = exam.students;
    if (classFilter) {
      students = students.filter(s => s.classNumber === classFilter);
    }

    SUBJECTS.forEach(subject => {
      const scores = students
        .map(s => s.scores[subject.key as keyof typeof s.scores])
        .filter(score => score !== null && score !== undefined && score > 0);
      
      if (scores.length > 1) {
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        result[subject.key].push({
          exam: exam.examNumber,
          subject: subject.label,
          stdDev: Math.round(stdDev * 10) / 10,
        });
      }
    });
  });

  return result;
}

export function getClassAdvantage(
  data: ExamData[],
  topN: number = 50
): { class: string; subject: string; count: number; percentage: number }[] {
  const results: { class: string; subject: string; count: number; percentage: number }[] = [];
  const classes = getClasses(data);

  data.forEach(exam => {
    SUBJECTS.forEach(subject => {
      const allStudents = [...exam.students]
        .map(s => ({
          name: s.name,
          class: s.classNumber,
          score: s.scores[subject.key as keyof typeof s.scores] || 0,
        }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

      const topStudents = allStudents.slice(0, topN);
      const topStudentIds = new Set(topStudents.map(s => s.name));

      classes.forEach(classNum => {
        const classStudents = exam.students.filter(s => s.classNumber === classNum);
        const classTopCount = classStudents.filter(s => topStudentIds.has(s.name)).length;
        const percentage = classStudents.length > 0 
          ? Math.round((classTopCount / classStudents.length) * 1000) / 10 
          : 0;

        results.push({
          class: classNum,
          subject: subject.label,
          count: classTopCount,
          percentage,
        });
      });
    });
  });

  return results;
}

// 判断学生是物理类还是历史类
function getStudentCategory(student: Student): 'physics' | 'history' | 'unknown' {
  const hasPhysics = student.scores.physics && student.scores.physics > 0;
  const hasHistory = student.scores.history && student.scores.history > 0;
  
  // 如果同时有物理和历史，根据哪个分数更高来判断
  if (hasPhysics && hasHistory) {
    return student.scores.physics > student.scores.history ? 'physics' : 'history';
  }
  if (hasPhysics) return 'physics';
  if (hasHistory) return 'history';
  return 'unknown';
}

// 计算四总（语文+数学+英语+历史/物理）
function calculateFourTotal(student: Student, category: 'physics' | 'history'): number {
  const chinese = student.scores.chinese || 0;
  const math = student.scores.math || 0;
  const english = student.scores.english || 0;
  const subject = category === 'physics' ? (student.scores.physics || 0) : (student.scores.history || 0);
  return chinese + math + english + subject;
}

// 计算六总（语文+数学+英语+历史/物理+化学+政治）
function calculateSixTotal(student: Student, category: 'physics' | 'history'): number {
  const fourTotal = calculateFourTotal(student, category);
  const chemistry = student.scores.chemistry || 0;
  const politics = student.scores.politics || 0;
  return fourTotal + chemistry + politics;
}

// 有效值分析：统计物理类/历史类在各科目前N名的人数
export interface EffectiveValueData {
  exam: number;
  category: 'physics' | 'history';
  subject: string;
  topN: number;
  classCounts: { [classNumber: string]: number };
  totalCount: number;
}

export function getEffectiveValueAnalysis(
  data: ExamData[],
  topN: number
): EffectiveValueData[] {
  const results: EffectiveValueData[] = [];
  
  // 需要分析的科目
  const analysisSubjects: Array<{
    key: string;
    label: string;
    getScore: (s: Student, cat?: 'physics' | 'history') => number;
    physicsOnly: boolean;
    historyOnly: boolean;
  }> = [
    { key: 'chinese', label: '语文', getScore: (s: Student) => s.scores.chinese || 0, physicsOnly: false, historyOnly: false },
    { key: 'math', label: '数学', getScore: (s: Student) => s.scores.math || 0, physicsOnly: false, historyOnly: false },
    { key: 'english', label: '英语', getScore: (s: Student) => s.scores.english || 0, physicsOnly: false, historyOnly: false },
    { key: 'physics', label: '物理', getScore: (s: Student) => s.scores.physics || 0, physicsOnly: true, historyOnly: false },
    { key: 'history', label: '历史', getScore: (s: Student) => s.scores.history || 0, physicsOnly: false, historyOnly: true },
    { key: 'fourTotal', label: '四总', getScore: (s: Student, cat?: 'physics' | 'history') => calculateFourTotal(s, cat || 'physics'), physicsOnly: false, historyOnly: false },
    { key: 'sixTotal', label: '六总', getScore: (s: Student, cat?: 'physics' | 'history') => calculateSixTotal(s, cat || 'physics'), physicsOnly: false, historyOnly: false },
  ];

  data.forEach(exam => {
    // 按类别分组学生
    const physicsStudents = exam.students.filter(s => getStudentCategory(s) === 'physics');
    const historyStudents = exam.students.filter(s => getStudentCategory(s) === 'history');

    analysisSubjects.forEach(subject => {
      // 处理物理类 - 只统计物理类应该统计的科目
      if (!subject.historyOnly) {
        const physicsScores = physicsStudents
          .map(s => ({
            student: s,
            score: subject.key === 'fourTotal' || subject.key === 'sixTotal' 
              ? subject.getScore(s, 'physics')
              : subject.getScore(s),
          }))
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score);

        const topPhysics = physicsScores.slice(0, topN);
        const topPhysicsIds = new Set(topPhysics.map(item => item.student.studentId));

        const physicsClassCounts: { [key: string]: number } = {};
        let physicsTotal = 0;

        physicsStudents.forEach(s => {
          if (topPhysicsIds.has(s.studentId)) {
            physicsClassCounts[s.classNumber] = (physicsClassCounts[s.classNumber] || 0) + 1;
            physicsTotal++;
          }
        });

        results.push({
          exam: exam.examNumber,
          category: 'physics',
          subject: subject.label,
          topN,
          classCounts: physicsClassCounts,
          totalCount: physicsTotal,
        });
      }

      // 处理历史类 - 只统计历史类应该统计的科目
      if (!subject.physicsOnly) {
        const historyScores = historyStudents
          .map(s => ({
            student: s,
            score: subject.key === 'fourTotal' || subject.key === 'sixTotal'
              ? subject.getScore(s, 'history')
              : subject.getScore(s),
          }))
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score);

        const topHistory = historyScores.slice(0, topN);
        const topHistoryIds = new Set(topHistory.map(item => item.student.studentId));

        const historyClassCounts: { [key: string]: number } = {};
        let historyTotal = 0;

        historyStudents.forEach(s => {
          if (topHistoryIds.has(s.studentId)) {
            historyClassCounts[s.classNumber] = (historyClassCounts[s.classNumber] || 0) + 1;
            historyTotal++;
          }
        });

        results.push({
          exam: exam.examNumber,
          category: 'history',
          subject: subject.label,
          topN,
          classCounts: historyClassCounts,
          totalCount: historyTotal,
        });
      }
    });
  });

  return results;
}

// 获取各班占比趋势数据
export interface ClassPercentageTrend {
  exam: number;
  category: 'physics' | 'history';
  subject: string;
  topN: number;
  classPercentages: { [classNumber: string]: number };
}

export function getClassPercentageTrends(
  data: ExamData[],
  topN: number
): ClassPercentageTrend[] {
  const effectiveData = getEffectiveValueAnalysis(data, topN);
  const results: ClassPercentageTrend[] = [];
  const classes = getClasses(data);

  effectiveData.forEach(item => {
    const classPercentages: { [key: string]: number } = {};
    
    // 获取该类别和科目的所有学生，用于计算百分比
    const exam = data.find(e => e.examNumber === item.exam);
    if (!exam) return;

    const categoryStudents = exam.students.filter(s => getStudentCategory(s) === item.category);
    
    classes.forEach(classNum => {
      const classStudents = categoryStudents.filter(s => s.classNumber === classNum);
      const classTopCount = item.classCounts[classNum] || 0;
      
      if (classStudents.length > 0) {
        classPercentages[classNum] = Math.round((classTopCount / classStudents.length) * 1000) / 10;
      } else {
        classPercentages[classNum] = 0;
      }
    });

    results.push({
      exam: item.exam,
      category: item.category,
      subject: item.subject,
      topN: item.topN,
      classPercentages,
    });
  });

  return results;
}
