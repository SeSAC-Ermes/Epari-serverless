import { writeFile, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { uploadJsonToS3 } from '../utils/s3-uploader.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const TREND_THRESHOLD = 0.05;

// 색상 정보는 프론트엔드 참조용으로만 유지
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

function generateRandomEnrollment(baseCount, trend, variation = 0.2) {
  let trendMultiplier = 1;
  switch (trend) {
    case 'rising':
      trendMultiplier = 1.2;
      break;
    case 'falling':
      trendMultiplier = 0.8;
      break;
  }

  const minCount = Math.max(0, baseCount * (1 - variation) * trendMultiplier);
  const maxCount = baseCount * (1 + variation) * trendMultiplier;
  return Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function getTimeBasedWeight(hour) {
  if (hour < 6) return 0.3;
  if (hour < 9) return 0.8;
  if (hour < 18) return 1.0;
  if (hour < 22) return 0.9;
  return 0.4;
}

async function collectCoursePreferenceStatistics() {
  const now = new Date();
  const fileName = `statistics-admin-preference-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  try {
    const saveFolder = process.env.SAVEFOLDER ?? 'jsons';
    const filePath = join(__dirname, '..', saveFolder, fileName);

    let previousData = null;
    if (await fileExists(filePath)) {
      const existingContent = await readFile(filePath, 'utf8');
      const existingData = JSON.parse(existingContent);
      if (existingData.historical_data && existingData.historical_data.length > 0) {
        previousData = existingData.historical_data[existingData.historical_data.length - 1].data;
      }
    }

    const timeWeight = getTimeBasedWeight(now.getHours());

    const domainPreferences = Object.entries(COURSE_PREFERENCES).map(([key, domain]) => {
      const domainCourses = domain.courses.map(course => {
        const currentValue = generateRandomEnrollment(course.baseCount, course.trend) * timeWeight;

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

        const trend = calculateTrend(currentValue, previousValue);

        // color 정보 제외
        return {
          courseId: course.id,
          courseName: course.name,
          activeStudents: currentValue,
          trend: trend
        };
      });

      // domain color 정보 제외
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

function scheduleCollection() {
  collectCoursePreferenceStatistics();
  const FIFTEEN_SECONDS = 60 * 60 * 1000;
  setInterval(collectCoursePreferenceStatistics, FIFTEEN_SECONDS);
}

scheduleCollection();

export default collectCoursePreferenceStatistics;
