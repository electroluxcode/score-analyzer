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
