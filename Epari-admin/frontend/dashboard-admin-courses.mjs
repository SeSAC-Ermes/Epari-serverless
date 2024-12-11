export const chartTheme = {
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

export async function loadAllData() {
    try {
        const now = new Date();
        const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, '');

        // 두 파일의 경로 설정
        const facilityPath = `/jsons/statistics-admin-facility-${yyyyMMdd}.json`;
        const coursesPath = `/jsons/statistics-admin-courses-${yyyyMMdd}.json`;

        // 병렬로 두 파일 로드
        const [facilityResponse, coursesResponse] = await Promise.all([
            fetch(facilityPath),
            fetch(coursesPath)
        ]);

        const [facilityData, coursesData] = await Promise.all([
            facilityResponse.json(),
            coursesResponse.json()
        ]);

        return {
            facility: facilityData,
            courses: coursesData
        };
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        return null;
    }
}

export function updateBasicMetrics(data) {
    // courses 데이터에서 총 등록 인원 표시
    const totalStudents = data.courses.course_statistics.total_enrollment;
    document.getElementById('totalStudents').textContent = totalStudents.toLocaleString();
}

export function renderCourseEnrollmentChart(data) {
    const chartDom = document.getElementById('courseEnrollmentChart');
    const chart = echarts.init(chartDom, 'custom');

    // courses 데이터에서 강의별 등록 인원 가져오기
    const courseData = data.courses.course_statistics.course_enrollments.map(course => ({
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

export function initializeAgGrid(data) {
    // facility 데이터로 운영 중인 과정 현황 표시
    const gridOptions = {
        columnDefs: [
            { headerName: "No.", valueGetter: "node.rowIndex + 1", width: 70 },
            { headerName: "과정명", field: "course_name", width: 200 },
            { headerName: "강사명", field: "instructor", width: 100 },
            { headerName: "교육기간", field: "period", width: 200 },
            { headerName: "교육장소", field: "room", width: 100 },
            {
                headerName: "현재 수강생",
                field: "current_students",
                width: 120,
                type: 'numericColumn'
            }
        ],
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true
        },
        // facility 데이터에서 과정 현황 가져오기
        rowData: data.facility.course_statistics.course_enrollments,
        domLayout: 'autoHeight'
    };

    const gridDiv = document.querySelector('#courseGrid');
    new agGrid.Grid(gridDiv, gridOptions);
}

export function renderFacilityStatusChart(data) {
    const chartDom = document.getElementById('facilityStatusChart');
    const chart = echarts.init(chartDom, 'custom');

    // facility 데이터에서 강의실 사용 현황 가져오기
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}개 ({d}%)'
        },
        legend: {
            orient: 'horizontal',
            bottom: 'bottom'
        },
        series: [
            {
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '20',
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: [
                    {
                        value: data.facility.course_statistics.facility_status.inUse,
                        name: '사용중',
                        itemStyle: { color: '#ff6b6b' }
                    },
                    {
                        value: data.facility.course_statistics.facility_status.available,
                        name: '사용가능',
                        itemStyle: { color: '#4dabf7' }
                    }
                ]
            }
        ]
    };

    chart.setOption(option);
    return chart;
}

export function debounce(func, wait) {
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

export async function initDashboard() {
    document.querySelectorAll('.chart').forEach(el => {
        el.classList.add('loading');
    });

    const data = await loadAllData();
    if (!data) {
        document.querySelectorAll('.chart').forEach(el => {
            el.classList.remove('loading');
            el.innerHTML = '<div class="error">데이터를 불러올 수 없습니다.</div>';
        });
        return;
    }

    const charts = {
        courseEnrollment: renderCourseEnrollmentChart(data),
        facilityStatus: renderFacilityStatusChart(data)
    };

    document.querySelectorAll('.chart').forEach(el => {
        el.classList.remove('loading');
    });

    updateBasicMetrics(data);
    initializeAgGrid(data);

    const handleResize = debounce(() => {
        Object.values(charts).forEach(chart => chart.resize());
    }, 250);

    window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', initDashboard);
