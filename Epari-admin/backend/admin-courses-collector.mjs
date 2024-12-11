import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { existsSync } from 'node:fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function collectCourseStatistics() {
  const now = new Date();
  const fileName = `statistics-admin-courses-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  const dummyData = {
    date: now.toISOString(),
    timestamp: {
      created_at: now.toISOString(),
      period: {
        start: new Date(now.setHours(0,0,0,0)).toISOString(),
        end: new Date(now.setHours(23,59,59,999)).toISOString()
      },
      interval: "hourly",
      timezone: "Asia/Seoul"
    },
    admin_statistics: {
      total_enrollment: 100,
      course_enrollments: [
        {
          course_name: "자바 프로그래밍 기초",
          enrolled_count: 20
        },
        {
          course_name: "웹 개발 실무",
          enrolled_count: 40
        },
        {
          course_name: "데이터베이스 입문",
          enrolled_count: 10
        },
        {
          course_name: "백엔드 알고리즘의 이해",
          enrolled_count: 20
        },
        {
          course_name: "인공지능 개론",
          enrolled_count: 10
        }
      ]
    },
    historical_data: []
  };

  try {
    // ESM: Nullish 병합 연산자 (??) 사용
    const saveFolder = process.env.SAVEFOLDER ?? 'jsons';
    const filePath = join(__dirname, '..', saveFolder, fileName);

    const existingData = await loadExistingData(filePath);
    if (existingData) {
      existingData.historical_data.push({
        date: now.toISOString(),
        data: dummyData
      });
      await writeFile(filePath, JSON.stringify(existingData, null, 2));
    } else {
      await writeFile(filePath, JSON.stringify(dummyData, null, 2));
    }

    console.log(`통계가 성공적으로 저장되었습니다: ${filePath}`);
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

const ONE_HOUR = 360 * 60 * 1000;
setInterval(collectCourseStatistics, ONE_HOUR);

await collectCourseStatistics();
