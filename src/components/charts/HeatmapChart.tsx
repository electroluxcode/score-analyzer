import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { SUBJECTS } from '../../types';

interface HeatmapChartProps {
  matrix: number[][];
  title?: string;
  height?: number;
}

export function HeatmapChart({ matrix, title, height = 400 }: HeatmapChartProps) {
  const option = useMemo(() => {
    const subjectLabels = SUBJECTS.filter(s => s.key !== 'total').map(s => s.label);
    const data: any[] = [];

    matrix.forEach((row, i) => {
      row.forEach((value, j) => {
        data.push([j, i, value]);
      });
    });

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
        position: 'top',
        formatter: (params: any) => {
          const [x, y, value] = params.data;
          return `${subjectLabels[y]} vs ${subjectLabels[x]}<br/>相关性: ${value.toFixed(2)}`;
        },
        backgroundColor: 'rgba(28, 28, 30, 0.95)',
        borderColor: '#38383A',
        textStyle: {
          color: '#EBEBF5',
        },
      },
      grid: {
        height: '60%',
        top: title ? '15%' : '5%',
      },
      xAxis: {
        type: 'category',
        data: subjectLabels,
        splitArea: {
          show: true,
        },
        axisLabel: {
          color: '#EBEBF599',
          rotate: 45,
        },
        axisLine: {
          lineStyle: {
            color: '#38383A',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: subjectLabels,
        splitArea: {
          show: true,
        },
        axisLabel: {
          color: '#EBEBF599',
        },
        axisLine: {
          lineStyle: {
            color: '#38383A',
          },
        },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '5%',
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
        },
        textStyle: {
          color: '#EBEBF5',
        },
      },
      series: [
        {
          name: '相关性',
          type: 'heatmap',
          data: data,
          label: {
            show: true,
            color: '#000',
            fontSize: 10,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }, [matrix, title]);

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}
