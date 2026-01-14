import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

interface LineChartProps {
  data: { exam: number; subject: string; average: number; type?: string; score?: number }[];
  title?: string;
  height?: number;
}

export function LineChart({ data, title, height = 400 }: LineChartProps) {
  const option = useMemo(() => {
    // 处理不同类型的数据
    const processedData = data.map(d => ({
      exam: d.exam,
      subject: d.subject,
      value: d.average !== undefined ? d.average : (d.score !== undefined ? d.score : 0),
      type: d.type,
    }));

    // 如果有 type 字段，按 type 分组
    const hasType = data.some(d => d.type);
    
    const exams = Array.from(new Set(processedData.map(d => d.exam))).sort((a, b) => a - b);
    let series: any[];
    let subjects: string[];
    
    if (hasType) {
      const types = Array.from(new Set(processedData.map(d => d.type).filter(Boolean)));
      subjects = Array.from(new Set(processedData.map(d => d.subject)));
      
      series = types.flatMap(type => 
        subjects.map(subject => {
          const subjectData = processedData
            .filter(d => d.subject === subject && d.type === type)
            .sort((a, b) => a.exam - b.exam);
          
          return {
            name: `${subject}${type === 'class' ? ' (班级)' : type === 'grade' ? ' (年级)' : type === 'personal' ? ' (个人)' : ''}`,
            type: 'line',
            smooth: true,
            data: exams.map(exam => {
              const item = subjectData.find(d => d.exam === exam);
              return item ? item.value : null;
            }),
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
              width: 2,
            },
          };
        })
      );
    } else {
      subjects = Array.from(new Set(processedData.map(d => d.subject)));

      series = subjects.map(subject => {
        const subjectData = processedData
          .filter(d => d.subject === subject)
          .sort((a, b) => a.exam - b.exam);
        
        return {
          name: subject,
          type: 'line',
          smooth: true,
          data: exams.map(exam => {
            const item = subjectData.find(d => d.exam === exam);
            return item ? item.value : null;
          }),
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
          },
        };
      });
    }

    return {
      title: title ? {
        text: title,
        left: 'center',
        textStyle: {
          color: '#EBEBF5',
          fontSize: 16,
          fontWeight: 'normal',
        },
      } : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(28, 28, 30, 0.95)',
        borderColor: '#38383A',
        textStyle: {
          color: '#EBEBF5',
        },
      },
      legend: {
        data: subjects,
        bottom: 0,
        textStyle: {
          color: '#EBEBF5',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: title ? '15%' : '5%',
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
      series,
    };
  }, [data, title]);

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}
