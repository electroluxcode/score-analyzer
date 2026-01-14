import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { SUBJECTS } from '../../types';

interface RadarChartProps {
  data: { name: string; values: number[] }[];
  title?: string;
  height?: number;
}

export function RadarChart({ data, title, height = 400 }: RadarChartProps) {
  const option = useMemo(() => {
    const indicators = SUBJECTS.filter(s => s.key !== 'total').map(s => ({
      name: s.label,
      max: 100,
    }));

    const series = data.map(item => ({
      name: item.name,
      type: 'radar',
      data: [
        {
          value: item.values,
          name: item.name,
        },
      ],
      areaStyle: {
        opacity: 0.3,
      },
      lineStyle: {
        width: 2,
      },
    }));

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
        backgroundColor: 'rgba(28, 28, 30, 0.95)',
        borderColor: '#38383A',
        textStyle: {
          color: '#EBEBF5',
        },
      },
      legend: {
        data: data.map(d => d.name),
        bottom: 0,
        textStyle: {
          color: '#EBEBF5',
        },
      },
      radar: {
        indicator: indicators,
        center: ['50%', '55%'],
        radius: '60%',
        axisName: {
          color: '#EBEBF5',
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(56, 56, 58, 0.3)', 'rgba(56, 56, 58, 0.1)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: '#38383A',
          },
        },
        splitLine: {
          lineStyle: {
            color: '#38383A',
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
