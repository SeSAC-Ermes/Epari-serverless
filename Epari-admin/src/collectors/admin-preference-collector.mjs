import { writeFile, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { uploadJsonToS3 } from '../utils/s3-uploader.mjs';

// ESM에서의 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// dotenv 설정
dotenv.config();

// 트렌드 계산을 위한 기준값 설정
const TREND_THRESHOLD = 0.05; // 5% 변동을 기준으로 트렌드 판단

// 선호도 데이터 구조 정의 (색상 정보 추가)
const COURSE_PREFERENCES = {
  'programming': {
    name: '프로그래밍',
    color: '#5470c6',
    courses: [
      { id: 'java_basic', name: '자바 프로그래밍 기초', baseCount: 20, trend: 'rising', color: '#5470c6' },
      { id: 'web_dev', name: '웹 개발 실무', baseCount: 40, trend: 'stable', color: '#91cc75' },
      { id: 'backend_algo', name: '백엔드 알고리즘의 이해', baseCount: 20, trend: 'rising', color: '#fac858' }
    ]
  },
  'data_science': {
    name: '데이터 사이언스',
    color: '#ee6666',
    courses: [
      { id: 'db_intro', name: '데이터베이스 입문', baseCount: 10, trend: 'stable', color: '#ee6666' },
      { id: 'ai_basics', name: '인공지능 개론', baseCount: 10, trend: 'rising', color: '#73c0de' }
    ]
  },
  'cloud': {
    name: '클라우드',
    color: '#3ba272',
    courses: [
      { id: 'aws_basics', name: 'AWS 기초', baseCount: 15, trend: 'rising', color: '#3ba272' },
      { id: 'docker', name: '도커/쿠버네티스', baseCount: 25, trend: 'rising', color: '#fc8452' }
    ]
  }
};

// 트렌드에 따른 색상 조정 함수
function adjustColorByTrend(baseColor, trend) {
  const hex2rgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const rgb2hex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const [r, g, b] = hex2rgb(baseColor);

  switch (trend) {
    case 'rising':
      return rgb2hex(Math.min(255, r * 1.2), Math.min(255, g * 1.2), Math.min(255, b * 1.2));
    case 'falling':
      return rgb2hex(r * 0.8, g * 0.8, b * 0.8);
    default:
      return baseColor;
  }
}

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
          trend: trend,
          color: adjustColorByTrend(course.color, trend) // 트렌드에 따라 색상 조정
        };
      });

      return {
        domainId: key,
        domainName: domain.name,
        total: domainCourses.reduce((sum, course) => sum + course.activeStudents, 0),
        courses: domainCourses,
        color: domain.color
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

      if (!existingData.historical_data) {
        existingData.historical_data = [];
      }

      if (existingData.historical_data.length >= 24) {
        existingData.historical_data.shift();
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

    const uploadResult = await uploadJsonToS3(
        finalData,
        'http://localhost:3000/api/admin/courses-preference',
        process.env.AWS_BUCKET_NAME
    );

    if (uploadResult.success) {
      console.log('선호도 통계가 S3에 업로드되었습니다:', uploadResult.path);
    }
  } catch (error) {
    console.error('선호도 통계 처리 중 오류 발생:', error);
  }
}

// 실행 스케줄링 설정
function scheduleCollection() {
  // 즉시 실행
  collectCoursePreferenceStatistics();

  // 1시간 마다
  const FIFTEEN_SECONDS = 60 * 60 * 1000;
  setInterval(collectCoursePreferenceStatistics, FIFTEEN_SECONDS);
}

// 프로세스 시작
scheduleCollection();

export default collectCoursePreferenceStatistics;
