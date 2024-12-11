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
  const startDate = new Date(now);
  startDate.setHours(0,0,0,0);
  const endDate = new Date(now);
  endDate.setHours(23,59,59,999);

  const fileName = `statistics-admin-courses-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  const currentStats = {
    timestamp: {
      created_at: now.toISOString(),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      interval: "hourly",
      timezone: "Asia/Seoul"
    },
    course_statistics: {
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
          course_name: "알고리즘의 이해",
          enrolled_count: 20
        },
        {
          course_name: "인공지능 개론",
          enrolled_count: 10
        }
      ],
      time_series_data: {
        hourly_enrollments: [
          {
            timestamp: now.toISOString(),
            total_users: 100,
            course_wise: [
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
                course_name: "알고리즘의 이해",
                enrolled_count: 20
              },
              {
                course_name: "인공지능 개론",
                enrolled_count: 10
              }
            ]
          }
        ]
      }
    },
    historical_data: []
  };

  try {
    const saveFolder = process.env.SAVEFOLDER ?? 'jsons';
    const filePath = join(__dirname, '..', saveFolder, fileName);

    const existingData = await loadExistingData(filePath);
    if (existingData) {
      // 기존 데이터가 있으면 historical_data에 새로운 데이터 추가
      existingData.historical_data.push({
        timestamp: {
          created_at: now.toISOString(),
          period: currentStats.timestamp.period
        },
        data: {
          total_enrollment: currentStats.course_statistics.total_enrollment,
          course_enrollments: currentStats.course_statistics.course_enrollments
        }
      });
      await writeFile(filePath, JSON.stringify(existingData, null, 2));
    } else {
      // 파일이 없으면 현재 데이터로 새 파일 생성
      const newData = {
        ...currentStats,
        historical_data: []  // 빈 historical_data 배열로 시작
      };
      await writeFile(filePath, JSON.stringify(newData, null, 2));
    }


    console.log(`통계가 성공적으로 저장되었습니다: ${filePath}`);
  } catch (error) {
    console.error('통계 저장 중 오류 발생:', error);
  }
}

// 기존 데이터 로드 함수
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

// 실행 로직
const ONE_HOUR = 30 * 1000;
setInterval(collectCourseStatistics, ONE_HOUR);

await collectCourseStatistics();
