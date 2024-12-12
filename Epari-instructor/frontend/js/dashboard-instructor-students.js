async function loadStudentData() {
  try {
    const yyyyMMdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const API_BASE_URL = 'http://localhost:3001';
    const response = await fetch(`${API_BASE_URL}/api/v1/statistics/students/${yyyyMMdd}`);
    const data = await response.json();
    return data.student_records[0];
  } catch (error) {
    console.error('Failed to load student data:', error);
    return null;
  }
}

function displayClassSummary(summary) {
  const summaryHtml = `
    <div class="summary-item">전체 학생 수: ${summary.total_students}명</div>
    <div class="summary-item">평균 출석률: ${summary.average_attendance}%</div>
    <div class="summary-item">평균 시험 점수: ${summary.average_exam_score}점</div>
    <div class="summary-item">과제 완료율: ${summary.assignment_completion_rate}%</div>
  `;
  document.getElementById('classSummary').innerHTML = summaryHtml;
}

function initializeAgGrid(data) {
  const columnDefs = [
    { field: "name", headerName: "이름", sortable: true, filter: true },
    {
      field: "attendance_rate",
      headerName: "출석률",
      sortable: true,
      filter: true,
      valueFormatter: params => `${params.value}%`
    },
    {
      field: "exam_average",
      headerName: "평균 시험 점수",
      sortable: true,
      filter: true,
      valueFormatter: params => `${params.value}점`
    },
    {
      field: "assignment_status.submitted",
      headerName: "과제 제출",
      sortable: true,
      valueFormatter: params => `${params.value}/${params.data.assignment_status.total}`
    },
    {
      field: "assignment_status.participation_rate",
      headerName: "과제 참여율",
      sortable: true,
      valueFormatter: params => `${params.value}%`
    },
    {
      field: "recent_exam.score",
      headerName: "최근 시험 점수",
      sortable: true,
      valueFormatter: params => `${params.value}점`
    },
    {
      field: "recent_exam.class_rank",
      headerName: "최근 시험 등수",
      sortable: true,
      valueFormatter: params => `${params.value}등`
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: data.students,
    pagination: true,
    paginationPageSize: 10,
    defaultColDef: {
      flex: 1,
      minWidth: 100,
      resizable: true
    }
  };

  const gridDiv = document.querySelector('#studentGrid');
  return agGrid.createGrid(gridDiv, gridOptions);
}

async function initStudentDashboard() {
  const data = await loadStudentData();
  if (!data) {
    document.getElementById('studentGrid').innerHTML = '<div class="error">데이터를 불러올 수 없습니다.</div>';
    return;
  }

  displayClassSummary(data.class_summary);
  initializeAgGrid(data);
}

document.addEventListener('DOMContentLoaded', initStudentDashboard);
