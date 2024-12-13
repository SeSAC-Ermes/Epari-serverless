import { writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 사용현황
 */

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

async function collectFacilityStatistics() {
  const now = new Date();
  const fileName = `statistics-admin-facility-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  const startDate = new Date(now);
  startDate.setHours(0,0,0,0);
  const endDate = new Date(now);
  endDate.setHours(23,59,59,999);

  // facility_status 데이터 생성 시 퍼센트 추가
  const facilityStatus = {
    total: 5,
    inUse: 2,
    available: 3,
    percentages: {
      inUse: 40,    // (2/5) * 100
      available: 60  // (3/5) * 100
    }
  };

  const currentStats = {
    timestamp: now.toISOString(),
    course_statistics: {
      total_enrollment: 100,
      course_enrollments: [
        {
          course_id: "MSA101",
          course_name: "MSA 기반 자바 개발자",
          instructor: "윤지수",
          period: "2024-07-03 ~ 2024-12-30",
          room: "301호",
          current_students: 20
        },
        {
          course_id: "IOS201",
          course_name: "IOS 앱 개발자",
          instructor: "박지수",
          period: "2024-07-03 ~ 2024-12-30",
          room: "301호",
          current_students: 40
        },
        {
          course_id: "CLD301",
          course_name: "클라우드 SW엔지니어",
          instructor: "김지수",
          period: "2024-07-03 ~ 2024-12-30",
          room: "301호",
          current_students: 10
        },
        {
          course_id: "DAI401",
          course_name: "데이터 AI 개발자",
          instructor: "최지수",
          period: "2024-07-03 ~ 2024-12-30",
          room: "301호",
          current_students: 20
        },
        {
          course_id: "BDA501",
          course_name: "빅데이터 과정",
          instructor: "표지수",
          period: "2024-07-03 ~ 2024-12-30",
          room: "301호",
          current_students: 10
        }
      ],
      facility_status: facilityStatus
    },
    historical_data: []
  };

  try {
    const saveFolder = process.env.SAVEFOLDER ?? 'jsons';
    const filePath = join(__dirname, '..', saveFolder, fileName);

    const existingData = await loadExistingData(filePath);
    if (existingData) {
      // 기존 데이터가 있으면 historical_data에 새로운 데이터 추가
      if (!existingData.historical_data) {
        existingData.historical_data = [];
      }

      existingData.historical_data.push({
        timestamp: {
          created_at: now.toISOString(),
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        },
        data: {
          total_enrollment: currentStats.course_statistics.total_enrollment,
          course_enrollments: currentStats.course_statistics.course_enrollments,
          facility_status: currentStats.course_statistics.facility_status
        }
      });

      // 타임스탬프 업데이트
      existingData.timestamp = now.toISOString();
      existingData.course_statistics = currentStats.course_statistics;

      await writeFile(filePath, JSON.stringify(existingData, null, 2));
    } else {
      // 파일이 없으면 현재 데이터로 새 파일 생성
      await writeFile(filePath, JSON.stringify(currentStats, null, 2));
    }

    console.log(`통계가 성공적으로 저장되었습니다: ${filePath}`);
  } catch (error) {
    console.error('통계 저장 중 오류 발생:', error);
  }
}

const THIRTY_SECONDS = 60 * 60 * 1000;
setInterval(collectFacilityStatistics, THIRTY_SECONDS);

await collectFacilityStatistics();
