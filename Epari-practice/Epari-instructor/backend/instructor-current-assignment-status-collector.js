import { statisticsRepository } from './utils/statistics-repository.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 현재 과제 데이터 생성
 */
function generateCurrentAssignmentData() {
  const totalStudents = 30;
  const submittedCount = 5;
  const notSubmittedCount = totalStudents - submittedCount;

  // 현재 과제 정보
  const assignmentInfo = {
    title: "JSON 작성",
    deadline: "2024-11-26T10:00:00"
  };

  return {
    totalStudents,
    submissionRate: (submittedCount / totalStudents * 100).toFixed(1),
    assignmentStatus: [
      {
        status: "제출",
        count: submittedCount
      },
      {
        status: "미제출",
        count: notSubmittedCount
      }
    ],
    assignmentInfo
  };
}

/**
 * 현재 과제 통계 데이터를 생성하고 DynamoDB에 저장하는 함수
 */
async function collectCurrentAssignmentStatistics() {
  try {
    const stats = generateCurrentAssignmentData();

    // DynamoDB에 통계 저장
    await statisticsRepository.saveStatistics('current-assignment', {
      total_students: stats.totalStudents,
      assignment_status: stats.assignmentStatus,
      submission_rate: stats.submissionRate,
      assignment_info: stats.assignmentInfo
    });

    console.log(`현재 과제 통계가 저장되었습니다`);
    console.log(`총 학생 수: ${stats.totalStudents}명`);
    console.log(`제출율: ${stats.submissionRate}%`);
    console.log(`제출: ${stats.assignmentStatus[0].count}명, 미제출: ${stats.assignmentStatus[1].count}명`);
  } catch (error) {
    console.error('현재 과제 통계 저장 중 오류 발생:', error);
  }
}

// 1시간마다 실행
const ONE_HOUR = 1000 * 60 * 60;
setInterval(collectCurrentAssignmentStatistics, ONE_HOUR);

// 초기 실행
collectCurrentAssignmentStatistics();
