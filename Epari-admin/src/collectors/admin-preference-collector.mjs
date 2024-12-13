import { writeFile, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// ESM에서의 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// dotenv 설정
dotenv.config();

// 트렌드 계산을 위한 기준값 설정
const TREND_THRESHOLD = 0.05; // 5% 변동을 기준으로 트렌드 판단

// 선호도 데이터 구조 정의
const COURSE_PREFERENCES = {
  'programming': {
    name: '프로그래밍',
    courses: [
      { id: 'java_basic', name: '자바 프로그래밍 기초', baseCount: 20, trend: 'rising' },
      { id: 'web_dev', name: '웹 개발 실무', baseCount: 40, trend: 'stable' },
      { id: 'backend_algo', name: '백엔드 알고리즘의 이해', baseCount: 20, trend: 'rising' }
    ]
  },
  'data_science': {
    name: '데이터 사이언스',
    courses: [
      { id: 'db_intro', name: '데이터베이스 입문', baseCount: 10, trend: 'stable' },
      { id: 'ai_basics', name: '인공지능 개론', baseCount: 10, trend: 'rising' }
    ]
  },
  'cloud': {
    name: '클라우드',
    courses: [
      { id: 'aws_basics', name: 'AWS 기초', baseCount: 15, trend: 'rising' },
      { id: 'docker', name: '도커/쿠버네티스', baseCount: 25, trend: 'rising' }
    ]
  }
};

// 트렌드 계산 함수
function calculateTrend(currentValue, previousValue) {
  if (!previousValue) return 'stable';

  const changeRate = (currentValue - previousValue) / previousValue;

  if (changeRate > TREND_THRESHOLD) {
    return 'rising';
  } else if (changeRate < -TREND_THRESHOLD) {
    return 'falling';
  }
  return 'stable';
}

// 랜덤 수 생성 함수 (트렌드 반영)
function generateRandomEnrollment(baseCount, trend, variation = 0.2) {
  let trendMultiplier = 1;
  switch (trend) {
    case 'rising':
      trendMultiplier = 1.2;
      break;
    case 'falling':
      trendMultiplier = 0.8;
      break;
    case 'stable':
    default:
      trendMultiplier = 1;
  }

  const minCount = Math.max(0, baseCount * (1 - variation) * trendMultiplier);
  const maxCount = baseCount * (1 + variation) * trendMultiplier;
  return Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
}

// 파일 존재 확인 함수
async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// 시간대별 트래픽 가중치 계산
function getTimeBasedWeight(hour) {
  if (hour < 6) return 0.3;  // 새벽
  if (hour < 9) return 0.8;  // 아침
  if (hour < 18) return 1.0; // 수업시간
  if (hour < 22) return 0.9; // 저녁
  return 0.4;                // 밤
}

// 통계 수집 함수
async function collectCoursePreferenceStatistics() {
  const now = new Date();
  const fileName = `statistics-admin-preference-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  try {
    const saveFolder = process.env.SAVEFOLDER ?? 'jsons';
    const filePath = join(__dirname, '..', saveFolder, fileName);

    // 이전 데이터 읽기
    let previousData = null;
    if (await fileExists(filePath)) {
      const existingContent = await readFile(filePath, 'utf8');
      const existingData = JSON.parse(existingContent);
      if (existingData.historical_data && existingData.historical_data.length > 0) {
        previousData = existingData.historical_data[existingData.historical_data.length - 1].data;
      }
    }

    const timeWeight = getTimeBasedWeight(now.getHours());

    // 도메인별 데이터 생성
    const domainPreferences = Object.entries(COURSE_PREFERENCES).map(([key, domain]) => {
      const domainCourses = domain.courses.map(course => {
        const currentValue = generateRandomEnrollment(course.baseCount, course.trend) * timeWeight;

        // 이전 데이터에서 해당 과정의 수강생 수 찾기
        let previousValue = null;
        if (previousData) {
          const previousDomain = previousData.preferences.domains.find(d => d.domainId === key);
          if (previousDomain) {
            const previousCourse = previousDomain.courses.find(c => c.courseId === course.id);
            if (previousCourse) {
              previousValue = previousCourse.activeStudents;
            }
          }
        }

        // 트렌드 계산
        const trend = calculateTrend(currentValue, previousValue);

        return {
          courseId: course.id,
          courseName: course.name,
          activeStudents: currentValue,
          trend: trend
        };
      });

      return {
        domainId: key,
        domainName: domain.name,
        total: domainCourses.reduce((sum, course) => sum + course.activeStudents, 0),
        courses: domainCourses
      };
    });

    const preferenceData = {
      timestamp: now.toISOString(),
      period: {
        start: new Date(now.setHours(0, 0, 0, 0)).toISOString(),
        end: new Date(now.setHours(23, 59, 59, 999)).toISOString()
      },
      total_students: domainPreferences.reduce((sum, domain) => sum + domain.total, 0),
      preferences: {
        domains: domainPreferences,
        time_based_stats: {
          hour: now.getHours(),
          weight: timeWeight
        }
      }
    };

    // 파일 저장 로직
    let finalData;
    if (await fileExists(filePath)) {
      const existingContent = await readFile(filePath, 'utf8');
      const existingData = JSON.parse(existingContent);

      // historical_data 배열이 없으면 생성
      if (!existingData.historical_data) {
        existingData.historical_data = [];
      }

      // 최대 24개의 기록만 유지 (24시간)
      if (existingData.historical_data.length >= 24) {
        existingData.historical_data.shift(); // 가장 오래된 데이터 제거
      }

      existingData.historical_data.push({
        timestamp: now.toISOString(),
        data: preferenceData
      });

      finalData = {
        timestamp: now.toISOString(),
        historical_data: existingData.historical_data,
        current_data: preferenceData
      };
    } else {
      finalData = {
        timestamp: now.toISOString(),
        historical_data: [{
          timestamp: now.toISOString(),
          data: preferenceData
        }],
        current_data: preferenceData
      };
    }

    await writeFile(filePath, JSON.stringify(finalData, null, 2));
    console.log(`선호도 통계가 저장되었습니다: ${filePath}`);
  } catch (error) {
    console.error('선호도 통계 저장 중 오류 발생:', error);
  }
}

// 실행 스케줄링 설정
function scheduleCollection() {
  // 즉시 실행
  collectCoursePreferenceStatistics();

  // 1시간마다 실행
  const ONE_HOUR = 15 * 1000;
  setInterval(collectCoursePreferenceStatistics, ONE_HOUR);
}

// 프로세스 시작
scheduleCollection();

export default collectCoursePreferenceStatistics;
