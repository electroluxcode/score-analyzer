import * as XLSX from 'xlsx';
import type { ExamData, Student } from '../types';
import { getActiveParseOrder, getActiveFieldMapping, getActiveScoreAssignment } from './storage';
import { calculateScoresAndRanks, calculateFourTotal, calculateFourTotalWithAssigned, calculateSixTotalWithAssigned, calculateNineTotalWithAssigned, getStudentType } from './scoreCalculation';
import {
  getAverageScores,
  getEffectiveValueAnalysis,
  getClasses,
} from './analysis';
import { calculateAllAssignedScores } from './scoreAssignment';

// 计算六总（四总+其他科目中分数最高的两科）
function calculateSixTotal(student: Student): number {
  const fourTotal = calculateFourTotal(student);
  const type = getStudentType(student);
  
  // 对于物理生，其他科目是：化学、政治、历史、地理、生物
  // 对于历史生，其他科目是：化学、政治、物理、地理、生物
  // 取分数最高的两科
  const otherScores: number[] = [];
  
  if (type === 'physics') {
    // 物理生：其他科目是化学、政治、历史、地理、生物
    otherScores.push(
      student.scores.chemistry || 0,
      student.scores.politics || 0,
      student.scores.history || 0,
      student.scores.geography || 0,
      student.scores.biology || 0
    );
  } else {
    // 历史生：其他科目是化学、政治、物理、地理、生物
    otherScores.push(
      student.scores.chemistry || 0,
      student.scores.politics || 0,
      student.scores.physics || 0,
      student.scores.geography || 0,
      student.scores.biology || 0
    );
  }
  
  // 取分数最高的两科
  otherScores.sort((a, b) => b - a);
  const topTwoScores = otherScores.slice(0, 2);
  
  return fourTotal + topTwoScores[0] + topTwoScores[1];
}

export function parseExcelFile(file: File): Promise<ExamData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const examDataList: ExamData[] = [];
        
        // 获取解析顺序
        const parseOrder = getActiveParseOrder();
        let sheetNamesToProcess: string[];
        
        if (parseOrder && parseOrder.order.length > 0) {
          // 按照指定的顺序处理工作表
          sheetNamesToProcess = parseOrder.order.filter(name => 
            workbook.SheetNames.includes(name)
          );
          // 添加未在顺序中的工作表（按原始顺序）
          const remainingSheets = workbook.SheetNames.filter(name => 
            !parseOrder.order.includes(name)
          );
          sheetNamesToProcess = [...sheetNamesToProcess, ...remainingSheets];
        } else {
          // 如果没有指定顺序，按照Excel文件中的顺序
          sheetNamesToProcess = workbook.SheetNames;
        }
        
        // 遍历每个工作表（每个工作表代表一次考试）
        sheetNamesToProcess.forEach((sheetName, sheetIndex) => {
          // 获取原始索引，用于fallback
          const originalIndex = workbook.SheetNames.indexOf(sheetName);
          // 跳过明显不是数据的工作表名（如"统计"、"说明"等）
          // 但允许"Sheet1"这样的默认名称
          const isDataSheet = /^\d+$/.test(sheetName) || 
                              /^Sheet\d+$/i.test(sheetName) ||
                              !['统计', '说明', '说明页', '说明页1'].includes(sheetName);
          
          if (!isDataSheet) {
            return;
          }
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
          
          if (jsonData.length < 2) return;
          
          // 第一行是表头，从第二行开始是数据
          const headerRow = jsonData[0] as any[];
          const dataRows = jsonData.slice(1) as any[][];
          
          // 获取字段映射
          const fieldMapping = getActiveFieldMapping();
          const mappings = fieldMapping?.mappings || {};
          
          // 创建反向映射：Excel列名 -> 默认名字
          // mappings格式：mappings[默认名字] = Excel列名
          // 例如：mappings["班号"] = "班级"，表示默认名字"班号"对应Excel列名"班级"
          const excelToStandardMap: { [excelColumn: string]: string } = {};
          Object.entries(mappings).forEach(([standardName, excelColumn]) => {
            excelToStandardMap[excelColumn] = standardName;
          });
          
          // 解析表头，找到各列的索引
          const colMap: { [key: string]: number } = {};
          headerRow.forEach((cell, index) => {
            if (cell) {
              const cellStr = String(cell).trim();
              
              // 通过Excel列名找到对应的默认名字（标准名字）
              // 如果Excel列名在映射中，使用映射后的标准名字；否则使用Excel列名本身
              const standardName = excelToStandardMap[cellStr] || cellStr;
              
              // 将标准名字映射到系统字段名
              if (standardName === '考试' || standardName === '考试顺序') colMap.exam = index;
              else if (standardName === '班号') colMap.classNumber = index;
              else if (standardName === '学号') colMap.studentId = index;
              else if (standardName === '姓名') colMap.name = index;
              else if (standardName === '语文') colMap.chinese = index;
              else if (standardName === '数学') colMap.math = index;
              else if (standardName === '英语') colMap.english = index;
              else if (standardName === '物理') colMap.physics = index;
              else if (standardName === '化学') colMap.chemistry = index;
              else if (standardName === '政治') colMap.politics = index;
              else if (standardName === '历史') colMap.history = index;
              else if (standardName === '地理') colMap.geography = index;
              else if (standardName === '生物') colMap.biology = index;
              // 总分和排名不再从Excel读取，而是通过计算得到
              // 忽略"序号"等其他列
            }
          });
          
          // 检查必要的列是否存在
          if (colMap.name === undefined) {
            console.warn(`工作表 "${sheetName}" 缺少"姓名"列，跳过`);
            return;
          }
          
          const students: Student[] = [];
          
          console.log("zptest-debug", {
            headerRow, 
            colMap,
            mappings: mappings,
          });
          dataRows.forEach((row) => {
            if (!row[colMap.name]) return; // 跳过空行
            
            const getValue = (col: number | undefined): any => {
              if (col === undefined) return null;
              const val = row[col];
              if (val === null || val === undefined || val === '') return null;
              if (typeof val === 'number') return val;
              if (typeof val === 'string') {
                const num = parseFloat(val);
                return isNaN(num) ? val : num;
              }
              return val;
            };
            
            // 获取字符串类型的值（用于学号、班号等）
            const getStringValue = (col: number | undefined): string => {
              if (col === undefined) return '';
              const val = row[col];
              if (val === null || val === undefined || val === '') return '';
              // 无论原始类型是什么，都转换为字符串
              // 特别处理：如果是数字，直接转换为字符串，避免科学计数法等问题
              if (typeof val === 'number') {
                // 对于整数，直接转换为字符串；对于小数，保留原样
                return val % 1 === 0 ? String(Math.floor(val)) : String(val);
              }
              return String(val);
            };
            
            const student: Student = {
              exam: getValue(colMap.exam) || parseInt(sheetName),
              classNumber: getStringValue(colMap.classNumber),
              studentId: getStringValue(colMap.studentId),
              name: getStringValue(colMap.name),
              scores: {
                chinese: getValue(colMap.chinese) || 0,
                math: getValue(colMap.math) || 0,
                english: getValue(colMap.english) || 0,
                physics: getValue(colMap.physics) || 0,
                chemistry: getValue(colMap.chemistry) || 0,
                politics: getValue(colMap.politics) || 0,
                history: getValue(colMap.history) || 0,
                geography: getValue(colMap.geography) || 0,
                biology: getValue(colMap.biology) || 0,
                total: 0, // 总分将通过计算得到
              },
              ranks: {
                chinese: 0,
                math: 0,
                english: 0,
                physics: 0,
                chemistry: 0,
                politics: 0,
                history: 0,
                geography: 0,
                biology: 0,
                total: 0, // 排名将通过计算得到
              },
            };
            
            students.push(student);
          });
          
          if (students.length > 0) {
            // 尝试从工作表名解析考试次数，如果失败则使用索引+1或从数据中获取
            let examNumber = parseInt(sheetName);
            if (isNaN(examNumber)) {
              // 如果工作表名不是数字，尝试从数据中获取，或使用索引+1
              const firstExamValue = students[0]?.exam;
              if (firstExamValue && typeof firstExamValue === 'number') {
                examNumber = firstExamValue;
              } else {
                examNumber = originalIndex >= 0 ? originalIndex + 1 : sheetIndex + 1;
              }
            }
            
            examDataList.push({
              examNumber,
              examName: sheetName, // 使用 sheet name 作为考试名称
              students,
            });
          }
        });
        
        // 按考试次数排序
        examDataList.sort((a, b) => a.examNumber - b.examNumber);
        
        // 计算总分和排名
        const finalExamDataList = calculateScoresAndRanks(examDataList);
        
        // 计算赋分
        const finalExamDataListWithAssignedScores = calculateAllAssignedScores(finalExamDataList);
        
        resolve(finalExamDataListWithAssignedScores);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function exportToExcel(data: ExamData[], filename: string) {
  const workbook = XLSX.utils.book_new();
  
  data.forEach((exam) => {
    const worksheetData: any[][] = [];
    
    // 表头（只包含基础科目，总分和排名通过计算得到）
    worksheetData.push([
      '考试',
      '班号',
      '学号',
      '姓名',
      '语文',
      '数学',
      '英语',
      '物理',
      '化学',
      '政治',
      '历史',
      '地理',
      '生物',
    ]);
    
    // 数据行（只包含基础科目）
    exam.students.forEach((student) => {
      worksheetData.push([
        student.exam,
        student.classNumber,
        student.studentId,
        student.name,
        student.scores.chinese,
        student.scores.math,
        student.scores.english,
        student.scores.physics,
        student.scores.chemistry,
        student.scores.politics,
        student.scores.history,
        student.scores.geography,
        student.scores.biology,
      ]);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, exam.examName);
  });
  
  XLSX.writeFile(workbook, filename);
}

/**
 * 导出 Excel 模板文件
 * 创建一个包含表头结构的空模板，供用户参考格式
 */
export function exportTemplate() {
  const workbook = XLSX.utils.book_new();
  
  // 创建示例工作表（第1次考试）
  const worksheetData: any[][] = [];
  
  // 表头（只包含基础科目，总分和排名通过计算得到）
  worksheetData.push([
    '考试',
    '班号',
    '学号',
    '姓名',
    '语文',
    '数学',
    '英语',
    '物理',
    '化学',
    '政治',
    '历史',
    '地理',
    '生物',
  ]);
  
  // 添加一行示例数据（物理生示例）
  worksheetData.push([
    1,
    '高一(1)',
    '202501001',
    '示例学生',
    90,
    85,
    88,
    75,
    80,
    0,
    0,
    0,
    82,
  ]);
  
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // 设置列宽
  const colWidths = [
    { wch: 8 },  // 考试
    { wch: 15 }, // 考试时间
    { wch: 12 }, // 班号
    { wch: 12 }, // 学号
    { wch: 10 }, // 姓名
    { wch: 8 },  // 语文
    { wch: 8 },  // 数学
    { wch: 8 },  // 英语
    { wch: 8 },  // 物理
    { wch: 8 },  // 化学
    { wch: 8 },  // 政治
    { wch: 8 },  // 历史
    { wch: 8 },  // 地理
    { wch: 8 },  // 生物
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '1');
  
  // 导出文件
  const filename = `成绩数据模板_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * 导出总体统计Excel文件
 * 包含：
 * 1. 各考试班级各科的平均分
 * 2. 多个考试间不同科目/四总/六总的平均分
 * 3. 有效值分析：各个考试物理类/历史类在各科目的前N名人数分布及各班占比趋势（新增）
 *    格式：每个考试一个sheet，每个sheet包含多个topN的表格（10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000）
 */
export function exportSummaryStatistics(data: ExamData[]) {
  const workbook = XLSX.utils.book_new();
  const classes = getClasses(data).sort();
  const exams = data.map(d => d.examNumber).sort((a, b) => a - b);
  const topNList = [10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
  
  // Sheet 1+: 各考试班级各科平均分（每个考试一个sheet）
  data.forEach(exam => {
    const classAverageData: any[][] = [];
    classAverageData.push(['班级', '语文', '数学', '英语', '物理', '化学', '政治', '历史', '地理', '生物', '总分', '4总', '6总', '9总']);
    
    // 检查是否有赋分数据
    const activeAssignment = getActiveScoreAssignment();
    const hasAssignedScores = activeAssignment?.enabled && exam.students.some(s => s.assignedScores);
    const enabledFields = activeAssignment?.enabledFields || [];
    
    // 如果有赋分，添加赋分列
    if (hasAssignedScores && enabledFields.length > 0) {
      const fieldNameMap: { [key: string]: string } = {
        'chinese': '语文', 'math': '数学', 'english': '英语',
        'physics': '物理', 'chemistry': '化学', 'politics': '政治',
        'history': '历史', 'geography': '地理', 'biology': '生物',
      };
      // 按照原始科目的顺序添加赋分列
      ['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'geography', 'biology'].forEach(field => {
        if (enabledFields.includes(field)) {
          classAverageData[0].push(`${fieldNameMap[field]}赋分`);
        }
      });
      // 添加赋分后的总分列
      classAverageData[0].push('4总赋分', '6总赋分', '9总赋分');
    }
    
    classes.forEach(cls => {
      const classStudents = exam.students.filter(s => (s.classNumber || '(空)') === cls);
      if (classStudents.length === 0) return;
      
      const averages: any[] = [cls];
      // 各科目平均分
      ['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'geography', 'biology', 'total'].forEach(subjectKey => {
        const scores = classStudents
          .map(s => s.scores[subjectKey as keyof typeof s.scores])
          .filter(score => score && score > 0);
        const avg = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
        averages.push(Math.round(avg * 10) / 10);
      });
      
      // 计算4总、6总、9总平均分
      const fourTotals: number[] = [];
      const sixTotals: number[] = [];
      const nineTotals: number[] = [];
      
      classStudents.forEach(student => {
        fourTotals.push(calculateFourTotal(student));
        sixTotals.push(calculateSixTotal(student));
        nineTotals.push(
          student.scores.chinese + student.scores.math + student.scores.english +
          student.scores.physics + student.scores.chemistry + student.scores.biology +
          student.scores.politics + student.scores.history + student.scores.geography
        );
      });
      
      const fourAvg = fourTotals.length > 0 && fourTotals.some(t => t > 0)
        ? fourTotals.filter(t => t > 0).reduce((sum, s) => sum + s, 0) / fourTotals.filter(t => t > 0).length
        : 0;
      const sixAvg = sixTotals.length > 0 && sixTotals.some(t => t > 0)
        ? sixTotals.filter(t => t > 0).reduce((sum, s) => sum + s, 0) / sixTotals.filter(t => t > 0).length
        : 0;
      const nineAvg = nineTotals.length > 0 && nineTotals.some(t => t > 0)
        ? nineTotals.filter(t => t > 0).reduce((sum, s) => sum + s, 0) / nineTotals.filter(t => t > 0).length
        : 0;
      
      averages.push(
        Math.round(fourAvg * 10) / 10,
        Math.round(sixAvg * 10) / 10,
        Math.round(nineAvg * 10) / 10
      );
      
      // 如果有赋分，添加赋分平均分
      if (hasAssignedScores && enabledFields.length > 0) {
        // 各科赋分平均分
        ['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'geography', 'biology'].forEach(field => {
          if (enabledFields.includes(field)) {
            const assignedScores = classStudents
              .map(s => s.assignedScores?.[field as keyof typeof s.assignedScores] || 0)
              .filter(score => score > 0);
            const avg = assignedScores.length > 0 ? assignedScores.reduce((sum, s) => sum + s, 0) / assignedScores.length : 0;
            averages.push(Math.round(avg * 10) / 10);
          }
        });
        
        // 计算赋分后的4总、6总、9总平均分
        const fourTotalsAssigned: number[] = [];
        const sixTotalsAssigned: number[] = [];
        const nineTotalsAssigned: number[] = [];
        
        classStudents.forEach(student => {
          fourTotalsAssigned.push(calculateFourTotalWithAssigned(student));
          sixTotalsAssigned.push(calculateSixTotalWithAssigned(student));
          nineTotalsAssigned.push(calculateNineTotalWithAssigned(student));
        });
        
        const fourAvgAssigned = fourTotalsAssigned.length > 0 && fourTotalsAssigned.some(t => t > 0)
          ? fourTotalsAssigned.filter(t => t > 0).reduce((sum, s) => sum + s, 0) / fourTotalsAssigned.filter(t => t > 0).length
          : 0;
        const sixAvgAssigned = sixTotalsAssigned.length > 0 && sixTotalsAssigned.some(t => t > 0)
          ? sixTotalsAssigned.filter(t => t > 0).reduce((sum, s) => sum + s, 0) / sixTotalsAssigned.filter(t => t > 0).length
          : 0;
        const nineAvgAssigned = nineTotalsAssigned.length > 0 && nineTotalsAssigned.some(t => t > 0)
          ? nineTotalsAssigned.filter(t => t > 0).reduce((sum, s) => sum + s, 0) / nineTotalsAssigned.filter(t => t > 0).length
          : 0;
        
        averages.push(
          Math.round(fourAvgAssigned * 10) / 10,
          Math.round(sixAvgAssigned * 10) / 10,
          Math.round(nineAvgAssigned * 10) / 10
        );
      }
      
      classAverageData.push(averages);
    });
    
    const classAverageSheet = XLSX.utils.aoa_to_sheet(classAverageData);
    XLSX.utils.book_append_sheet(workbook, classAverageSheet, `班级各科平均分_${exam.examName}`);
  });
  
  // Sheet 2: 多考试间各科目平均分趋势
  const trendData: any[][] = [];
  trendData.push(['考试', '语文', '数学', '英语', '物理', '化学', '政治', '历史', '地理', '生物', '总分', '4总', '6总']);
  
  // 检查是否有赋分数据
  const activeAssignment = getActiveScoreAssignment();
  const hasAssignedScores = activeAssignment?.enabled && data.some(exam => exam.students.some(s => s.assignedScores));
  const enabledFields = activeAssignment?.enabledFields || [];
  
  // 如果有赋分，添加赋分列
  if (hasAssignedScores && enabledFields.length > 0) {
    const fieldNameMap: { [key: string]: string } = {
      'chinese': '语文', 'math': '数学', 'english': '英语',
      'physics': '物理', 'chemistry': '化学', 'politics': '政治',
      'history': '历史', 'geography': '地理', 'biology': '生物',
    };
    // 按照原始科目的顺序添加赋分列
    ['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'geography', 'biology'].forEach(field => {
      if (enabledFields.includes(field)) {
        trendData[0].push(`${fieldNameMap[field]}赋分`);
      }
    });
    // 添加赋分后的总分列
    trendData[0].push('4总赋分', '6总赋分', '9总赋分');
  }
  
  const averageScores = getAverageScores(data);
  const subjectKeys = ['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'geography', 'biology', 'total'];
  
  exams.forEach(examNum => {
    const row: any[] = [examNum];
    subjectKeys.forEach(key => {
      const examData = averageScores[key]?.find(d => d.exam === examNum);
      row.push(examData ? examData.average : 0);
    });
    
    // 计算四总和六总平均分
    const exam = data.find(e => e.examNumber === examNum);
    if (exam) {
      const fourTotals: number[] = [];
      const sixTotals: number[] = [];
      exam.students.forEach(student => {
        fourTotals.push(calculateFourTotal(student));
        sixTotals.push(calculateSixTotal(student));
      });
      const fourAvg = fourTotals.length > 0 ? fourTotals.reduce((sum, s) => sum + s, 0) / fourTotals.length : 0;
      const sixAvg = sixTotals.length > 0 ? sixTotals.reduce((sum, s) => sum + s, 0) / sixTotals.length : 0;
      row.push(Math.round(fourAvg * 10) / 10, Math.round(sixAvg * 10) / 10);
    } else {
      row.push(0, 0);
    }
    
    // 如果有赋分，添加赋分平均分
    if (hasAssignedScores && enabledFields.length > 0 && exam) {
      // 各科赋分平均分
      ['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'geography', 'biology'].forEach(field => {
        if (enabledFields.includes(field)) {
          const assignedScores = exam.students
            .map(s => s.assignedScores?.[field as keyof typeof s.assignedScores] || 0)
            .filter(score => score > 0);
          const avg = assignedScores.length > 0 ? assignedScores.reduce((sum, s) => sum + s, 0) / assignedScores.length : 0;
          row.push(Math.round(avg * 10) / 10);
        }
      });
      
      // 计算赋分后的4总、6总、9总平均分
      const fourTotalsAssigned: number[] = [];
      const sixTotalsAssigned: number[] = [];
      const nineTotalsAssigned: number[] = [];
      
      exam.students.forEach(student => {
        fourTotalsAssigned.push(calculateFourTotalWithAssigned(student));
        sixTotalsAssigned.push(calculateSixTotalWithAssigned(student));
        nineTotalsAssigned.push(calculateNineTotalWithAssigned(student));
      });
      
      const fourAvgAssigned = fourTotalsAssigned.length > 0 ? fourTotalsAssigned.reduce((sum, s) => sum + s, 0) / fourTotalsAssigned.length : 0;
      const sixAvgAssigned = sixTotalsAssigned.length > 0 ? sixTotalsAssigned.reduce((sum, s) => sum + s, 0) / sixTotalsAssigned.length : 0;
      const nineAvgAssigned = nineTotalsAssigned.length > 0 ? nineTotalsAssigned.reduce((sum, s) => sum + s, 0) / nineTotalsAssigned.length : 0;
      
      row.push(
        Math.round(fourAvgAssigned * 10) / 10,
        Math.round(sixAvgAssigned * 10) / 10,
        Math.round(nineAvgAssigned * 10) / 10
      );
    }
    
    trendData.push(row);
  });
  
  const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
  XLSX.utils.book_append_sheet(workbook, trendSheet, '多考试平均分趋势');
  
  // Sheet 3+: 有效值分析（每个考试一个sheet）
  
  // 科目映射：从label映射到key
  const labelToKeyMap: { [label: string]: { key: string; physicsLabel: string; historyLabel: string } } = {
    '语文': { key: 'chinese', physicsLabel: '语文', historyLabel: '语文' },
    '数学': { key: 'math', physicsLabel: '数学', historyLabel: '数学' },
    '英语': { key: 'english', physicsLabel: '外语', historyLabel: '英语' },
    '物理': { key: 'physics', physicsLabel: '物理', historyLabel: '' },
    '历史': { key: 'history', physicsLabel: '', historyLabel: '历史' },
    '四总': { key: 'fourTotal', physicsLabel: '四总', historyLabel: '四总' },
    '六总': { key: 'sixTotal', physicsLabel: '六总', historyLabel: '六总' },
  };
  
  // 每个考试一个sheet
  data.forEach(exam => {
    const sheetData: any[][] = [];
    
    // 为每个topN值生成表格
    topNList.forEach((topN, topNIndex) => {
      const effectiveData = getEffectiveValueAnalysis([exam], topN);
      
      // 物理类表格
      const physicsSubjects = ['chinese', 'math', 'english', 'physics', 'fourTotal', 'sixTotal'];
      const physicsData: { [subject: string]: { [cls: string]: number } } = {};
      
      physicsSubjects.forEach(subjectKey => {
        physicsData[subjectKey] = {};
        classes.forEach(cls => {
          physicsData[subjectKey][cls] = 0;
        });
      });
      
      effectiveData
        .filter(item => item.category === 'physics')
        .forEach(item => {
          const mapping = labelToKeyMap[item.subject];
          if (mapping && physicsSubjects.includes(mapping.key)) {
            Object.entries(item.classCounts).forEach(([cls, count]) => {
              physicsData[mapping.key][cls] = (physicsData[mapping.key][cls] || 0) + count;
            });
          }
        });
      
      // 物理类表格标题
      if (topNIndex > 0) {
        sheetData.push([]); // 空行分隔
      }
      sheetData.push([`物理类前${topN}`]);
      
      // 物理类表头
      const physicsHeader = ['班级', '语文', '数学', '外语', '物理', '4总', '6总'];
      sheetData.push(physicsHeader);
      
      // 物理类数据行
      classes.forEach(cls => {
        const row = [
          cls,
          physicsData['chinese'][cls] || 0,
          physicsData['math'][cls] || 0,
          physicsData['english'][cls] || 0,
          physicsData['physics'][cls] || 0,
          physicsData['fourTotal'][cls] || 0,
          physicsData['sixTotal'][cls] || 0,
        ];
        sheetData.push(row);
      });
      
      // 物理类合计行
      const physicsTotal = [
        '合计',
        Object.values(physicsData['chinese']).reduce((sum, val) => sum + val, 0),
        Object.values(physicsData['math']).reduce((sum, val) => sum + val, 0),
        Object.values(physicsData['english']).reduce((sum, val) => sum + val, 0),
        Object.values(physicsData['physics']).reduce((sum, val) => sum + val, 0),
        Object.values(physicsData['fourTotal']).reduce((sum, val) => sum + val, 0),
        Object.values(physicsData['sixTotal']).reduce((sum, val) => sum + val, 0),
      ];
      sheetData.push(physicsTotal);
      
      // 历史类表格
      const historySubjects = ['chinese', 'math', 'english', 'history', 'fourTotal', 'sixTotal'];
      const historyData: { [subject: string]: { [cls: string]: number } } = {};
      
      historySubjects.forEach(subjectKey => {
        historyData[subjectKey] = {};
        classes.forEach(cls => {
          historyData[subjectKey][cls] = 0;
        });
      });
      
      effectiveData
        .filter(item => item.category === 'history')
        .forEach(item => {
          const mapping = labelToKeyMap[item.subject];
          if (mapping && historySubjects.includes(mapping.key)) {
            Object.entries(item.classCounts).forEach(([cls, count]) => {
              historyData[mapping.key][cls] = (historyData[mapping.key][cls] || 0) + count;
            });
          }
        });
      
      // 历史类表格标题
      sheetData.push([]); // 空行分隔
      sheetData.push([`历史类前${topN}`]);
      
      // 历史类表头
      const historyHeader = ['班级', '语文', '数学', '英语', '历史', '4总', '6总'];
      sheetData.push(historyHeader);
      
      // 历史类数据行
      classes.forEach(cls => {
        const row = [
          cls,
          historyData['chinese'][cls] || 0,
          historyData['math'][cls] || 0,
          historyData['english'][cls] || 0,
          historyData['history'][cls] || 0,
          historyData['fourTotal'][cls] || 0,
          historyData['sixTotal'][cls] || 0,
        ];
        sheetData.push(row);
      });
      
      // 历史类合计行
      const historyTotal = [
        '合计',
        Object.values(historyData['chinese']).reduce((sum, val) => sum + val, 0),
        Object.values(historyData['math']).reduce((sum, val) => sum + val, 0),
        Object.values(historyData['english']).reduce((sum, val) => sum + val, 0),
        Object.values(historyData['history']).reduce((sum, val) => sum + val, 0),
        Object.values(historyData['fourTotal']).reduce((sum, val) => sum + val, 0),
        Object.values(historyData['sixTotal']).reduce((sum, val) => sum + val, 0),
      ];
      sheetData.push(historyTotal);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, `${exam.examName} 有效值分析`);
  });
  
  const filename = `总体统计_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * 导出个人排名扩展Excel文件
 * 基于原始数据，添加：
 * 1. 个人各科的班级排名和年级排名
 * 2. 四总、六总的班级排名和年级排名
 * 3. 9科的班级排名和年级排名
 */
export function exportPersonalRanks(data: ExamData[]) {
  const workbook = XLSX.utils.book_new();
  
  // 计算赋分
  const dataWithAssignedScores = calculateAllAssignedScores(data);
  
  dataWithAssignedScores.forEach(exam => {
    const worksheetData: any[][] = [];
    
    // 检查是否有赋分数据
    const activeAssignment = getActiveScoreAssignment();
    const hasAssignedScores = activeAssignment?.enabled && exam.students.some(s => s.assignedScores);
    const enabledFields = activeAssignment?.enabledFields || [];
    
    // 扩展表头：先原始列，再计算字段
    const header = [
      // 基础信息列
      '考试', '班号', '学号', '姓名', '学生类型',
      // 原始成绩列（按顺序）
      '语文', '数学', '英语', '物理', '化学', '政治', '历史', '地理', '生物',
    ];
    
    // 如果有赋分，添加赋分列（紧跟在原始成绩后面，按照原始科目的顺序）
    if (hasAssignedScores && enabledFields.length > 0) {
      const fieldNameMap: { [key: string]: string } = {
        'chinese': '语文', 'math': '数学', 'english': '英语',
        'physics': '物理', 'chemistry': '化学', 'politics': '政治',
        'history': '历史', 'geography': '地理', 'biology': '生物',
      };
      // 按照原始科目的顺序添加赋分列
      ['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'geography', 'biology'].forEach(field => {
        if (enabledFields.includes(field)) {
          header.push(`${fieldNameMap[field]}赋分`);
        }
      });
    }
    
    // 然后添加排名和计算字段
    header.push(
      // 各科排名
      '语文年级排名', '语文班级排名',
      '数学年级排名', '数学班级排名',
      '英语年级排名', '英语班级排名',
      '物理年级排名', '物理班级排名',
      '化学年级排名', '化学班级排名',
      '政治年级排名', '政治班级排名',
      '历史年级排名', '历史班级排名',
      '地理年级排名', '地理班级排名',
      '生物年级排名', '生物班级排名',
      // 总分和排名
      '总分', '总分年级排名', '总分班级排名',
      // 4总、6总、9总
      '4总', '4总年级排名', '4总班级排名',
      '6总', '6总年级排名', '6总班级排名',
      '9科总分', '9科年级排名', '9科班级排名',
    );
    
    // 如果有赋分，添加赋分后的总分和排名
    if (hasAssignedScores && enabledFields.length > 0) {
      header.push(
        '4总赋分', '4总赋分年级排名', '4总赋分班级排名',
        '6总赋分', '6总赋分年级排名', '6总赋分班级排名',
        '9总赋分', '9总赋分年级排名', '9总赋分班级排名'
      );
    }
    
    worksheetData.push(header);
    
    // 计算各科的年级排名和班级排名
    const subjectKeys = ['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'geography', 'biology', 'total'];
    const gradeRankMaps: { [key: string]: Map<string, number> } = {};
    const classRankMaps: { [key: string]: Map<string, Map<string, number>> } = {};
    
    subjectKeys.forEach(subjectKey => {
      // 年级排名
      const gradeRanked = [...exam.students]
        .map(s => ({
          studentId: s.studentId,
          score: s.scores[subjectKey as keyof typeof s.scores] || 0,
        }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);
      const gradeRankMap = new Map<string, number>();
      gradeRanked.forEach((s, idx) => {
        gradeRankMap.set(s.studentId, idx + 1);
      });
      gradeRankMaps[subjectKey] = gradeRankMap;
      
      // 班级排名
      const classes = Array.from(new Set(exam.students.map(s => s.classNumber || '(空)')));
      const classRankMap = new Map<string, Map<string, number>>();
      classes.forEach(cls => {
        const classStudents = exam.students.filter(s => (s.classNumber || '(空)') === cls);
        const classRanked = [...classStudents]
          .map(s => ({
            studentId: s.studentId,
            score: s.scores[subjectKey as keyof typeof s.scores] || 0,
          }))
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score);
        const rankMap = new Map<string, number>();
        classRanked.forEach((s, idx) => {
          rankMap.set(s.studentId, idx + 1);
        });
        classRankMap.set(cls, rankMap);
      });
      classRankMaps[subjectKey] = classRankMap;
    });
    
    // 计算四总和六总
    const studentsWithFourSix = exam.students.map(s => ({
      ...s,
      fourTotal: calculateFourTotal(s),
      sixTotal: calculateSixTotal(s),
      nineTotal: s.scores.chinese + s.scores.math + s.scores.english +
                 s.scores.physics + s.scores.chemistry + s.scores.biology +
                 s.scores.politics + s.scores.history + s.scores.geography,
    }));
    
    // 四总年级排名
    const fourTotalGradeRanked = [...studentsWithFourSix]
      .filter(s => s.fourTotal > 0)
      .sort((a, b) => b.fourTotal - a.fourTotal);
    const fourTotalGradeRankMap = new Map<string, number>();
    fourTotalGradeRanked.forEach((s, idx) => {
      fourTotalGradeRankMap.set(s.studentId, idx + 1);
    });
    
    // 四总班级排名
    const fourTotalClassRankMap = new Map<string, Map<string, number>>();
    const classes = Array.from(new Set(exam.students.map(s => s.classNumber || '(空)')));
    classes.forEach(cls => {
      const classStudents = studentsWithFourSix.filter(s => (s.classNumber || '(空)') === cls);
      const classRanked = [...classStudents]
        .filter(s => s.fourTotal > 0)
        .sort((a, b) => b.fourTotal - a.fourTotal);
      const rankMap = new Map<string, number>();
      classRanked.forEach((s, idx) => {
        rankMap.set(s.studentId, idx + 1);
      });
      fourTotalClassRankMap.set(cls, rankMap);
    });
    
    // 六总年级排名
    const sixTotalGradeRanked = [...studentsWithFourSix]
      .filter(s => s.sixTotal > 0)
      .sort((a, b) => b.sixTotal - a.sixTotal);
    const sixTotalGradeRankMap = new Map<string, number>();
    sixTotalGradeRanked.forEach((s, idx) => {
      sixTotalGradeRankMap.set(s.studentId, idx + 1);
    });
    
    // 六总班级排名
    const sixTotalClassRankMap = new Map<string, Map<string, number>>();
    classes.forEach(cls => {
      const classStudents = studentsWithFourSix.filter(s => (s.classNumber || '(空)') === cls);
      const classRanked = [...classStudents]
        .filter(s => s.sixTotal > 0)
        .sort((a, b) => b.sixTotal - a.sixTotal);
      const rankMap = new Map<string, number>();
      classRanked.forEach((s, idx) => {
        rankMap.set(s.studentId, idx + 1);
      });
      sixTotalClassRankMap.set(cls, rankMap);
    });
    
    // 9科年级排名
    const nineTotalGradeRanked = [...studentsWithFourSix]
      .filter(s => s.nineTotal > 0)
      .sort((a, b) => b.nineTotal - a.nineTotal);
    const nineTotalGradeRankMap = new Map<string, number>();
    nineTotalGradeRanked.forEach((s, idx) => {
      nineTotalGradeRankMap.set(s.studentId, idx + 1);
    });
    
    // 9科班级排名
    const nineTotalClassRankMap = new Map<string, Map<string, number>>();
    classes.forEach(cls => {
      const classStudents = studentsWithFourSix.filter(s => (s.classNumber || '(空)') === cls);
      const classRanked = [...classStudents]
        .filter(s => s.nineTotal > 0)
        .sort((a, b) => b.nineTotal - a.nineTotal);
      const rankMap = new Map<string, number>();
      classRanked.forEach((s, idx) => {
        rankMap.set(s.studentId, idx + 1);
      });
      nineTotalClassRankMap.set(cls, rankMap);
    });
    
    // 计算赋分后的4总、6总、9总（如果有赋分）
    let fourTotalAssignedGradeRankMap: Map<string, number> | null = null;
    let fourTotalAssignedClassRankMap: Map<string, Map<string, number>> | null = null;
    let sixTotalAssignedGradeRankMap: Map<string, number> | null = null;
    let sixTotalAssignedClassRankMap: Map<string, Map<string, number>> | null = null;
    let nineTotalAssignedGradeRankMap: Map<string, number> | null = null;
    let nineTotalAssignedClassRankMap: Map<string, Map<string, number>> | null = null;

    if (hasAssignedScores && enabledFields.length > 0) {
      const studentsWithAssignedTotals = exam.students.map(s => ({
        ...s,
        fourTotalAssigned: calculateFourTotalWithAssigned(s),
        sixTotalAssigned: calculateSixTotalWithAssigned(s),
        nineTotalAssigned: calculateNineTotalWithAssigned(s),
      }));

      // 4总赋分年级排名
      const fourTotalAssignedGradeRanked = [...studentsWithAssignedTotals]
        .filter(s => s.fourTotalAssigned > 0)
        .sort((a, b) => b.fourTotalAssigned - a.fourTotalAssigned);
      fourTotalAssignedGradeRankMap = new Map<string, number>();
      fourTotalAssignedGradeRanked.forEach((s, idx) => {
        fourTotalAssignedGradeRankMap!.set(s.studentId, idx + 1);
      });

      // 4总赋分班级排名
      fourTotalAssignedClassRankMap = new Map<string, Map<string, number>>();
      classes.forEach(cls => {
        const classStudents = studentsWithAssignedTotals.filter(s => (s.classNumber || '(空)') === cls);
        const classRanked = [...classStudents]
          .filter(s => s.fourTotalAssigned > 0)
          .sort((a, b) => b.fourTotalAssigned - a.fourTotalAssigned);
        const rankMap = new Map<string, number>();
        classRanked.forEach((s, idx) => {
          rankMap.set(s.studentId, idx + 1);
        });
        fourTotalAssignedClassRankMap!.set(cls, rankMap);
      });

      // 6总赋分年级排名
      const sixTotalAssignedGradeRanked = [...studentsWithAssignedTotals]
        .filter(s => s.sixTotalAssigned > 0)
        .sort((a, b) => b.sixTotalAssigned - a.sixTotalAssigned);
      sixTotalAssignedGradeRankMap = new Map<string, number>();
      sixTotalAssignedGradeRanked.forEach((s, idx) => {
        sixTotalAssignedGradeRankMap!.set(s.studentId, idx + 1);
      });

      // 6总赋分班级排名
      sixTotalAssignedClassRankMap = new Map<string, Map<string, number>>();
      classes.forEach(cls => {
        const classStudents = studentsWithAssignedTotals.filter(s => (s.classNumber || '(空)') === cls);
        const classRanked = [...classStudents]
          .filter(s => s.sixTotalAssigned > 0)
          .sort((a, b) => b.sixTotalAssigned - a.sixTotalAssigned);
        const rankMap = new Map<string, number>();
        classRanked.forEach((s, idx) => {
          rankMap.set(s.studentId, idx + 1);
        });
        sixTotalAssignedClassRankMap!.set(cls, rankMap);
      });

      // 9总赋分年级排名
      const nineTotalAssignedGradeRanked = [...studentsWithAssignedTotals]
        .filter(s => s.nineTotalAssigned > 0)
        .sort((a, b) => b.nineTotalAssigned - a.nineTotalAssigned);
      nineTotalAssignedGradeRankMap = new Map<string, number>();
      nineTotalAssignedGradeRanked.forEach((s, idx) => {
        nineTotalAssignedGradeRankMap!.set(s.studentId, idx + 1);
      });

      // 9总赋分班级排名
      nineTotalAssignedClassRankMap = new Map<string, Map<string, number>>();
      classes.forEach(cls => {
        const classStudents = studentsWithAssignedTotals.filter(s => (s.classNumber || '(空)') === cls);
        const classRanked = [...classStudents]
          .filter(s => s.nineTotalAssigned > 0)
          .sort((a, b) => b.nineTotalAssigned - a.nineTotalAssigned);
        const rankMap = new Map<string, number>();
        classRanked.forEach((s, idx) => {
          rankMap.set(s.studentId, idx + 1);
        });
        nineTotalAssignedClassRankMap!.set(cls, rankMap);
      });
    }
    
    // 生成数据行
    exam.students.forEach(student => {
      const fourTotal = calculateFourTotal(student);
      const sixTotal = calculateSixTotal(student);
      const nineTotal = student.scores.chinese + student.scores.math + student.scores.english +
                        student.scores.physics + student.scores.chemistry + student.scores.biology +
                        student.scores.politics + student.scores.history + student.scores.geography;
      const cls = student.classNumber || '(空)';
      
      // 先构建原始列：基础信息 + 原始成绩
      const row = [
        // 基础信息
        exam.examName,
        student.classNumber,
        student.studentId,
        student.name,
        getStudentType(student) === 'physics' ? '物理生' : '历史生',
        // 原始成绩（按顺序）
        student.scores.chinese,
        student.scores.math,
        student.scores.english,
        student.scores.physics,
        student.scores.chemistry,
        student.scores.politics,
        student.scores.history,
        student.scores.geography,
        student.scores.biology,
      ];
      
      // 如果有赋分，添加赋分值（紧跟在原始成绩后面，按照原始科目的顺序）
      if (hasAssignedScores && student.assignedScores && enabledFields.length > 0) {
        ['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'geography', 'biology'].forEach(field => {
          if (enabledFields.includes(field)) {
            const assignedScore = student.assignedScores?.[field as keyof typeof student.assignedScores];
            row.push(assignedScore || 0);
          }
        });
      }
      
      // 然后添加排名和计算字段
      row.push(
        // 各科排名
        gradeRankMaps['chinese'].get(student.studentId) || 0, classRankMaps['chinese'].get(cls)?.get(student.studentId) || 0,
        gradeRankMaps['math'].get(student.studentId) || 0, classRankMaps['math'].get(cls)?.get(student.studentId) || 0,
        gradeRankMaps['english'].get(student.studentId) || 0, classRankMaps['english'].get(cls)?.get(student.studentId) || 0,
        gradeRankMaps['physics'].get(student.studentId) || 0, classRankMaps['physics'].get(cls)?.get(student.studentId) || 0,
        gradeRankMaps['chemistry'].get(student.studentId) || 0, classRankMaps['chemistry'].get(cls)?.get(student.studentId) || 0,
        gradeRankMaps['politics'].get(student.studentId) || 0, classRankMaps['politics'].get(cls)?.get(student.studentId) || 0,
        gradeRankMaps['history'].get(student.studentId) || 0, classRankMaps['history'].get(cls)?.get(student.studentId) || 0,
        gradeRankMaps['geography'].get(student.studentId) || 0, classRankMaps['geography'].get(cls)?.get(student.studentId) || 0,
        gradeRankMaps['biology'].get(student.studentId) || 0, classRankMaps['biology'].get(cls)?.get(student.studentId) || 0,
        // 总分和排名
        student.scores.total, gradeRankMaps['total'].get(student.studentId) || 0, classRankMaps['total'].get(cls)?.get(student.studentId) || 0,
        // 4总、6总、9总
        fourTotal, fourTotalGradeRankMap.get(student.studentId) || 0, fourTotalClassRankMap.get(cls)?.get(student.studentId) || 0,
        sixTotal, sixTotalGradeRankMap.get(student.studentId) || 0, sixTotalClassRankMap.get(cls)?.get(student.studentId) || 0,
        nineTotal, nineTotalGradeRankMap.get(student.studentId) || 0, nineTotalClassRankMap.get(cls)?.get(student.studentId) || 0,
      );
      
      // 如果有赋分，添加赋分后的总分和排名
      if (hasAssignedScores && student.assignedScores && enabledFields.length > 0) {
        const fourTotalAssigned = calculateFourTotalWithAssigned(student);
        const sixTotalAssigned = calculateSixTotalWithAssigned(student);
        const nineTotalAssigned = calculateNineTotalWithAssigned(student);
        
        row.push(
          fourTotalAssigned,
          fourTotalAssignedGradeRankMap?.get(student.studentId) || 0,
          fourTotalAssignedClassRankMap?.get(cls)?.get(student.studentId) || 0,
          sixTotalAssigned,
          sixTotalAssignedGradeRankMap?.get(student.studentId) || 0,
          sixTotalAssignedClassRankMap?.get(cls)?.get(student.studentId) || 0,
          nineTotalAssigned,
          nineTotalAssignedGradeRankMap?.get(student.studentId) || 0,
          nineTotalAssignedClassRankMap?.get(cls)?.get(student.studentId) || 0
        );
      }
      
      worksheetData.push(row);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, exam.examName);
  });
  
  const filename = `个人排名扩展_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
