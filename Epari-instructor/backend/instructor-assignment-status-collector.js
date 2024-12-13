import { uploadToS3 } from './utils/s3-uploader.js';
import { loadStatisticsFromS3 } from './utils/s3-loader.js';
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
 * 과제 통계 데이터를 생성하고 S3에 저장하는 함수
 */
async function collectAssignmentStatistics() {
  const now = new Date();
  const fileName = `statistics-instructor-assignment-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  const stats = generateRandomStatistics();

  const assignmentData = {
    statistics_list: [] // 통계 데이터 배열
  };

  const newStatistics = {
    timestamp: now.toISOString(),
    statistics: {
      total_students: stats.totalStudents,
      assignment_status: stats.assignmentStatus,
      submission_rate: stats.submissionRate,
      assignment_info: stats.assignmentInfo
    }
  };

  try {
    // 기존 데이터 로드
    const existingData = await loadStatisticsFromS3('assignment', now.toISOString().slice(0, 10).replace(/-/g, ''));

    let dataToSave;
    if (existingData) {
      existingData.statistics_list.push(newStatistics);
      dataToSave = existingData;
    } else {
      assignmentData.statistics_list.push(newStatistics);
      dataToSave = assignmentData;
    }

    // S3에 저장
    await uploadToS3('assignment', fileName, dataToSave);

    console.log(`통계가 성공적으로 저장되었습니다: assignment/${fileName}`);
    console.log(`총 학생 수: ${stats.totalStudents}명`);
    console.log(`제출율: ${stats.submissionRate}%`);
    console.log(`제출: ${stats.assignmentStatus[0].count}명, 미제출: ${stats.assignmentStatus[1].count}명`);
  } catch (error) {
    console.error('통계 저장 중 오류 발생:', error);
  }
}

// 1시간마다 실행
const ONE_HOUR = 1000 * 60 * 60;
setInterval(collectAssignmentStatistics, ONE_HOUR);

// 초기 실행
collectAssignmentStatistics();
