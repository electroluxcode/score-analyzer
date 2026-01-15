import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import ReactECharts from 'echarts-for-react';
import {
  getExamNumbers,
  filterByExamNumbers,
  getEffectiveValueAnalysis,
  getClassPercentageTrends,
  getClasses,
} from '../utils/analysis';

// 科目顺序
const SUBJECT_ORDER = ['语文', '数学', '英语', '历史', '四总', '六总'];

export function EffectiveValueAnalysis() {
  const { activeFile } = useData();
  const [selectedExams, setSelectedExams] = useState<number[]>([]);
  const [customTopN, setCustomTopN] = useState<number>(50);
  const [selectedCategory, setSelectedCategory] = useState<'physics' | 'history' | 'all'>('all');

  const examNumbers = useMemo(() => {
    if (!activeFile) return [];
    return getExamNumbers(activeFile.data);
  }, [activeFile]);

  const filteredData = useMemo(() => {
    if (!activeFile) return [];
    return filterByExamNumbers(
      activeFile.data,
      selectedExams.length > 0 ? selectedExams : null
    );
  }, [activeFile, selectedExams]);

  const classes = useMemo(() => {
    if (!activeFile) return [];
    return getClasses(activeFile.data);
  }, [activeFile]);

  // 获取最新一次考试
  const latestExam = useMemo(() => {
    if (filteredData.length === 0) return 0;
    return Math.max(...filteredData.map(d => d.examNumber));
  }, [filteredData]);

  // 生成表格数据：按类别、topN、科目组织
  const generateTableData = (category: 'physics' | 'history', topN: number) => {
    const data = getEffectiveValueAnalysis(filteredData, topN);
    const categoryData = data.filter(item => item.category === category && item.exam === latestExam);
    
    // 按科目组织数据
    const tableData: { [subject: string]: { [classNumber: string]: number } } = {};
    SUBJECT_ORDER.forEach(subject => {
      tableData[subject] = {};
      classes.forEach(cls => {
        tableData[subject][cls] = 0;
      });
    });

    categoryData.forEach(item => {
      if (SUBJECT_ORDER.includes(item.subject)) {
        classes.forEach(cls => {
          tableData[item.subject][cls] = (tableData[item.subject][cls] || 0) + (item.classCounts[cls] || 0);
        });
      }
    });

    // 计算合计行
    const totals: { [subject: string]: number } = {};
    SUBJECT_ORDER.forEach(subject => {
      totals[subject] = Object.values(tableData[subject]).reduce((sum, val) => sum + val, 0);
    });

    return { tableData, totals };
  };

  // 生成占比趋势数据
  const generateTrendData = (category: 'physics' | 'history', topN: number) => {
    const trends = getClassPercentageTrends(filteredData, topN);
    return trends.filter(item => item.category === category);
  };

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
        <h1 className="text-3xl font-bold text-dark-text mb-2">有效值分析</h1>
        <p className="text-dark-textSecondary">
          分析物理类/历史类在各科目的前N名人数分布及各班占比趋势
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
              <Input
                label="自定义前N名（用于趋势图）"
                type="number"
                value={customTopN.toString()}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    setCustomTopN(value);
                  }
                }}
                placeholder="例如：50"
              />
              <div className="flex items-end">
                <label className="text-sm font-medium text-dark-textSecondary mb-2 block w-full">
                  类别筛选
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as 'physics' | 'history' | 'all')}
                  className="w-full px-4 py-2 rounded-xl bg-dark-surface2 border border-dark-border text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部</option>
                  <option value="physics">物理类</option>
                  <option value="history">历史类</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 固定表格：前10、前100、前200 */}
      {([10, 100, 200] as const).map(topN => {
        const categories: ('physics' | 'history')[] = 
          selectedCategory === 'all' ? ['physics', 'history'] : [selectedCategory];
        
        return categories.map(category => {
          const { tableData, totals } = generateTableData(category, topN);
          const categoryLabel = category === 'physics' ? '物理类' : '历史类';
          
          return (
            <Card 
              key={`${category}-${topN}`}
              title={`${categoryLabel}前${topN}`}
              subtitle={`第${latestExam}次考试`}
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-dark-surface2 border-b border-dark-border">
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">班级</th>
                      {SUBJECT_ORDER.map(subject => (
                        <th key={subject} className="px-4 py-3 text-center text-sm font-medium text-dark-text">
                          {subject}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map(cls => (
                      <tr
                        key={cls}
                        className="border-b border-dark-border hover:bg-dark-surface2 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-dark-text font-medium">{cls}</td>
                        {SUBJECT_ORDER.map(subject => (
                          <td key={subject} className="px-4 py-3 text-center text-sm text-dark-text">
                            {tableData[subject][cls] || 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-dark-surface2 border-t-2 border-dark-border">
                      <td className="px-4 py-3 text-sm font-medium text-dark-text">合计</td>
                      {SUBJECT_ORDER.map(subject => (
                        <td key={subject} className="px-4 py-3 text-center text-sm font-medium text-dark-text">
                          {totals[subject] || 0}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          );
        });
      })}

      {/* 趋势图 */}
      {latestExam > 0 && (() => {
        const categories: ('physics' | 'history')[] = 
          selectedCategory === 'all' ? ['physics', 'history'] : [selectedCategory];
        
        return categories.map(category => {
          const trendData = generateTrendData(category, customTopN);
          const categoryLabel = category === 'physics' ? '物理类' : '历史类';
          
          // 按科目分组趋势数据
          const subjects = Array.from(new Set(trendData.map(d => d.subject))).sort();
          
          return subjects.map(subject => {
            const subjectTrendData = trendData.filter(d => d.subject === subject);
            const exams = Array.from(new Set(subjectTrendData.map(d => d.exam))).sort((a, b) => a - b);
            
            return (
              <Card 
                key={`trend-${category}-${subject}`}
                title={`${categoryLabel}前${customTopN} - ${subject} 各班占比趋势`}
              >
                <ReactECharts
                  option={{
                    tooltip: {
                      trigger: 'axis',
                      backgroundColor: 'rgba(28, 28, 30, 0.95)',
                      borderColor: '#38383A',
                      textStyle: {
                        color: '#EBEBF5',
                      },
                      formatter: (params: any) => {
                        if (!Array.isArray(params)) return '';
                        let result = `${params[0].axisValue}<br/>`;
                        params.forEach((param: any) => {
                          result += `${param.marker}${param.seriesName}: ${param.value}%<br/>`;
                        });
                        return result;
                      },
                    },
                    legend: {
                      data: classes,
                      bottom: 0,
                      textStyle: {
                        color: '#EBEBF5',
                      },
                      type: 'scroll',
                    },
                    grid: {
                      left: '3%',
                      right: '4%',
                      bottom: '15%',
                      top: '5%',
                      containLabel: true,
                    },
                    xAxis: {
                      type: 'category',
                      boundaryGap: false,
                      data: exams.map(e => `第${e}次`),
                      axisLine: {
                        lineStyle: {
                          color: '#38383A',
                        },
                      },
                      axisLabel: {
                        color: '#EBEBF599',
                      },
                    },
                    yAxis: {
                      type: 'value',
                      name: '占比 (%)',
                      nameTextStyle: {
                        color: '#EBEBF599',
                      },
                      axisLine: {
                        lineStyle: {
                          color: '#38383A',
                        },
                      },
                      axisLabel: {
                        color: '#EBEBF599',
                      },
                      splitLine: {
                        lineStyle: {
                          color: '#38383A',
                          type: 'dashed',
                        },
                      },
                    },
                    series: classes.map(cls => {
                      return {
                        name: cls,
                        type: 'line',
                        smooth: true,
                        data: exams.map(exam => {
                          const item = subjectTrendData.find(d => d.exam === exam);
                          if (!item) return null;
                          return item.classPercentages[cls] || 0;
                        }),
                        symbol: 'circle',
                        symbolSize: 6,
                        lineStyle: {
                          width: 2,
                        },
                      };
                    }),
                  }}
                  style={{ height: '500px', width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              </Card>
            );
          });
        });
      })()}
    </div>
  );
}
