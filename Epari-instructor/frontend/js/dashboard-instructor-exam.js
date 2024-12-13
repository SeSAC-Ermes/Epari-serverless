// ECharts 커스텀 테마 설정
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

// 현재 날짜의 시험 데이터를 불러오는 함수
async function loadExamData() {
  try {
    const yyyyMMdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    // const response = await fetch(`/jsons/statistics-instructor-exam-${yyyyMMdd}.json`);
    const API_BASE_URL = 'http://localhost:3001';
    const response = await fetch(`${API_BASE_URL}/api/v1/statistics/exam/${yyyyMMdd}`); // TODO: URI 강사 명시 고려
    const data = await response.json();
    return data.statistics_list[data.statistics_list.length - 1];
  } catch (error) {
    console.error('Failed to load data:', error);
    return null;
  }
}

// 기본 통계 지표 업데이트 함수
function updateBasicMetrics(data) {
  const { total_students } = data.statistics;
  document.getElementById('totalStudents').textContent = total_students.toLocaleString();
}

// 시험 현황 차트 렌더링 함수
function renderExamStatusChart(data) {
  const chartDom = document.getElementById('examStatusChart');
  const chart = echarts.init(chartDom, 'custom');

  const examData = data.statistics.exam_status.map(({ count, status }) => ({
    value: count,
    name: status
  }));

  const option = {
    title: {
      text: data.statistics.examInfo.title,  // 시험 제목 추가
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
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '70%'],
      startAngle: 180,
      endAngle: 360,
      data: examData,
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
    }]
  };

  chart.setOption(option);
  return chart;
}

// 리사이즈 이벤트 디바운싱 함수
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 대시보드 초기화 및 차트 렌더링
async function initDashboard() {
  // 로딩 상태 표시
  const chartElements = document.querySelectorAll('.chart');
  chartElements.forEach(el => el.classList.add('loading'));

  // 데이터 로드
  const data = await loadExamData();
  if (!data) {
    chartElements.forEach(el => {
      el.classList.remove('loading');
      el.innerHTML = '<div class="error">데이터를 불러올 수 없습니다.</div>';
    });
    return;
  }

  // 차트 렌더링 및 기본 지표 업데이트
  const charts = {
    examStatus: renderExamStatusChart(data)
  };
  chartElements.forEach(el => el.classList.remove('loading'));
  updateBasicMetrics(data);

  // 리사이즈 이벤트 핸들러 등록
  const handleResize = debounce(() => {
    Object.values(charts).forEach(chart => chart.resize());
  }, 250);
  window.addEventListener('resize', handleResize);
}

// DOM 로드 완료 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', initDashboard);
