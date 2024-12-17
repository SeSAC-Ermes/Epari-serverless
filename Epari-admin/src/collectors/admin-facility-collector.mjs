import dotenv from 'dotenv';
import { saveToDatabase } from '../utils/dynamodb-utils.mjs';

dotenv.config();

async function collectFacilityStatistics() {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0,0,0,0);
  const endDate = new Date(now);
  endDate.setHours(23,59,59,999);

  const facilityStatus = {
    total: 5,
    inUse: 2,
    available: 3,
    percentages: {
      inUse: 40,
      available: 60
    }
  };

  const currentStats = {
    timestamp: {
      created_at: now.toISOString(),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    },
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
    }
  };

  try {
    const result = await saveToDatabase(
        process.env.DYNAMODB_TABLE_NAME,
        'FACILITY',
        currentStats
    );

    if (result.success) {
      console.log('시설 사용 통계가 DynamoDB에 저장되었습니다:', result.id);
    }
  } catch (error) {
    console.error('통계 처리 중 오류 발생:', error);
  }
}

const THIRTY_SECONDS = 60 * 60 * 1000;
setInterval(collectFacilityStatistics, THIRTY_SECONDS);

await collectFacilityStatistics();

export default collectFacilityStatistics;
