import type { Student, ExamData } from '../types';

/**
 * 判断学生是物理生还是历史生
 * 物理生：物理、化学、生物有成绩
 * 历史生：政治、历史、地理有成绩
 */
export function getStudentType(student: Student): 'physics' | 'history' {
  const physicsScore = student.scores.physics || 0;
  const chemistryScore = student.scores.chemistry || 0;
  const biologyScore = student.scores.biology || 0;
  const politicsScore = student.scores.politics || 0;
  const historyScore = student.scores.history || 0;
  const geographyScore = student.scores.geography || 0;

  const physicsTotal = physicsScore + chemistryScore + biologyScore;
  const historyTotal = politicsScore + historyScore + geographyScore;

  // 如果物理类总分更高，则为物理生，否则为历史生
  return physicsTotal >= historyTotal ? 'physics' : 'history';
}

/**
 * 计算学生的四总（四门总分）
 * 物理生：语文+数学+英语+物理
 * 历史生：语文+数学+英语+历史
 */
export function calculateFourTotal(student: Student): number {
  const type = getStudentType(student);
  const chinese = student.scores.chinese || 0;
  const math = student.scores.math || 0;
  const english = student.scores.english || 0;

  if (type === 'physics') {
    const physics = student.scores.physics || 0;
    return chinese + math + english + physics;
  } else {
    const history = student.scores.history || 0;
    return chinese + math + english + history;
  }
}

/**
 * 计算学生的总分（9总）
 * 语文+数学+英语+物理+化学+生物+政治+历史+地理
 */
export function calculateTotal(student: Student): number {
  const chinese = student.scores.chinese || 0;
  const math = student.scores.math || 0;
  const english = student.scores.english || 0;
  const physics = student.scores.physics || 0;
  const chemistry = student.scores.chemistry || 0;
  const biology = student.scores.biology || 0;
  const politics = student.scores.politics || 0;
  const history = student.scores.history || 0;
  const geography = student.scores.geography || 0;

  const total = chinese + math + english + physics + chemistry + biology +
         politics + history + geography;

  return total;
}

/**
 * 计算学生的四总（使用赋分）
 * 物理生：语文+数学+英语+物理赋分
 * 历史生：语文+数学+英语+历史赋分
 */
export function calculateFourTotalWithAssigned(student: Student): number {
  const type = getStudentType(student);
  const chinese = student.scores.chinese || 0;
  const math = student.scores.math || 0;
  const english = student.scores.english || 0;
  const assignedScores = student.assignedScores;

  if (type === 'physics') {
    const physicsAssigned = assignedScores?.physics || student.scores.physics || 0;
    return chinese + math + english + physicsAssigned;
  } else {
    const historyAssigned = assignedScores?.history || student.scores.history || 0;
    return chinese + math + english + historyAssigned;
  }
}

/**
 * 计算学生的六总（使用赋分）
 * 四总赋分+其他科目中赋分最高的两科
 */
export function calculateSixTotalWithAssigned(student: Student): number {
  const fourTotalAssigned = calculateFourTotalWithAssigned(student);
  const assignedScores = student.assignedScores;
  const type = getStudentType(student);
  
  // 对于物理生，其他科目是：化学、政治、历史、地理、生物
  // 对于历史生，其他科目是：化学、政治、物理、地理、生物
  // 取赋分最高的两科
  const otherScores: number[] = [];
  
  if (type === 'physics') {
    // 物理生：其他科目是化学、政治、历史、地理、生物
    otherScores.push(
      assignedScores?.chemistry || student.scores.chemistry || 0,
      assignedScores?.politics || student.scores.politics || 0,
      assignedScores?.history || student.scores.history || 0,
      assignedScores?.geography || student.scores.geography || 0,
      assignedScores?.biology || student.scores.biology || 0
    );
  } else {
    // 历史生：其他科目是化学、政治、物理、地理、生物
    otherScores.push(
      assignedScores?.chemistry || student.scores.chemistry || 0,
      assignedScores?.politics || student.scores.politics || 0,
      assignedScores?.physics || student.scores.physics || 0,
      assignedScores?.geography || student.scores.geography || 0,
      assignedScores?.biology || student.scores.biology || 0
    );
  }
  
  // 取分数最高的两科
  otherScores.sort((a, b) => b - a);
  const topTwoScores = otherScores.slice(0, 2);
  
  return fourTotalAssigned + topTwoScores[0] + topTwoScores[1];
}

/**
 * 计算学生的九总（使用赋分）
 * 语文+数学+英语+物理赋分+化学赋分+生物赋分+政治赋分+历史赋分+地理赋分
 */
export function calculateNineTotalWithAssigned(student: Student): number {
  const chinese = student.scores.chinese || 0;
  const math = student.scores.math || 0;
  const english = student.scores.english || 0;
  const assignedScores = student.assignedScores;
  
  // 如果赋分存在（即使是0），使用赋分值；否则使用原始分数
  const physicsAssigned = assignedScores?.physics !== undefined ? assignedScores.physics : (student.scores.physics || 0);
  const chemistryAssigned = assignedScores?.chemistry !== undefined ? assignedScores.chemistry : (student.scores.chemistry || 0);
  const biologyAssigned = assignedScores?.biology !== undefined ? assignedScores.biology : (student.scores.biology || 0);
  const politicsAssigned = assignedScores?.politics !== undefined ? assignedScores.politics : (student.scores.politics || 0);
  const historyAssigned = assignedScores?.history !== undefined ? assignedScores.history : (student.scores.history || 0);
  const geographyAssigned = assignedScores?.geography !== undefined ? assignedScores.geography : (student.scores.geography || 0);
  
  const total = chinese + math + english + physicsAssigned + chemistryAssigned + biologyAssigned +
         politicsAssigned + historyAssigned + geographyAssigned;
  
  return total;
}

/**
 * 计算所有学生的总分和四总，并计算排名
 * 使用缓存避免重复计算
 */
const calculationCache = new Map<string, {
  students: Student[];
  totalRanks: Map<string, number>;
  fourTotalRanks: { physics: Map<string, number>; history: Map<string, number> };
  subjectRanks: Map<string, Map<string, number>>;
}>();

function getCacheKey(examData: ExamData[]): string {
  return examData.map(exam => 
    `${exam.examNumber}-${exam.students.length}`
  ).join('|');
}

export function calculateScoresAndRanks(examData: ExamData[]): ExamData[] {
  const cacheKey = getCacheKey(examData);
  const cached = calculationCache.get(cacheKey);
  
  // 检查缓存是否有效
  if (cached) {
    const currentStudents = examData.flatMap(exam => exam.students);
    const cachedStudents = cached.students;
    if (currentStudents.length === cachedStudents.length &&
        currentStudents.every((s, i) => s.studentId === cachedStudents[i]?.studentId)) {
      // 使用缓存的结果
      return examData.map(exam => ({
        ...exam,
        students: exam.students.map(student => {
          const totalRank = cached.totalRanks.get(student.studentId) || 0;
          
          const subjectRanks: Student['ranks'] = {
            chinese: cached.subjectRanks.get('chinese')?.get(student.studentId) || 0,
            math: cached.subjectRanks.get('math')?.get(student.studentId) || 0,
            english: cached.subjectRanks.get('english')?.get(student.studentId) || 0,
            physics: cached.subjectRanks.get('physics')?.get(student.studentId) || 0,
            chemistry: cached.subjectRanks.get('chemistry')?.get(student.studentId) || 0,
            politics: cached.subjectRanks.get('politics')?.get(student.studentId) || 0,
            history: cached.subjectRanks.get('history')?.get(student.studentId) || 0,
            geography: cached.subjectRanks.get('geography')?.get(student.studentId) || 0,
            biology: cached.subjectRanks.get('biology')?.get(student.studentId) || 0,
            total: totalRank,
          };

          return {
            ...student,
            scores: {
              ...student.scores,
              total: calculateTotal(student),
            },
            ranks: subjectRanks,
          };
        }),
      }));
    }
  }

  // 重新计算
  const result: ExamData[] = examData.map(exam => {
    // 计算总分
    const studentsWithTotal = exam.students.map(student => ({
      ...student,
      scores: {
        ...student.scores,
        total: calculateTotal(student),
      },
    }));

    // 计算各科排名
    const subjectKeys = ['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'geography', 'biology'] as const;
    const subjectRanks = new Map<string, Map<string, number>>();
    
    subjectKeys.forEach(subjectKey => {
      const ranked = [...studentsWithTotal]
        .map(s => ({
          studentId: s.studentId,
          score: s.scores[subjectKey] || 0,
        }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);
      
      const rankMap = new Map<string, number>();
      ranked.forEach((item, index) => {
        rankMap.set(item.studentId, index + 1);
      });
      subjectRanks.set(subjectKey, rankMap);
    });

    // 计算总分排名
    const totalRanked = [...studentsWithTotal]
      .map(s => ({
        studentId: s.studentId,
        total: s.scores.total || 0,
      }))
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);
    
    const totalRankMap = new Map<string, number>();
    totalRanked.forEach((item, index) => {
      totalRankMap.set(item.studentId, index + 1);
    });

    // 计算四总排名（物理生和历史生分开）
    const physicsStudents = studentsWithTotal.filter(s => getStudentType(s) === 'physics');
    const historyStudents = studentsWithTotal.filter(s => getStudentType(s) === 'history');

    const physicsFourTotalRanked = [...physicsStudents]
      .map(s => ({
        studentId: s.studentId,
        fourTotal: calculateFourTotal(s),
      }))
      .filter(s => s.fourTotal > 0)
      .sort((a, b) => b.fourTotal - a.fourTotal);
    
    const historyFourTotalRanked = [...historyStudents]
      .map(s => ({
        studentId: s.studentId,
        fourTotal: calculateFourTotal(s),
      }))
      .filter(s => s.fourTotal > 0)
      .sort((a, b) => b.fourTotal - a.fourTotal);

    const physicsFourTotalRankMap = new Map<string, number>();
    physicsFourTotalRanked.forEach((item, index) => {
      physicsFourTotalRankMap.set(item.studentId, index + 1);
    });

    const historyFourTotalRankMap = new Map<string, number>();
    historyFourTotalRanked.forEach((item, index) => {
      historyFourTotalRankMap.set(item.studentId, index + 1);
    });

    const fourTotalRanks = {
      physics: physicsFourTotalRankMap,
      history: historyFourTotalRankMap,
    };

    // 更新学生数据
    const finalStudents = studentsWithTotal.map(student => {
      return {
        ...student,
        ranks: {
          chinese: subjectRanks.get('chinese')?.get(student.studentId) || 0,
          math: subjectRanks.get('math')?.get(student.studentId) || 0,
          english: subjectRanks.get('english')?.get(student.studentId) || 0,
          physics: subjectRanks.get('physics')?.get(student.studentId) || 0,
          chemistry: subjectRanks.get('chemistry')?.get(student.studentId) || 0,
          politics: subjectRanks.get('politics')?.get(student.studentId) || 0,
          history: subjectRanks.get('history')?.get(student.studentId) || 0,
          geography: subjectRanks.get('geography')?.get(student.studentId) || 0,
          biology: subjectRanks.get('biology')?.get(student.studentId) || 0,
          total: totalRankMap.get(student.studentId) || 0,
        },
      };
    });

    // 更新缓存
    calculationCache.set(cacheKey, {
      students: exam.students,
      totalRanks: totalRankMap,
      fourTotalRanks,
      subjectRanks,
    });

    return {
      ...exam,
      students: finalStudents,
    };
  });

  return result;
}
