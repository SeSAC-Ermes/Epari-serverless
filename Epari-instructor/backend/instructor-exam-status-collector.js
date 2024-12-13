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

  // 시험 정보 추가
  const examInfo = {
    title: "JavaScript 기초 평가",  // 시험 제목 추가
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
 * 시험 통계 데이터를 생성하고 S3에 저장하는 함수
 */
async function collectExamStatistics() {
  const now = new Date();
  const fileName = `statistics-instructor-exam-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  const stats = generateRandomStatistics();

  const examData = {
    statistics_list: [] // 통계 데이터 배열
  };

  const newStatistics = {
    timestamp: now.toISOString(),
    statistics: {
      total_students: stats.totalStudents,
      exam_status: stats.examStatus,
      submission_rate: stats.submissionRate,
      examInfo: stats.examInfo
    }
  };

  try {
    // 기존 데이터 로드
    const existingData = await loadStatisticsFromS3('exam', now.toISOString().slice(0, 10).replace(/-/g, ''));

    let dataToSave;
    if (existingData) {
      existingData.statistics_list.push(newStatistics);
      dataToSave = existingData;
    } else {
      examData.statistics_list.push(newStatistics);
      dataToSave = examData;
    }

    // S3에 저장
    await uploadToS3('exam', fileName, dataToSave);

    console.log(`통계가 성공적으로 저장되었습니다: exam/${fileName}`);
    console.log(`총 학생 수: ${stats.totalStudents}명`);
    console.log(`응시율: ${stats.submissionRate}%`);
    console.log(`응시: ${stats.examStatus[0].count}명, 미응시: ${stats.examStatus[1].count}명`);
  } catch (error) {
    console.error('통계 저장 중 오류 발생:', error);
  }
}

// 1시간마다 실행
const ONE_HOUR = 10000 * 60 * 60;
setInterval(collectExamStatistics, ONE_HOUR);

// 초기 실행
collectExamStatistics();
