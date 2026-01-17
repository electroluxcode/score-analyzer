import type { Student, ExamData, ScoreAssignmentRule } from '../types';
import { getActiveScoreAssignment } from './storage';
import { calculateNineTotalWithAssigned } from './scoreCalculation';

/**
 * 根据原始分数和排名计算赋分
 * 使用标准等级赋分公式：T = Y1 + (Y2 - Y1) / (X2 - X1) * (X - X1)
 * @param originalScore 原始分数
 * @param rank 排名（从1开始）
 * @param totalStudents 总学生数
 * @param rules 赋分规则
 * @param allScores 该科目所有学生的原始分数（用于确定等级的原始分数区间）
 * @returns 赋分后的分数
 */
export function calculateAssignedScore(
  originalScore: number,
  rank: number,
  totalStudents: number,
  rules: ScoreAssignmentRule[],
  allScores: number[]
): number {
  if (totalStudents === 0 || originalScore <= 0) return 0;
  
  // 将所有有效分数从高到低排序
  const sortedScores = allScores.filter(s => s > 0).sort((a, b) => b - a);
  if (sortedScores.length === 0) return 0;
  
  // 计算百分比排名（从高到低，排名越小百分比越小）
  const percentage = (rank / totalStudents) * 100;
  
  // 按百分比区间确定等级，并获取该等级的原始分数区间
  let cumulativePercentage = 0;
  for (const rule of rules) {
    cumulativePercentage += rule.percentage;
    if (percentage <= cumulativePercentage) {
      // 确定该等级的排名区间
      const rangeStartPercentage = cumulativePercentage - rule.percentage;
      const rangeEndPercentage = cumulativePercentage;
      
      // 计算该等级的排名区间对应的索引（注意：索引从0开始）
      const startRank = Math.max(0, Math.floor((rangeStartPercentage / 100) * totalStudents));
      const endRank = Math.min(sortedScores.length - 1, Math.ceil((rangeEndPercentage / 100) * totalStudents) - 1);
      
      // 获取该等级的原始分数上下限（X2为最高分，X1为最低分）
      const X2 = sortedScores[startRank]; // 该等级最高分
      const X1 = sortedScores[endRank];   // 该等级最低分
      
      // 赋分区间（Y2为最高分，Y1为最低分）
      const Y2 = rule.maxScore;
      const Y1 = rule.minScore;
      
      // 边界情况：如果原始分数等于区间边界，直接返回对应赋分
      if (originalScore >= X2) return Y2;
      if (originalScore <= X1) return Y1;
      
      // 使用标准等级赋分公式：T = Y1 + (Y2 - Y1) / (X2 - X1) * (X - X1)
      let assignedScore: number;
      if (X2 === X1) {
        // 如果该等级内所有人分数相同，取该等级赋分的中间值
        assignedScore = (Y1 + Y2) / 2;
      } else {
        assignedScore = Y1 + ((Y2 - Y1) / (X2 - X1)) * (originalScore - X1);
      }
      
      return (assignedScore); // 四舍五入取整
    }
  }
  
  // 如果超出所有区间，返回最低等级的赋分
  const lastRule = rules[rules.length - 1];
  return lastRule.minScore;
}

/**
 * 计算学生的科目赋分
 * @param student 学生对象
 * @param subjectKey 科目key（如 'physics', 'chemistry' 等）
 * @param examData 考试数据（用于计算排名）
 * @returns 赋分后的分数
 */
export function getStudentAssignedScore(
  student: Student,
  subjectKey: string,
  examData: ExamData
): number {
  const assignment = getActiveScoreAssignment();
  if (!assignment || !assignment.enabled) {
    return 0; // 如果未启用赋分，返回0
  }
  
  const originalScore = student.scores[subjectKey as keyof typeof student.scores] || 0;
  if (originalScore <= 0) return 0;
  
  // 计算该科目在该考试中的排名，并收集所有分数
  const studentsWithScore = examData.students
    .filter(s => {
      const score = s.scores[subjectKey as keyof typeof s.scores] || 0;
      return score > 0;
    })
    .sort((a, b) => {
      const scoreA = a.scores[subjectKey as keyof typeof a.scores] || 0;
      const scoreB = b.scores[subjectKey as keyof typeof b.scores] || 0;
      return scoreB - scoreA; // 从高到低排序
    });
  
  const totalStudents = studentsWithScore.length;
  if (totalStudents === 0) return 0;
  
  // 找到学生的排名
  const rank = studentsWithScore.findIndex(s => s.studentId === student.studentId) + 1;
  if (rank === 0) return 0;
  
  // 收集所有学生的原始分数
  const allScores = studentsWithScore.map(s => s.scores[subjectKey as keyof typeof s.scores] || 0);
  
  return calculateAssignedScore(originalScore, rank, totalStudents, assignment.rules, allScores);
}

/**
 * 批量计算所有学生的赋分并添加到学生对象中
 * 注意：这会修改原始数据，建议在数据加载时调用
 */
export function calculateAllAssignedScores(examDataList: ExamData[]): ExamData[] {
  const assignment = getActiveScoreAssignment();
  
  if (!assignment || !assignment.enabled) {
    return examDataList; // 如果未启用赋分，直接返回
  }
  
  // 获取生效的字段列表
  const enabledFields = assignment.enabledFields || [];
  if (enabledFields.length === 0) {
    return examDataList; // 如果没有指定生效字段，不进行赋分
  }
  
  // 为每个考试计算赋分
  return examDataList.map(exam => {
    const students = exam.students.map(student => {
      // 只为生效字段计算赋分
      const assignedScores: {
        chinese: number;
        math: number;
        english: number;
        physics: number;
        chemistry: number;
        politics: number;
        history: number;
        geography: number;
        biology: number;
      } = {
        chinese: 0,
        math: 0,
        english: 0,
        physics: 0,
        chemistry: 0,
        politics: 0,
        history: 0,
        geography: 0,
        biology: 0,
      };
      
      // 只为生效字段计算赋分
      enabledFields.forEach(field => {
        if (field === 'chinese') assignedScores.chinese = getStudentAssignedScore(student, 'chinese', exam);
        else if (field === 'math') assignedScores.math = getStudentAssignedScore(student, 'math', exam);
        else if (field === 'english') assignedScores.english = getStudentAssignedScore(student, 'english', exam);
        else if (field === 'physics') assignedScores.physics = getStudentAssignedScore(student, 'physics', exam);
        else if (field === 'chemistry') assignedScores.chemistry = getStudentAssignedScore(student, 'chemistry', exam);
        else if (field === 'politics') assignedScores.politics = getStudentAssignedScore(student, 'politics', exam);
        else if (field === 'history') assignedScores.history = getStudentAssignedScore(student, 'history', exam);
        else if (field === 'geography') assignedScores.geography = getStudentAssignedScore(student, 'geography', exam);
        else if (field === 'biology') assignedScores.biology = getStudentAssignedScore(student, 'biology', exam);
      });
      
      // 如果有赋分，计算赋分总分（单独存储，不修改原始总分）
      const hasAssignedScores = enabledFields.length > 0 && Object.values(assignedScores).some(v => v > 0);
      let assignedTotal: number | undefined;
      
      if (hasAssignedScores) {
        // 创建包含赋分的临时学生对象
        const studentWithAssigned = { ...student, assignedScores };
        assignedTotal = calculateNineTotalWithAssigned(studentWithAssigned);
      }
      
      const updatedStudent = {
        ...student,
        assignedScores, // 添加赋分字段
        assignedTotal, // 添加赋分总分字段（不修改 student.scores.total）
      };
      
      return updatedStudent;
    });
    
    return {
      ...exam,
      students,
    };
  });
}
