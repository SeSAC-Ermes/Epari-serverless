async function loadWeeklyScoresData() {
  try {
    const yyyyMMdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const API_BASE_URL = 'http://localhost:3001';
    const response = await fetch(`${API_BASE_URL}/api/v1/statistics/weekly-scores/${yyyyMMdd}`);
    const data = await response.json();

    return {
      statistics_list: [{
        timestamp: data.createdAt,
        statistics: data.statistics
      }]
    };
  } catch (error) {
    console.error('데이터 로드 실패:', error);
    return null;
  }
}

function renderWeeklyScoresChart(data) {
  const chartDom = document.getElementById('weeklyScoresChart');
  const chart = echarts.init(chartDom, 'custom');

  const weeks = data.statistics.weeklyScores.map(item => item.week);
  const scores = data.statistics.weeklyScores.map(item => item.averageScore);

  const option = {
    title: {
      text: '주차별 평균 성적 추이',
      left: 'center',
      top: '20',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}점'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: weeks,
      boundaryGap: false,
      axisLabel: {
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      name: '평균 점수',
      min: 70,
      max: 100,
      interval: 5,
      axisLabel: {
        formatter: '{value}점'
      }
    },
    series: [{
      name: '평균 성적',
      type: 'line',
      data: scores,
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      itemStyle: {
        color: '#5470c6'
      },
      lineStyle: {
        width: 3
      },
      areaStyle: {
        opacity: 0.1
      },
      markPoint: {
        data: [
          { type: 'max', name: '최고점' },
          { type: 'min', name: '최저점' }
        ]
      },
      markLine: {
        data: [
          { type: 'average', name: '평균' }
        ]
      }
    }]
  };

  chart.setOption(option);
  return chart;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function initWeeklyScoresDashboard() {
  document.querySelectorAll('.chart').forEach(el => {
    el.classList.add('loading');
  });

  const data = await loadWeeklyScoresData();
  if (!data) {
    document.querySelectorAll('.chart').forEach(el => {
      el.classList.remove('loading');
      el.innerHTML = '<div class="error">데이터를 불러올 수 없습니다.</div>';
    });
    return;
  }

  const charts = {
    weeklyScores: renderWeeklyScoresChart(data.statistics_list[0])  // 수정된 부분
  };

  document.querySelectorAll('.chart').forEach(el => {
    el.classList.remove('loading');
  });

  const handleResize = debounce(() => {
    Object.values(charts).forEach(chart => chart.resize());
  }, 250);
  window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', initWeeklyScoresDashboard);
