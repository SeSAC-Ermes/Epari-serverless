import dotenv from 'dotenv';
import { saveToDatabase, getLatestData } from '../utils/dynamodb-utils.mjs';

dotenv.config();

async function collectCourseStatistics() {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0,0,0,0);
  const endDate = new Date(now);
  endDate.setHours(23,59,59,999);

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
          course_name: "MSA 기반 자바 개발자",
          enrolled_count: 20
        },
        {
          course_name: "IOS 앱 개발자",
          enrolled_count: 40
        },
        {
          course_name: "클라우드 SW엔지니어",
          enrolled_count: 10
        },
        {
          course_name: "데이터 AI 개발자",
          enrolled_count: 20
        },
        {
          course_name: "빅데이터 과정",
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
                course_name: "MSA 기반 자바 개발자",
                enrolled_count: 20
              },
              {
                course_name: "IOS 앱 개발자",
                enrolled_count: 40
              },
              {
                course_name: "클라우드 SW엔지니어",
                enrolled_count: 10
              },
              {
                course_name: "데이터 AI 개발자",
                enrolled_count: 20
              },
              {
                course_name: "빅데이터 과정",
                enrolled_count: 10
              }
            ]
          }
        ]
      }
    }
  };

  try {
    const result = await saveToDatabase(
        process.env.DYNAMODB_TABLE_NAME,
        'COURSE',
        currentStats
    );

    if (result.success) {
      console.log('강의 통계가 DynamoDB에 저장되었습니다:', result.id);
    }
  } catch (error) {
    console.error('통계 처리 중 오류 발생:', error);
  }
}

// 실행 로직
const ONE_HOUR = 60 * 60 * 1000;
setInterval(collectCourseStatistics, ONE_HOUR);

// 초기 실행
await collectCourseStatistics();

export default collectCourseStatistics;
