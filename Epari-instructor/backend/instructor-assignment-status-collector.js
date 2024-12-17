import { statisticsRepository } from './utils/statistics-repository.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 랜덤 데이터 생성
 */
function generateRandomStatistics() {
  const totalStudents = 30;
  const submissionRate = Math.floor(Math.random() * (100 - 60 + 1)) + 60;
  const submittedCount = Math.round((totalStudents * submissionRate) / 100);
  const notSubmittedCount = totalStudents - submittedCount;

  // 과제 정보
  const assignmentInfo = {
    title: "JavaScript 기초",
    deadline: "2024-11-20T10:00:00"
  };

  return {
    totalStudents,
    submissionRate,
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
 * 과제 통계 데이터를 생성하고 DynamoDB에 저장하는 함수
 */
async function collectAssignmentStatistics() {
  try {
    const stats = generateRandomStatistics();

    // DynamoDB에 통계 저장
    await statisticsRepository.saveStatistics('assignment', {
      total_students: stats.totalStudents,
      assignment_status: stats.assignmentStatus,
      submission_rate: stats.submissionRate,
      assignment_info: stats.assignmentInfo
    });

    console.log(`과제 통계가 저장되었습니다`);
    console.log(`총 학생 수: ${stats.totalStudents}명`);
    console.log(`제출율: ${stats.submissionRate}%`);
    console.log(`제출: ${stats.assignmentStatus[0].count}명, 미제출: ${stats.assignmentStatus[1].count}명`);

  } catch (error) {
    console.error('과제 통계 저장 중 오류 발생:', error);
  }
}

// 1시간마다 실행
const ONE_HOUR = 1000 * 60 * 60;
setInterval(collectAssignmentStatistics, ONE_HOUR);

// 초기 실행
collectAssignmentStatistics();
