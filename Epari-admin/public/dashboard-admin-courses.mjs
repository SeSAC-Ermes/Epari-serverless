// 차트 테마 설정 (기존 코드 유지)
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
fetch
echarts.registerTheme('custom', chartTheme);

export async function loadAllData() {
  try {
    const API_BASE = 'http://localhost:3000/api/admin';

    // 모든 API 요청을 병렬로 실행
    const [coursesStudentsRes, coursesActiveRes, visitorsRes, pagesRes, performanceRes, preferenceRes] = await Promise.all([
      fetch(`${API_BASE}/courses-students`),
      fetch(`${API_BASE}/courses-active`),
      fetch(`${API_BASE}/visitors-hourly`),
      fetch(`${API_BASE}/pages-ranking`),
      fetch(`${API_BASE}/courses-employment-retention`),
      fetch(`${API_BASE}/courses-preference`)
    ]);

    // 응답 데이터 파싱
    const [coursesStudents, coursesActive, visitors, studentPages, performance, preference] = await Promise.all([
      coursesStudentsRes.json(),
      coursesActiveRes.json(),
      visitorsRes.json(),
      pagesRes.json(),
      performanceRes.json(),
      preferenceRes.json()
    ]);

    return {
      courses: coursesStudents,
      facility: coursesActive,
      visitors: visitors,
      studentPages: studentPages,
      performance: performance,
      preference: preference
    };
  } catch (error) {
    console.error('데이터 로드 실패:', error);
    return null;
  }
}

export function updateBasicMetrics(data) {
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
  const gridDiv = document.querySelector('#courseGrid');
  if (!gridDiv) {
    console.error('Grid container not found');
    return;
  }

  // AG Grid 가용성 체크
  if (!window.agGrid) {
    console.error('AG Grid library is not loaded');
    return;
  }

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

  // 새로운 초기화 방식 사용
  const grid = agGrid.createGrid(gridDiv, gridOptions);
  return grid;
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
      formatter: function (params) {
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
  const gridDiv = document.querySelector('#pageRankingsGrid');
  if (!gridDiv) {
    console.error('Page rankings grid container not found');
    return;
  }

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
    domLayout: 'autoHeight'
  };

  const grid = agGrid.createGrid(gridDiv, gridOptions);
  return grid;
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
      formatter: function (params) {
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

// 선호도 차트 렌더링 함수 추가
export function renderPreferenceChart(data) {
  const chartDom = document.getElementById('preferenceChart');
  const chart = echarts.init(chartDom, 'custom');

  if (!data.preference?.current_data?.preferences?.domains) {
    console.error('선호도 데이터가 없습니다');
    return;
  }

  // 과정별 기본 색상 정의
  const courseColors = {
    '자바 프로그래밍 기초': '#FF6B6B',     // 붉은색
    '웹 개발 실무': '#4ECDC4',             // 청록색
    '백엔드 알고리즘의 이해': '#45B7D1',    // 하늘색
    '데이터베이스 입문': '#96CEB4',         // 민트색
    '인공지능 개론': '#9D65C9',            // 보라색
    'AWS 기초': '#FFB84C',                // 주황색
    '도커/쿠버네티스': '#F9D923'           // 노란색
  };

  // 트렌드에 따른 색상 조정 함수
  const getColorWithTrend = (baseColor, trend) => {
    // hex to rgb 변환
    const hex2rgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };

    // rgb to hex 변환
    const rgb2hex = (r, g, b) => {
      return '#' + [r, g, b].map(x => {
        const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    };

    const [r, g, b] = hex2rgb(baseColor);

    switch (trend) {
      case 'rising':
        // 더 밝고 선명하게
        return rgb2hex(
            Math.min(255, r * 1.2),
            Math.min(255, g * 1.2),
            Math.min(255, b * 1.2)
        );
      case 'falling':
        // 더 어둡게
        return rgb2hex(r * 0.8, g * 0.8, b * 0.8);
      default:
        // stable은 기본 색상
        return baseColor;
    }
  };

  // 모든 과정의 데이터를 하나의 배열로 변환
  const allCourses = data.preference.current_data.preferences.domains.flatMap(domain =>
      domain.courses.map(course => ({
        name: course.courseName,
        value: course.activeStudents,
        domain: domain.domainName,
        trend: course.trend,
        color: getColorWithTrend(courseColors[course.courseName], course.trend)
      }))
  );

  const option = {
    title: {
      text: '과정별 수강생 현황',
      subtext: '트렌드: 상승 🔼 안정 ➡️ 하락 🔽',
      left: 'center',
      top: '5%',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      },
      subtextStyle: {
        fontSize: 12,
        padding: [5, 0, 0, 0]
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        const course = params.data;
        const trendEmoji = {
          'rising': '🔼',
          'stable': '➡️',
          'falling': '🔽'
        }[course.trend] || '';

        return `
                    <div style="font-weight:bold">${course.name}</div>
                    <div>분야: ${course.domain}</div>
                    <div>수강생: ${course.value.toFixed(1)}명 (${params.percent.toFixed(1)}%)</div>
                    <div>트렌드: ${trendEmoji}</div>
                `;
      }
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: '5%',
      top: 'middle',
      formatter: name => {
        const course = allCourses.find(c => c.name === name);
        const trendEmoji = {
          'rising': '🔼',
          'stable': '➡️',
          'falling': '🔽'
        }[course.trend] || '';
        return `${name} ${trendEmoji}`;
      }
    },
    series: [
      {
        name: '과정별 선호도',
        type: 'pie',
        radius: ['30%', '70%'],
        center: ['45%', '55%'],
        roseType: 'radius',
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}:\n{c}명',
          fontSize: 11
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data: allCourses.map(course => ({
          ...course,
          itemStyle: {
            color: course.color
          }
        }))
      }
    ]
  };

  chart.setOption(option);
  return chart;
}


// export function renderPreferenceChart(data) {
//   const chartDom = document.getElementById('preferenceChart');
//   const chart = echarts.init(chartDom, 'custom');
//
//   if (!data.preference?.current_data?.preferences?.domains) {
//     console.error('선호도 데이터가 없습니다');
//     return;
//   }
//
//   const domains = data.preference.current_data.preferences.domains;
//
//   // 파이 차트용 데이터 준비
//   const pieData = domains.map(domain => ({
//     name: domain.domainName,
//     value: domain.total,
//     itemStyle: {
//       borderRadius: 5,
//       borderColor: '#fff',
//       borderWidth: 2
//     },
//     // 각 도메인의 상세 정보를 툴팁에서 보여주기 위해 저장
//     courses: domain.courses
//   }));
//
//   const option = {
//     title: {
//       text: '강의 분야별 선호도',
//       left: 'center',
//       top: 10,
//       textStyle: {
//         fontSize: 16,
//         fontWeight: 'bold'
//       }
//     },
//     tooltip: {
//       trigger: 'item',
//       formatter: function (params) {
//         const domain = params.data;
//         let html = `<div style="font-weight:bold">${params.name}</div>`;
//         html += `<div>전체 수강생: ${params.value.toFixed(1)}명 (${params.percent.toFixed(1)}%)</div>`;
//         html += '<div style="margin-top:8px">과정별 현황:</div>';
//
//         domain.courses.forEach(course => {
//           html += `<div>${course.courseName}: ${course.activeStudents.toFixed(1)}명</div>`;
//         });
//
//         return html;
//       }
//     },
//     legend: {
//       type: 'scroll',
//       orient: 'vertical',
//       right: '5%',
//       top: 'middle',
//       formatter: name => {
//         const domain = domains.find(d => d.domainName === name);
//         return `${name}: ${domain.total.toFixed(1)}명`;
//       }
//     },
//     series: [
//       {
//         name: '분야별 선호도',
//         type: 'pie',
//         radius: ['40%', '70%'], // 도넛 차트 스타일
//         center: ['45%', '50%'],  // 차트 중심점 조정
//         avoidLabelOverlap: true,
//         itemStyle: {
//           borderRadius: 10,
//           borderColor: '#fff',
//           borderWidth: 2
//         },
//         label: {
//           show: true,
//           position: 'outer',
//           formatter: '{b}: {d}%',
//           fontSize: 12
//         },
//         emphasis: {
//           label: {
//             show: true,
//             fontSize: 14,
//             fontWeight: 'bold'
//           },
//           itemStyle: {
//             shadowBlur: 10,
//             shadowOffsetX: 0,
//             shadowColor: 'rgba(0, 0, 0, 0.5)'
//           }
//         },
//         data: pieData
//       }
//     ]
//   };
//
//   chart.setOption(option);
//   return chart;
// }


export async function initDashboard() {
  try {
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
      coursePerformance: renderCoursePerformanceChart(data.performance),
      preference: renderPreferenceChart(data)
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
  } catch (error) {
    console.error('대시보드 초기화 실패:', error);
    document.querySelectorAll('.chart').forEach(el => {
      el.classList.remove('loading');
      el.innerHTML = '<div class="error">대시보드를 초기화할 수 없습니다.</div>';
    });
  }
}

document.addEventListener('DOMContentLoaded', initDashboard);
