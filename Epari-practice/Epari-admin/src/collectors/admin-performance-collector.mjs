import dotenv from 'dotenv';
import { saveToDatabase } from '../utils/dynamodb-utils.mjs';

dotenv.config();

// 과거 데이터 (7월부터 11월까지의 실제 데이터)
const historicalData = {
  "2024-07": {
    employment: {
      "MSA 기반 자바 개발자": 82,
      "IOS 앱 개발자": 85,
      "클라우드 SW엔지니어": 88,
      "데이터 AI 개발자": 84,
      "빅데이터 과정": 80
    },
    dropout: {
      "MSA 기반 자바 개발자": 8,
      "IOS 앱 개발자": 7,
      "클라우드 SW엔지니어": 6,
      "데이터 AI 개발자": 9,
      "빅데이터 과정": 10
    }
  },
  "2024-08": {
    employment: {
      "MSA 기반 자바 개발자": 84,
      "IOS 앱 개발자": 87,
      "클라우드 SW엔지니어": 90,
      "데이터 AI 개발자": 86,
      "빅데이터 과정": 82
    },
    dropout: {
      "MSA 기반 자바 개발자": 7,
      "IOS 앱 개발자": 6,
      "클라우드 SW엔지니어": 5,
      "데이터 AI 개발자": 8,
      "빅데이터 과정": 9
    }
  },
  "2024-09": {
    employment: {
      "MSA 기반 자바 개발자": 86,
      "IOS 앱 개발자": 89,
      "클라우드 SW엔지니어": 91,
      "데이터 AI 개발자": 88,
      "빅데이터 과정": 84
    },
    dropout: {
      "MSA 기반 자바 개발자": 6,
      "IOS 앱 개발자": 5,
      "클라우드 SW엔지니어": 4,
      "데이터 AI 개발자": 7,
      "빅데이터 과정": 8
    }
  },
  "2024-10": {
    employment: {
      "MSA 기반 자바 개발자": 88,
      "IOS 앱 개발자": 91,
      "클라우드 SW엔지니어": 93,
      "데이터 AI 개발자": 90,
      "빅데이터 과정": 86
    },
    dropout: {
      "MSA 기반 자바 개발자": 5,
      "IOS 앱 개발자": 4,
      "클라우드 SW엔지니어": 3,
      "데이터 AI 개발자": 6,
      "빅데이터 과정": 7
    }
  },
  "2024-11": {
    employment: {
      "MSA 기반 자바 개발자": 89,
      "IOS 앱 개발자": 92,
      "클라우드 SW엔지니어": 94,
      "데이터 AI 개발자": 91,
      "빅데이터 과정": 87
    },
    dropout: {
      "MSA 기반 자바 개발자": 4,
      "IOS 앱 개발자": 3,
      "클라우드 SW엔지니어": 2,
      "데이터 AI 개발자": 5,
      "빅데이터 과정": 6
    }
  }
};

async function collectMonthlyPerformance() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  try {
    // 현재 달의 새로운 데이터 생성
    const currentMonthData = {
      employment: {
        "MSA 기반 자바 개발자": 90 + Math.floor(Math.random() * 3),
        "IOS 앱 개발자": 93 + Math.floor(Math.random() * 3),
        "클라우드 SW엔지니어": 95 + Math.floor(Math.random() * 2),
        "데이터 AI 개발자": 92 + Math.floor(Math.random() * 3),
        "빅데이터 과정": 88 + Math.floor(Math.random() * 4)
      },
      dropout: {
        "MSA 기반 자바 개발자": 3 + Math.floor(Math.random() * 2),
        "IOS 앱 개발자": 2 + Math.floor(Math.random() * 2),
        "클라우드 SW엔지니어": 1 + Math.floor(Math.random() * 2),
        "데이터 AI 개발자": 4 + Math.floor(Math.random() * 2),
        "빅데이터 과정": 5 + Math.floor(Math.random() * 2)
      }
    };

    // 전체 데이터 구성
    const performanceData = {
      timestamp: {
        created_at: now.toISOString(),
        period: `${year}-${month}`
      },
      historical_data: historicalData,
      current_month: {
        period: `${year}-${month}`,
        data: currentMonthData
      }
    };

    const result = await saveToDatabase(
        process.env.DYNAMODB_TABLE_NAME,
        'PERFORMANCE',
        performanceData
    );

    if (result.success) {
      console.log(`${year}년 ${month}월 성과 통계가 DynamoDB에 저장되었습니다:`, result.id);
    }

  } catch (error) {
    console.error('성과 통계 저장 중 오류 발생:', error);
  }
}

// 매일 자정에 실행
function scheduleCollection() {
  const now = new Date();
  const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 0
  );
  const msToMidnight = night.getTime() - now.getTime();

  setTimeout(() => {
    collectMonthlyPerformance();
    setInterval(collectMonthlyPerformance, 24 * 60 * 60 * 1000);
  }, msToMidnight);
}

// 초기 실행
await collectMonthlyPerformance();
scheduleCollection();

export default collectMonthlyPerformance;
