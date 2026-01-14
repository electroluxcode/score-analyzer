import * as XLSX from 'xlsx';
import type { ExamData, Student } from '../types';

export function parseExcelFile(file: File): Promise<ExamData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const examDataList: ExamData[] = [];
        
        // 遍历每个工作表（每个工作表代表一次考试）
        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
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
          
          // 解析表头，找到各列的索引
          const colMap: { [key: string]: number } = {};
          headerRow.forEach((cell, index) => {
            if (cell) {
              const cellStr = String(cell).trim();
              // 支持"考试"和"考试顺序"两种表头
              if (cellStr === '考试' || cellStr === '考试顺序') colMap.exam = index;
              else if (cellStr === '考试时间') colMap.examTime = index;
              else if (cellStr === '班号') colMap.classNumber = index;
              else if (cellStr === '学号') colMap.studentId = index;
              else if (cellStr === '姓名') colMap.name = index;
              else if (cellStr === '语文') colMap.chinese = index;
              else if (cellStr === '数学') colMap.math = index;
              else if (cellStr === '英语') colMap.english = index;
              else if (cellStr === '物理') colMap.physics = index;
              else if (cellStr === '化学') colMap.chemistry = index;
              else if (cellStr === '政治') colMap.politics = index;
              else if (cellStr === '历史') colMap.history = index;
              else if (cellStr === '地理') colMap.geography = index;
              else if (cellStr === '生物') colMap.biology = index;
              else if (cellStr === '总分') colMap.total = index;
              else if (cellStr === '语文级排名') colMap.chineseRank = index;
              else if (cellStr === '数学级排名') colMap.mathRank = index;
              else if (cellStr === '英语级排名') colMap.englishRank = index;
              else if (cellStr === '物理级排名') colMap.physicsRank = index;
              else if (cellStr === '化学级排名') colMap.chemistryRank = index;
              else if (cellStr === '政治级排名') colMap.politicsRank = index;
              else if (cellStr === '历史级排名') colMap.historyRank = index;
              else if (cellStr === '地理级排名') colMap.geographyRank = index;
              else if (cellStr === '生物级排名') colMap.biologyRank = index;
              else if (cellStr === '总分级排名') colMap.totalRank = index;
              // 忽略"序号"等其他列
            }
          });
          
          // 检查必要的列是否存在
          if (colMap.name === undefined) {
            console.warn(`工作表 "${sheetName}" 缺少"姓名"列，跳过`);
            return;
          }
          
          const students: Student[] = [];
          
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
            
            const student: Student = {
              exam: getValue(colMap.exam) || parseInt(sheetName),
              examTime: String(getValue(colMap.examTime) || ''),
              classNumber: String(getValue(colMap.classNumber) || ''),
              studentId: String(getValue(colMap.studentId) || ''),
              name: String(getValue(colMap.name) || ''),
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
                total: getValue(colMap.total) || 0,
              },
              ranks: {
                chinese: getValue(colMap.chineseRank) || 0,
                math: getValue(colMap.mathRank) || 0,
                english: getValue(colMap.englishRank) || 0,
                physics: getValue(colMap.physicsRank) || 0,
                chemistry: getValue(colMap.chemistryRank) || 0,
                politics: getValue(colMap.politicsRank) || 0,
                history: getValue(colMap.historyRank) || 0,
                geography: getValue(colMap.geographyRank) || 0,
                biology: getValue(colMap.biologyRank) || 0,
                total: getValue(colMap.totalRank) || 0,
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
                examNumber = sheetIndex + 1;
              }
            }
            
            examDataList.push({
              examNumber,
              examTime: students[0]?.examTime || '',
              students,
            });
          }
        });
        
        // 按考试次数排序
        examDataList.sort((a, b) => a.examNumber - b.examNumber);
        
        resolve(examDataList);
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
    
    // 表头
    worksheetData.push([
      '考试',
      '考试时间',
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
      '总分',
      '语文级排名',
      '数学级排名',
      '英语级排名',
      '物理级排名',
      '化学级排名',
      '政治级排名',
      '历史级排名',
      '地理级排名',
      '生物级排名',
      '总分级排名',
    ]);
    
    // 数据行
    exam.students.forEach((student) => {
      worksheetData.push([
        student.exam,
        student.examTime,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, String(exam.examNumber));
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
  
  // 表头
  worksheetData.push([
    '考试',
    '考试时间',
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
    '总分',
    '语文级排名',
    '数学级排名',
    '英语级排名',
    '物理级排名',
    '化学级排名',
    '政治级排名',
    '历史级排名',
    '地理级排名',
    '生物级排名',
    '总分级排名',
  ]);
  
  // 添加一行示例数据
  worksheetData.push([
    1,
    '2025-12月考',
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
    500,
    50,
    60,
    55,
    40,
    45,
    0,
    0,
    0,
    50,
    45,
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
    { wch: 8 },  // 总分
    { wch: 12 }, // 语文级排名
    { wch: 12 }, // 数学级排名
    { wch: 12 }, // 英语级排名
    { wch: 12 }, // 物理级排名
    { wch: 12 }, // 化学级排名
    { wch: 12 }, // 政治级排名
    { wch: 12 }, // 历史级排名
    { wch: 12 }, // 地理级排名
    { wch: 12 }, // 生物级排名
    { wch: 12 }, // 总分级排名
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '1');
  
  // 导出文件
  const filename = `成绩数据模板_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
