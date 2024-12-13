import { uploadToS3 } from './utils/s3-uploader.js';
import { loadStatisticsFromS3 } from './utils/s3-loader.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 학생 데이터 생성
 */
function generateStudentData() {
  const studentNames = [
    '김철수', '이영희', '박민준', '정서연', '최준호',
    '강지원', '임서진', '송민서', '한예진', '오동현',
    '윤수빈', '이준영', '김소희', '박지훈', '최유진',
    '정현우', '강민지', '임재현', '송지은', '한승우',
    '오미란', '윤도현', '이수연', '김태윤', '박서현',
    '최민수', '정다은', '강현준', '임지현', '송우진'
  ];

  const students = studentNames.map(name => {
    const attendanceRate = 91 + Math.random() * 8;
    const examAverage = 82 + Math.random() * 13;
    const recentExamScore = Math.max(0, Math.min(100,
        examAverage + (Math.random() * 10 - 5)
    ));
    const submittedAssignments = 7 + Math.floor(Math.random() * 4);
    const totalAssignments = 10;

    return {
      name,
      attendance_rate: Number(attendanceRate.toFixed(1)),
      exam_average: Number(examAverage.toFixed(1)),
      recent_exam: {
        date: "2024-12-01",
        score: Math.round(recentExamScore),
        class_rank: 0
      },
      assignment_status: {
        submitted: submittedAssignments,
        total: totalAssignments,
        participation_rate: Number((submittedAssignments / totalAssignments * 100).toFixed(1))
      }
    };
  });

  // 시험 점수에 따른 등수 계산
  students.sort((a, b) => b.recent_exam.score - a.recent_exam.score);
  students.forEach((student, index) => {
    student.recent_exam.class_rank = index + 1;
  });

  // 클래스 요약 통계 계산
  const classSummary = {
    total_students: students.length,
    average_attendance: Number((
        students.reduce((sum, s) => sum + s.attendance_rate, 0) / students.length
    ).toFixed(1)),
    average_exam_score: Number((
        students.reduce((sum, s) => sum + s.exam_average, 0) / students.length
    ).toFixed(1)),
    assignment_completion_rate: Number((
        students.reduce((sum, s) => sum + s.assignment_status.participation_rate, 0) / students.length
    ).toFixed(1))
  };

  return { students, classSummary };
}

/**
 * 학생 통계 데이터를 생성하고 S3에 저장하는 함수
 */
async function collectStudentStatistics() {
  const now = new Date();
  const fileName = `statistics-instructor-students-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  const { students, classSummary } = generateStudentData();

  const studentData = {
    student_records: []
  };

  const newStatistics = {
    timestamp: now.toISOString(),
    students,
    class_summary: classSummary
  };

  try {
    // 기존 데이터 로드
    const existingData = await loadStatisticsFromS3('students', now.toISOString().slice(0, 10).replace(/-/g, ''));

    let dataToSave;
    if (existingData) {
      existingData.student_records.push(newStatistics);
      dataToSave = existingData;
    } else {
      studentData.student_records.push(newStatistics);
      dataToSave = studentData;
    }

    // S3에 저장
    await uploadToS3('students', fileName, dataToSave);

    console.log(`통계가 성공적으로 저장되었습니다: students/${fileName}`);
    console.log(`총 학생 수: ${classSummary.total_students}명`);
    console.log(`평균 출석률: ${classSummary.average_attendance}%`);
    console.log(`평균 시험 점수: ${classSummary.average_exam_score}점`);
  } catch (error) {
    console.error('통계 저장 중 오류 발생:', error);
  }
}

// 1시간마다 실행
const ONE_HOUR = 1000 * 60 * 60;
setInterval(collectStudentStatistics, ONE_HOUR);

// 초기 실행
collectStudentStatistics();
