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

        // 파일 경로 설정
        const facilityPath = `/jsons/statistics-admin-facility-${yyyyMMdd}.json`;
        const coursesPath = `/jsons/statistics-admin-courses-${yyyyMMdd}.json`;
        const visitorsPath = `/jsons/statistics-admin-visitors-${yyyyMMdd}.json`;
        const studentPagesPath = `/jsons/statistics-student-pages-${yyyyMMdd}.json`;
        const performancePath = `/jsons/statistics-admin-performance-${yyyyMMdd}.json`;

        // 병렬로 파일들 로드
        const [facilityResponse, coursesResponse, visitorsResponse, studentPagesResponse, performanceResponse] = await Promise.all([
            fetch(facilityPath),
            fetch(coursesPath),
            fetch(visitorsPath),
            fetch(studentPagesPath),
            fetch(performancePath)
        ]);

        const [facilityData, coursesData, visitorsData, studentPagesData, performanceData] = await Promise.all([
            facilityResponse.json(),
            coursesResponse.json(),
            visitorsResponse.json(),
            studentPagesResponse.json(),
            performanceResponse.json()
        ]);

        return {
            facility: facilityData,
            courses: coursesData,
            visitors: visitorsData,
            studentPages: studentPagesData,
            performance: performanceData
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
        rowData: data.facility.course_statistics.course_enrollments,
        domLayout: 'autoHeight'
    };

    const gridDiv = document.querySelector('#courseGrid');
    new agGrid.Grid(gridDiv, gridOptions);
}

export function renderFacilityStatusChart(data) {
    const chartDom = document.getElementById('facilityStatusChart');
    const chart = echarts.init(chartDom, 'custom');

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

export function updateVisitorStatistics(data) {
    if (!data.visitors) return;

    const currentStats = data.visitors.visitor_statistics;
    if (currentStats) {
        document.getElementById('currentVisitors').textContent =
            currentStats.current_visitors.toLocaleString();
        document.getElementById('totalVisitors').textContent =
            currentStats.total_visitors.toLocaleString();
    }

    return renderVisitorTimelineChart(data);
}

export function renderVisitorTimelineChart(data) {
    const chartDom = document.getElementById('visitorTimelineChart');
    if (!chartDom) return;

    const chart = echarts.init(chartDom, 'custom');

    const historicalData = data.visitors?.historical_data || [];
    const currentHour = new Date().getHours();

    const timeData = [];
    const totalVisitors = [];
    const currentVisitors = [];

    for (let hour = 0; hour <= currentHour; hour++) {
        const hourData = historicalData.find(item =>
            new Date(item.timestamp.created_at).getHours() === hour
        );

        timeData.push(`${String(hour).padStart(2, '0')}:00`);
        if (hourData) {
            totalVisitors.push(hourData.data.total_visitors);
            currentVisitors.push(hourData.data.current_visitors);
        } else {
            totalVisitors.push(0);
            currentVisitors.push(0);
        }
    }

    const option = {
        title: {
            text: '시간별 방문자 현황',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                return `${params[0].name}<br/>
                        총 방문자: ${params[0].value}명<br/>
                        현재 방문자: ${params[1].value}명`;
            }
        },
        legend: {
            data: ['총 방문자', '현재 방문자'],
            bottom: 0
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: timeData,
            boundaryGap: false
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: '{value}명'
            }
        },
        series: [
            {
                name: '총 방문자',
                type: 'line',
                data: totalVisitors,
                smooth: true,
                areaStyle: {
                    opacity: 0.1
                },
                itemStyle: {
                    color: '#5470c6'
                }
            },
            {
                name: '현재 방문자',
                type: 'line',
                data: currentVisitors,
                smooth: true,
                areaStyle: {
                    opacity: 0.1
                },
                itemStyle: {
                    color: '#91cc75'
                }
            }
        ]
    };

    chart.setOption(option);
    return chart;
}

export function initializePageRankingsGrid(data) {
    const gridOptions = {
        columnDefs: [
            {
                headerName: "순위",
                valueGetter: "node.rowIndex + 1",
                width: 80,
                cellStyle: params => ({
                    'font-weight': params.value <= 5 ? 'bold' : 'normal',
                    'background-color': params.value <= 5 ? '#f8f9fa' : 'white'
                })
            },
            {
                headerName: "페이지명",
                field: "page_name",
                width: 200
            },
            {
                headerName: "방문수",
                field: "visits",
                width: 120,
                type: 'numericColumn',
                valueFormatter: params => `${params.value.toLocaleString()}회`
            },
            {
                headerName: "순 방문자",
                field: "unique_visitors",
                width: 120,
                type: 'numericColumn',
                valueFormatter: params => `${params.value.toLocaleString()}명`
            },
            {
                headerName: "평균 체류시간",
                field: "avg_duration_minutes",
                width: 120,
                valueFormatter: params => `${params.value}분`
            }
        ],
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true
        },
        rowData: data.studentPages.page_statistics.pages,
        domLayout: 'autoHeight',
        getRowStyle: params => {
            if (params.node.rowIndex < 5) {
                return {
                    'background-color': '#f8f9fa',
                    'border-bottom': params.node.rowIndex === 4 ?
                        '2px solid #e9ecef' : '1px solid #e9ecef'
                };
            }
        }
    };

    const gridDiv = document.querySelector('#pageRankingsGrid');
    new agGrid.Grid(gridDiv, gridOptions);
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

function renderCoursePerformanceChart(performanceData) {
    const chartDom = document.getElementById('coursePerformanceChart');
    const chart = echarts.init(chartDom, 'custom');

    // 데이터 준비
    const months = Object.keys(performanceData.historical_data)
        .concat(performanceData.current_month.period);

    const courseNames = [
        'MSA 기반 자바 개발자',
        'IOS 앱 개발자',
        '클라우드 SW엔지니어',
        '데이터 AI 개발자',
        '빅데이터 과정'
    ];

    // 이탈률 전용 색상 팔레트 설정 - 빨간색 계열로 구분이 잘 되는 색상들
    const dropoutColors = [
        '#FF6B6B',  // 밝은 빨간색
        '#FF8787',  // 연한 빨간색
        '#FA5252',  // 진한 빨간색
        '#E03131',  // 더 진한 빨간색
        '#C92A2A'   // 매우 진한 빨간색
    ];

    // 취업률 데이터 구성
    const employmentData = months.map(month => {
        const monthData = month === performanceData.current_month.period
            ? performanceData.current_month.data.employment
            : performanceData.historical_data[month].employment;

        return {
            period: month,
            ...monthData
        };
    });

    // 이탈률 데이터 구성
    const dropoutData = months.map(month => {
        const monthData = month === performanceData.current_month.period
            ? performanceData.current_month.data.dropout
            : performanceData.historical_data[month].dropout;

        return {
            period: month,
            ...monthData
        };
    });

    let currentType = 'employment';

    const getOption = (type) => ({
        title: {
            text: type === 'employment' ? '과정별 취업률 현황' : '과정별 이탈률 현황',
            left: 'center',
            top: 10,
            textStyle: {
                fontSize: 16,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function(params) {
                const monthStr = params[0].axisValue;
                let result = `${monthStr.split('-')[1]}월<br/>`;
                params.forEach(param => {
                    const value = param.value[param.seriesName];
                    result += `${param.marker} ${param.seriesName}: ${value}%<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: courseNames,
            bottom: 0,
            type: 'scroll',
            textStyle: {
                fontSize: 12
            }
        },
        grid: {
            top: 60,
            left: '3%',
            right: '4%',
            bottom: 80,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: months,
            axisLabel: {
                formatter: (value) => {
                    const [year, month] = value.split('-');
                    return `${month}월`;
                }
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: '{value}%'
            },
            max: type === 'employment' ? 100 : 20,
            splitLine: {
                show: true,
                lineStyle: {
                    type: 'dashed'
                }
            }
        },
        dataset: {
            source: type === 'employment' ? employmentData : dropoutData
        },
        series: courseNames.map((name, index) => ({
            name: name,
            type: 'bar',
            emphasis: {
                focus: 'series'
            },
            encode: {
                x: 'period',
                y: name
            },
            itemStyle: {
                color: type === 'employment' ?
                    undefined : // 취업률은 기본 차트 컬러
                    dropoutColors[index] // 이탈률은 지정된 빨간색 계열
            }
        }))
    });

    // 초기 옵션 설정
    chart.setOption(getOption('employment'));

    // 버튼 컨테이너 생성 및 스타일링
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        position: absolute;
        right: 20px;
        top: 20px;
        display: flex;
        gap: 8px;
        z-index: 100;
    `;

    // 취업률 버튼
    const employmentBtn = document.createElement('button');
    employmentBtn.textContent = '취업률';
    employmentBtn.className = 'btn btn-primary active';
    employmentBtn.style.cssText = `
        padding: 6px 12px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    `;

    // 이탈률 버튼
    const dropoutBtn = document.createElement('button');
    dropoutBtn.textContent = '이탈률';
    dropoutBtn.className = 'btn btn-primary';
    dropoutBtn.style.cssText = employmentBtn.style.cssText;

    // 버튼 상태 업데이트 함수
    const updateButtonStates = () => {
        if (currentType === 'employment') {
            employmentBtn.style.backgroundColor = '#3b82f6';
            employmentBtn.style.color = 'white';
            dropoutBtn.style.backgroundColor = '#e5e7eb';
            dropoutBtn.style.color = '#374151';
        } else {
            employmentBtn.style.backgroundColor = '#e5e7eb';
            employmentBtn.style.color = '#374151';
            dropoutBtn.style.backgroundColor = '#ef4444';
            dropoutBtn.style.color = 'white';
        }
    };

    // 초기 버튼 상태 설정
    updateButtonStates();

    // 이벤트 리스너 추가
    employmentBtn.onclick = () => {
        currentType = 'employment';
        chart.setOption(getOption('employment'));
        updateButtonStates();
    };

    dropoutBtn.onclick = () => {
        currentType = 'dropout';
        chart.setOption(getOption('dropout'));
        updateButtonStates();
    };

    // 버튼을 컨테이너에 추가
    buttonContainer.appendChild(employmentBtn);
    buttonContainer.appendChild(dropoutBtn);

    // 차트 컨테이너에 버튼 컨테이너 추가
    chartDom.parentNode.insertBefore(buttonContainer, chartDom);

    return chart;
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
        facilityStatus: renderFacilityStatusChart(data),
        visitorTimeline: renderVisitorTimelineChart(data),
        coursePerformance: renderCoursePerformanceChart(data.performance)
    };

    document.querySelectorAll('.chart').forEach(el => {
        el.classList.remove('loading');
    });

    updateBasicMetrics(data);
    updateVisitorStatistics(data);
    initializeAgGrid(data);
    initializePageRankingsGrid(data);

    const handleResize = debounce(() => {
        Object.values(charts).forEach(chart => chart?.resize());
    }, 250);

    window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', initDashboard);
