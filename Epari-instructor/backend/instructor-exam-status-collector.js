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

  // 시험 정보 추가
  const examInfo = {
    title: "JavaScript 기초 평가",
  };

  return {
    totalStudents,
    submissionRate,
    examStatus: [
      {
        status: "응시",
        count: submittedCount
      },
      {
        status: "미응시",
        count: notSubmittedCount
      }
    ],
    examInfo
  };
}

/**
 * 시험 통계 데이터를 생성하고 DynamoDB에 저장하는 함수
 */
async function collectExamStatistics() {
  try {
    const stats = generateRandomStatistics();

    // DynamoDB에 통계 저장
    await statisticsRepository.saveStatistics('exam', {
      total_students: stats.totalStudents,
      exam_status: stats.examStatus,
      submission_rate: stats.submissionRate,
      examInfo: stats.examInfo
    });

    console.log(`시험 통계가 저장되었습니다`);
    console.log(`총 학생 수: ${stats.totalStudents}명`);
    console.log(`응시율: ${stats.submissionRate}%`);
    console.log(`응시: ${stats.examStatus[0].count}명, 미응시: ${stats.examStatus[1].count}명`);
  } catch (error) {
    console.error('시험 통계 저장 중 오류 발생:', error);
  }
}

// 1시간마다 실행
const ONE_HOUR = 1000 * 60 * 60;
setInterval(collectExamStatistics, ONE_HOUR);

// 초기 실행
collectExamStatistics();
