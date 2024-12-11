const chartTheme = {
  color: [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
  ],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'Pretendard, sans-serif'
  }
};

echarts.registerTheme('custom', chartTheme);

async function loadExamData() {
  try {
    const now = new Date();
    const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filePath = `/jsons/statistics-instructor-exam-${yyyyMMdd}.json`;
    const response = await fetch(filePath);
    const data = await response.json();

    // 가장 최신 통계 데이터 반환
    return data.statistics_list[data.statistics_list.length - 1];
  } catch (error) {
    console.error('데이터 로드 실패:', error);
    return null;
  }
}

function updateBasicMetrics(data) {
  const totalStudents = data.statistics.total_students;
  const submissionRate = data.statistics.submission_rate;
  document.getElementById('totalStudents').textContent = totalStudents.toLocaleString();
  document.getElementById('submissionRate').textContent = submissionRate.toFixed(1);
}

function renderExamStatusChart(data) {
  const chartDom = document.getElementById('examStatusChart');
  const chart = echarts.init(chartDom, 'custom');

  const examData = data.statistics.exam_status.map(status => ({
    value: status.count,
    name: status.status
  }));

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}명 ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: '0%'
    },
    series: [
      {
        name: '시험 응시 현황',
        type: 'pie',
        radius: ['40%', '70%'],
        startAngle: 180,
        endAngle: 360,
        center: ['50%', '50%'],
        data: examData,
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}: {c}명\n({d}%)',
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
        },
        labelLayout: { // 레이블 위치 조정
          hideOverlap: true
        },
        emphasis: {
          focus: 'self',
          scaleSize: 10
        },
        avoidLabelOverlap: true
      }
    ]
  };

  chart.setOption(option);
  return chart;
}

async function initDashboard() {
  document.querySelectorAll('.chart').forEach(el => {
    el.classList.add('loading');
  });

  const data = await loadExamData();
  if (!data) {
    document.querySelectorAll('.chart').forEach(el => {
      el.classList.remove('loading');
      el.innerHTML = '<div class="error">데이터를 불러올 수 없습니다.</div>';
    });
    return;
  }

  const charts = {
    examStatus: renderExamStatusChart(data)
  };

  document.querySelectorAll('.chart').forEach(el => {
    el.classList.remove('loading');
  });

  updateBasicMetrics(data);

  // 자동 새로고침 설정 (10초마다)
  setInterval(async () => {
    const newData = await loadExamData();
    if (newData) {
      updateBasicMetrics(newData);
      charts.examStatus.setOption(renderExamStatusChart(newData).getOption());
    }
  }, 10000);
}

document.addEventListener('DOMContentLoaded', initDashboard);
