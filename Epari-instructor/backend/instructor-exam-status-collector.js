import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateRandomStatistics() {
  // 30~50명 사이의 랜덤한 총 학생 수 생성
  const totalStudents = Math.floor(Math.random() * (50 - 30 + 1)) + 30;

  // 60%~100% 사이의 랜덤한 응시율 생성
  const submissionRate = Math.floor(Math.random() * (100 - 60 + 1)) + 60;

  // 응시 학생 수 계산 (응시율에 따른 학생 수)
  const submittedCount = Math.round((totalStudents * submissionRate) / 100);
  const notSubmittedCount = totalStudents - submittedCount;

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
    ]
  };
}

async function collectExamStatistics() {
  const now = new Date();
  const fileName = `statistics-instructor-exam-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  // 랜덤 통계 생성
  const stats = generateRandomStatistics();

  const examData = {
    date: now.toISOString(),
    timestamp: {
      created_at: now.toISOString(),
      period: { // TODO: 추후 확인
        start: new Date(now.setHours(0, 0, 0, 0)).toISOString(),
        end: new Date(now.setHours(23, 59, 59, 999)).toISOString()
      },
      interval: "hourly",
      timezone: "Asia/Seoul"
    },
    instructor_statistics: { // TODO: 추후 네이밍 개선
      total_students: stats.totalStudents,
      exam_status: stats.examStatus,
      exam_details: {
        title: "2024년 11월 시험",
        date: "2024-11", // TODO: 추후 개선
        submission_rate: stats.submissionRate,
        chart_options: {
          start_angle: 180,
          end_angle: 360,
          inner_radius: "40%", // TODO: 오찬근
          outer_radius: "70%"
        }
      }
    },
    historical_data: []
  };

  try {
    const saveFolder = process.env.SAVEFOLDER || 'jsons';
    const filePath = join(__dirname, '..', saveFolder, fileName);

    const existingData = await loadExistingData(filePath);
    if (existingData) {
      existingData.historical_data.push({
        date: now.toISOString(),
        data: examData
      });
      await writeFile(filePath, JSON.stringify(existingData, null, 2));
    } else {
      await writeFile(filePath, JSON.stringify(examData, null, 2));
    }

    console.log(`통계가 성공적으로 저장되었습니다: ${filePath}`);
    console.log(`총 학생 수: ${stats.totalStudents}명`);
    console.log(`응시율: ${stats.submissionRate}%`);
    console.log(`응시: ${stats.examStatus[0].count}명, 미응시: ${stats.examStatus[1].count}명`);
  } catch (error) {
    console.error('통계 저장 중 오류 발생:', error);
  }
}

async function loadExistingData(filePath) {
  try {
    if (existsSync(filePath)) {
      const fileContent = await readFile(filePath, 'utf8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('기존 데이터 로드 중 오류 발생:', error);
  }
  return null;
}

// 1시간마다 실행
const ONE_HOUR = 1000 * 10;
setInterval(collectExamStatistics, ONE_HOUR);

// 초기 실행
collectExamStatistics();
