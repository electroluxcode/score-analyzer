import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

interface BarChartProps {
  data: { name: string; score: number; class: string; exam: number }[];
  title?: string;
  height?: number;
  topN?: number;
}

export function BarChart({ data, title, height = 400, topN = 10 }: BarChartProps) {
  const option = useMemo(() => {
    const topData = data.slice(0, topN);
    const names = topData.map(d => `${d.name} (${d.class})`);
    const scores = topData.map(d => d.score);

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
        axisPointer: {
          type: 'shadow',
        },
        backgroundColor: 'rgba(28, 28, 30, 0.95)',
        borderColor: '#38383A',
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
        data: names,
        axisLabel: {
          color: '#EBEBF599',
          rotate: 45,
          interval: 0,
        },
        axisLine: {
          lineStyle: {
            color: '#38383A',
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#EBEBF599',
        },
        axisLine: {
          lineStyle: {
            color: '#38383A',
          },
        },
        splitLine: {
          lineStyle: {
            color: '#38383A',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: '分数',
          type: 'bar',
          data: scores,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#4A90E2' },
                { offset: 1, color: '#357ABD' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [data, title, topN]);

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}
