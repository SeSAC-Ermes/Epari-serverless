import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

dotenv.config();

/**
 * 데이터 생성 및 관리
 * jsons 폴더에 날짜별 json 파일 저장
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 랜덤 데이터 생성
 */
function generateRandomStatistics() {
  const totalStudents = 34; // 고정된 총 학생 수
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
 * 현재 날짜로 파일명 생성
 * generateRandomStatistics 호출하여 랜덤 데이터 생성
 * 데이터 객체 구조 생성
 * 파일 저장 위치 설정
 * 기존 데이터가 있으면 히스토리에 추가
 */
async function collectAssignmentStatistics() {
  const now = new Date();
  const fileName = `statistics-instructor-assignment-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  const stats = generateRandomStatistics();

  const assignmentData = {
    statistics_list: [] // 통계 데이터 배열
  };

  // 새로운 통계 데이터
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
    const saveFolder = process.env.SAVEFOLDER || 'jsons';
    const filePath = join(__dirname, saveFolder, fileName);

    const existingData = await loadExistingData(filePath);
    if (existingData) {
      // 기존 데이터가 있으면 새 통계를 추가
      existingData.statistics_list.push(newStatistics);
      await writeFile(filePath, JSON.stringify(existingData, null, 2));
    } else {
      // 새 파일 생성
      assignmentData.statistics_list.push(newStatistics);
      await writeFile(filePath, JSON.stringify(assignmentData, null, 2));
    }

    console.log(`통계가 성공적으로 저장되었습니다: ${filePath}`);
    console.log(`총 학생 수: ${stats.totalStudents}명`);
    console.log(`제출율: ${stats.submissionRate}%`);
    console.log(`제출: ${stats.assignmentStatus[0].count}명, 미제출: ${stats.assignmentStatus[1].count}명`);
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
const ONE_HOUR = 1000 * 60 * 60;
setInterval(collectAssignmentStatistics, ONE_HOUR);

// 초기 실행
collectAssignmentStatistics();
