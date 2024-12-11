/**
 * 데이터를 차트로 시각화 및 대시보드 동작 제어
 */
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

/**
 * 현재 날짜로 json 파일 경로 생성
 * fetch로 데이터 로드
 */
async function loadExamData() {
    try {
        const now = new Date();
        const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, '');
        const filePath = `/jsons/statistics-instructor-exam-${yyyyMMdd}.json`;
        const response = await fetch(filePath);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        return null;
    }
}

/**
 * 총 학생 수 업데이터
 */
function updateBasicMetrics(data) {
    const totalStudents = data.instructor_statistics.total_students;
    document.getElementById('totalStudents').textContent = totalStudents.toLocaleString();
}

/**
 * 차트 데이터 포맷팅 및 렌더링
 */
function renderExamStatusChart(data) {
    const chartDom = document.getElementById('examStatusChart');
    const chart = echarts.init(chartDom, 'custom');

    const examData = data.instructor_statistics.exam_status.map(status => ({
        value: status.count,
        name: status.status
    }));

    const { start_angle, end_angle, inner_radius, outer_radius } = data.instructor_statistics.exam_details.chart_options;

    const option = {
        title: {
            text: data.instructor_statistics.exam_details.title,
            top: '0%',
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}명 ({d}%)'
        },
        legend: {
            orient: 'horizontal',
            top: '8%',
            left: 'center'
        },
        series: [
            {
                name: '시험 응시 현황',
                type: 'pie',
                radius: [inner_radius, outer_radius],
                startAngle: start_angle,
                endAngle: end_angle,
                center: ['50%', '60%'],
                data: examData,
                label: {
                    show: true,
                    formatter: '{b}: {c}명'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
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

    const handleResize = debounce(() => {
        Object.values(charts).forEach(chart => chart.resize());
    }, 250);

    window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', initDashboard);
