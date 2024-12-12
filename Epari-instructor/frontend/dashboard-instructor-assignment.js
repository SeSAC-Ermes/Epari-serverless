async function loadAssignmentData() {
  try {
    const now = new Date();
    const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filePath = `/jsons/statistics-instructor-assignment-${yyyyMMdd}.json`;
    const response = await fetch(filePath);
    const data = await response.json();

    return data.statistics_list[data.statistics_list.length - 1];
  } catch (error) {
    console.error('데이터 로드 실패:', error);
    return null;
  }
}

function renderAssignmentStatusChart(data) {
  const chartDom = document.getElementById('assignmentStatusChart');
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

function updateAssignmentMetrics(data) {
  const totalStudents = data.statistics.total_students;
  const submissionRate = data.statistics.submission_rate;
  document.getElementById('assignmentTotalStudents').textContent = totalStudents.toLocaleString();
  document.getElementById('assignmentSubmissionRate').textContent = submissionRate.toFixed(1);
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

async function initAssignmentDashboard() {
  document.querySelectorAll('.chart').forEach(el => {
    el.classList.add('loading');
  });

  const data = await loadAssignmentData();
  if (!data) {
    document.querySelectorAll('.chart').forEach(el => {
      el.classList.remove('loading');
      el.innerHTML = '<div class="error">데이터를 불러올 수 없습니다.</div>';
    });
    return;
  }

  const charts = {
    assignmentStatus: renderAssignmentStatusChart(data)
  };

  document.querySelectorAll('.chart').forEach(el => {
    el.classList.remove('loading');
  });

  updateAssignmentMetrics(data);

  const handleResize = debounce(() => {
    Object.values(charts).forEach(chart => chart.resize());
  }, 250);
  window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', initAssignmentDashboard);
