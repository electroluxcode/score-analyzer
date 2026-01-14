import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

interface MultiDimensionLineChartProps {
  data: { exam: number; subject: string; average: number; type?: string; score?: number }[];
  title?: string;
  height?: number;
  showLegend?: boolean;
  colors?: string[];
}

// 预定义的颜色方案（苹果风格）
const DEFAULT_COLORS = [
  '#007AFF', // 蓝色
  '#34C759', // 绿色
  '#FF9500', // 橙色
  '#FF3B30', // 红色
  '#AF52DE', // 紫色
  '#FF2D55', // 粉红色
  '#5AC8FA', // 浅蓝色
  '#FFCC00', // 黄色
  '#5856D6', // 深紫色
  '#00C7BE', // 青色
];

// 不同类型专用的基础颜色
const TYPE_BASE_COLORS: { [key: string]: string } = {
  personal: '#007AFF', // 蓝色 - 个人
  class: '#34C759',     // 绿色 - 班级
  grade: '#FF9500',     // 橙色 - 年级
};

// 根据类型和学科索引生成颜色（同一类型使用相同色系，不同学科有轻微变化）
function getColorForType(type: string | undefined, subjectIndex: number): string {
  if (!type || !TYPE_BASE_COLORS[type]) {
    return DEFAULT_COLORS[subjectIndex % DEFAULT_COLORS.length];
  }
  
  const baseColor = TYPE_BASE_COLORS[type];
  
  // 如果是个人类型，使用蓝色系
  if (type === 'personal') {
    const personalColors = ['#007AFF', '#5AC8FA', '#00C7BE', '#64D2FF'];
    return personalColors[subjectIndex % personalColors.length];
  }
  
  // 如果是班级类型，使用绿色系
  if (type === 'class') {
    const classColors = ['#34C759', '#30D158', '#32D74B', '#4CD964'];
    return classColors[subjectIndex % classColors.length];
  }
  
  // 如果是年级类型，使用橙色系
  if (type === 'grade') {
    const gradeColors = ['#FF9500', '#FF6B35', '#FF8C42', '#FFB340'];
    return gradeColors[subjectIndex % gradeColors.length];
  }
  
  return baseColor;
}

export function MultiDimensionLineChart({
  data,
  title,
  height = 500,
  showLegend = true,
  colors = DEFAULT_COLORS,
}: MultiDimensionLineChartProps) {
  const option = useMemo(() => {
    // 处理不同类型的数据
    const processedData = data.map(d => ({
      exam: d.exam,
      subject: d.subject,
      value: d.average !== undefined ? d.average : (d.score !== undefined ? d.score : 0),
      type: d.type,
    }));

    const exams = Array.from(new Set(processedData.map(d => d.exam))).sort((a, b) => a - b);
    const hasType = data.some(d => d.type);
    
    let series: any[] = [];
    let legendData: string[] = [];
    
    if (hasType) {
      // 如果有类型（如班级 vs 年级），按类型和学科分组
      const types = Array.from(new Set(processedData.map(d => d.type).filter(Boolean)));
      const subjects = Array.from(new Set(processedData.map(d => d.subject)));
      
      console.log('MultiDimensionLineChart - Processing data:', {
        rawData: data,
        processedData,
        types,
        subjects,
        exams,
      });
      
      types.forEach((type) => {
        if (!type) return;
        
        subjects.forEach((subject, subjectIndex) => {
          const subjectData = processedData
            .filter(d => d.subject === subject && d.type === type)
            .sort((a, b) => a.exam - b.exam);
          
          if (subjectData.length === 0) return;
          
          const typeLabel = type === 'class' ? '班级' : type === 'grade' ? '年级' : type === 'personal' ? '个人' : '';
          const seriesName = `${subject}${typeLabel ? ` (${typeLabel})` : ''}`;
          
          // 根据类型选择颜色
          const lineColor = getColorForType(type, subjectIndex);
          
          series.push({
            name: seriesName,
            type: 'line',
            smooth: true,
            data: exams.map(exam => {
              const item = subjectData.find(d => d.exam === exam);
              return item ? item.value : null;
            }),
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: {
              width: 3,
              color: lineColor,
              type: type === 'class' ? 'solid' : type === 'grade' ? 'dashed' : type === 'personal' ? 'solid' : 'solid',
            },
            itemStyle: {
              color: lineColor,
            },
            emphasis: {
              focus: 'series',
              lineStyle: {
                width: 4,
              },
            },
            areaStyle: type === 'class' ? {
              opacity: 0.1,
              color: lineColor,
            } : type === 'personal' ? {
              opacity: 0.08,
              color: lineColor,
            } : undefined,
          });
          
          if (!legendData.includes(seriesName)) {
            legendData.push(seriesName);
          }
        });
      });
    } else {
      // 没有类型，只按学科分组
      const subjects = Array.from(new Set(processedData.map(d => d.subject)));
      
      console.log('MultiDimensionLineChart - No type, processing subjects:', {
        rawData: data,
        processedData,
        subjects,
        exams,
      });

      subjects.forEach((subject, index) => {
        const subjectData = processedData
          .filter(d => d.subject === subject)
          .sort((a, b) => a.exam - b.exam);
        
        if (subjectData.length === 0) return;
        
        series.push({
          name: subject,
          type: 'line',
          smooth: true,
          data: exams.map(exam => {
            const item = subjectData.find(d => d.exam === exam);
            return item ? item.value : null;
          }),
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: colors[index % colors.length],
          },
          itemStyle: {
            color: colors[index % colors.length],
          },
          emphasis: {
            focus: 'series',
            lineStyle: {
              width: 4,
            },
          },
          areaStyle: {
            opacity: 0.1,
            color: colors[index % colors.length],
          },
        });
        
        legendData.push(subject);
      });
    }

    return {
      title: title ? {
        text: title,
        left: 'center',
        top: 10,
        textStyle: {
          color: '#EBEBF5',
          fontSize: 18,
          fontWeight: '600',
        },
      } : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(28, 28, 30, 0.95)',
        borderColor: '#38383A',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: '#EBEBF5',
          fontSize: 13,
        },
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#38383A',
          },
        },
        formatter: (params: any) => {
          let result = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0].axisValue}</div>`;
          params.forEach((param: any) => {
            if (param.value !== null && param.value !== undefined) {
              result += `<div style="margin: 4px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color}; margin-right: 8px;"></span>
                <span style="margin-right: 12px;">${param.seriesName}</span>
                <span style="font-weight: 600; color: ${param.color};">${param.value.toFixed(1)}</span>
              </div>`;
            }
          });
          return result;
        },
      },
      legend: showLegend ? {
        data: legendData,
        bottom: 10,
        type: 'scroll',
        orient: 'horizontal',
        textStyle: {
          color: '#EBEBF5',
          fontSize: 12,
        },
        itemWidth: 14,
        itemHeight: 14,
        itemGap: 20,
        selectedMode: true,
      } : undefined,
      grid: {
        left: '3%',
        right: '4%',
        bottom: showLegend ? '18%' : '10%',
        top: title ? '15%' : '8%',
        containLabel: true,
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          show: true,
          start: 0,
          end: 100,
          bottom: showLegend ? 50 : 20,
          height: 20,
          handleStyle: {
            color: '#007AFF',
          },
          dataBackground: {
            areaStyle: {
              color: 'rgba(0, 122, 255, 0.1)',
            },
            lineStyle: {
              color: '#007AFF',
              opacity: 0.3,
            },
          },
          selectedDataBackground: {
            areaStyle: {
              color: 'rgba(0, 122, 255, 0.2)',
            },
            lineStyle: {
              color: '#007AFF',
            },
          },
        },
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: exams.map(e => `第${e}次`),
        axisLine: {
          lineStyle: {
            color: '#38383A',
            width: 1,
          },
        },
        axisLabel: {
          color: '#EBEBF599',
          fontSize: 12,
          margin: 12,
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        name: '分数',
        nameTextStyle: {
          color: '#EBEBF599',
          fontSize: 12,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: '#EBEBF599',
          fontSize: 12,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: '#38383A',
            type: 'dashed',
            width: 1,
          },
        },
      },
      series,
    };
  }, [data, title, showLegend, colors]);

  // 生成基于数据的 key，确保数据变化时强制重新渲染
  const chartKey = useMemo(() => {
    const subjects = Array.from(new Set(data.map(d => d.subject))).sort().join(',');
    const types = Array.from(new Set(data.map(d => d.type).filter(Boolean))).sort().join(',');
    return `chart-${subjects}-${types}-${data.length}`;
  }, [data]);

  return (
    <ReactECharts
      key={chartKey}
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge={true}
      lazyUpdate={false}
    />
  );
}
