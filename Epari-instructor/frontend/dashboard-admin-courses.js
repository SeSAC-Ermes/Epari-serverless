// dashboard-admin-courses.js
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

async function loadCourseData() {
    try {
        const now = new Date();
        const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, '');
        const filePath = `/jsons/statistics-admin-courses-${yyyyMMdd}.json`; // 날짜 기반 파일 이름
        const response = await fetch(filePath);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        return null;
    }
}


function updateBasicMetrics(data) {
    const totalStudents = data.admin_statistics.total_enrollment;
    document.getElementById('totalStudents').textContent = totalStudents.toLocaleString();
}

function renderCourseEnrollmentChart(data) {
    const chartDom = document.getElementById('courseEnrollmentChart');
    const chart = echarts.init(chartDom, 'custom');

    const courseData = data.admin_statistics.course_enrollments.map(course => ({
        value: course.enrolled_count,
        name: course.course_name
    }));

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}명 ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            top: 'center'
        },
        series: [
            {
                name: '강의별 수강생',
                type: 'pie',
                radius: '50%',
                data: courseData,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    formatter: '{b}: {c}명'
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

    const data = await loadCourseData();
    if (!data) {
        document.querySelectorAll('.chart').forEach(el => {
            el.classList.remove('loading');
            el.innerHTML = '<div class="error">데이터를 불러올 수 없습니다.</div>';
        });
        return;
    }

    const charts = {
        courseEnrollment: renderCourseEnrollmentChart(data)
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
