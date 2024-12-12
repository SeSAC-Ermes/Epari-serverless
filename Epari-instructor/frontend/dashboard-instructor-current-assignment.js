async function loadCurrentAssignmentData() {
  try {
    const now = new Date();
    const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filePath = `/jsons/statistics-instructor-current-assignment-${yyyyMMdd}.json`;
    const response = await fetch(filePath);
    const data = await response.json();

    return data.statistics_list[data.statistics_list.length - 1];
  } catch (error) {
    console.error('데이터 로드 실패:', error);
    return null;
  }
}

function renderCurrentAssignmentStatusChart(data) {
  const chartDom = document.getElementById('currentAssignmentStatusChart');
  const chart = echarts.init(chartDom, 'custom');

  const assignmentData = data.statistics.assignment_status.map(status => ({
    value: status.count,
    name: status.status
  }));

  const option = {
    title: {
      text: data.statistics.assignment_info.title,
      bottom: '0%',
      left: 'center',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}명 ({d}%)'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        startAngle: 180,
        endAngle: 360,
        data: assignmentData,
        label: {
          show: true,
          position: 'outside',
          formatter: '{c}명 ({d}%)',
          alignTo: 'none',
          bleedMargin: 5
        },
        labelLine: {
          length: 15,
          length2: 10,
          smooth: true
        },
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        }
      }
    ]
  };

  chart.setOption(option);
  return chart;
}

async function initCurrentAssignmentDashboard() {
  document.querySelectorAll('.chart').forEach(el => {
    el.classList.add('loading');
  });

  const data = await loadCurrentAssignmentData();
  if (!data) {
    document.querySelectorAll('.chart').forEach(el => {
      el.classList.remove('loading');
      el.innerHTML = '<div class="error">데이터를 불러올 수 없습니다.</div>';
    });
    return;
  }

  const charts = {
    currentAssignmentStatus: renderCurrentAssignmentStatusChart(data)
  };

  document.querySelectorAll('.chart').forEach(el => {
    el.classList.remove('loading');
  });

  const handleResize = debounce(() => {
    Object.values(charts).forEach(chart => chart.resize());
  }, 250);
  window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', initCurrentAssignmentDashboard);
