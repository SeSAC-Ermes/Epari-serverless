import { writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { uploadJsonToS3 } from '../utils/s3-uploader.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOTAL_USERS = 100; // 총 사용자 수 상수 설정

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

// 이전 시간대의 데이터 생성
function generateHistoricalData(startHour, currentHour) {
  const historicalData = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0,0,0,0);
  const endDate = new Date(now);
  endDate.setHours(23,59,59,999);

  for (let hour = startHour; hour <= currentHour; hour++) {
    const timePoint = new Date(now);
    timePoint.setHours(hour, 0, 0, 0);

    // 시간대별 방문자 수 패턴 설정
    let visitRate;
    if (hour < 6) { // 새벽 시간
      visitRate = 0.1 + (Math.random() * 0.1); // 10-20%
    } else if (hour < 9) { // 아침 시간
      visitRate = 0.3 + (Math.random() * 0.2); // 30-50%
    } else if (hour < 18) { // 업무 시간
      visitRate = 0.7 + (Math.random() * 0.3); // 70-100%
    } else { // 저녁 시간
      visitRate = 0.4 + (Math.random() * 0.2); // 40-60%
    }

    const totalVisitors = Math.floor(TOTAL_USERS * visitRate);
    const currentVisitors = Math.floor(totalVisitors * 0.8); // 현재 접속자는 총 방문자의 약 80%

    historicalData.push({
      timestamp: {
        created_at: timePoint.toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      },
      data: {
        hour: hour,
        total_visitors: totalVisitors,
        current_visitors: currentVisitors
      }
    });
  }

  return historicalData;
}

async function collectVisitorStatistics() {
  const now = new Date();
  const fileName = `statistics-admin-visitors-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;
  const currentHour = now.getHours();

  try {
    const saveFolder = process.env.SAVEFOLDER ?? 'jsons';
    const filePath = join(__dirname, '..', saveFolder, fileName);

    let existingData = await loadExistingData(filePath);

    if (!existingData) {
      // 파일이 없을 경우 0시부터 현재 시간까지의 데이터 생성
      const historicalData = generateHistoricalData(0, currentHour);
      const lastData = historicalData[historicalData.length - 1].data;

      const currentStats = {
        timestamp: now.toISOString(),
        visitor_statistics: {
          current_hour: currentHour,
          total_visitors: lastData.total_visitors,
          current_visitors: lastData.current_visitors,
          total_users: TOTAL_USERS,
          time_series: {
            hour: currentHour,
            total_count: lastData.total_visitors,
            current_count: lastData.current_visitors
          }
        },
        historical_data: historicalData
      };

      await writeFile(filePath, JSON.stringify(currentStats, null, 2));
      console.log(`새로운 방문자 통계 파일이 생성되었습니다: ${filePath}`);
    } else {
      // 기존 파일이 있는 경우, 현재 시간대에 맞는 새로운 데이터 생성
      let visitRate;
      if (currentHour < 6) {
        visitRate = 0.1 + (Math.random() * 0.1);
      } else if (currentHour < 9) {
        visitRate = 0.3 + (Math.random() * 0.2);
      } else if (currentHour < 18) {
        visitRate = 0.7 + (Math.random() * 0.3);
      } else {
        visitRate = 0.4 + (Math.random() * 0.2);
      }

      const totalVisitors = Math.floor(TOTAL_USERS * visitRate);
      const currentVisitors = Math.floor(totalVisitors * 0.8);

      const newDataPoint = {
        timestamp: {
          created_at: now.toISOString(),
          period: {
            start: new Date(now.setHours(0,0,0,0)).toISOString(),
            end: new Date(now.setHours(23,59,59,999)).toISOString()
          }
        },
        data: {
          hour: currentHour,
          total_visitors: totalVisitors,
          current_visitors: currentVisitors
        }
      };

      existingData.historical_data.push(newDataPoint);
      existingData.timestamp = now.toISOString();
      existingData.visitor_statistics = {
        current_hour: currentHour,
        total_visitors: totalVisitors,
        current_visitors: currentVisitors,
        total_users: TOTAL_USERS,
        time_series: {
          hour: currentHour,
          total_count: totalVisitors,
          current_count: currentVisitors
        }
      };

      await writeFile(filePath, JSON.stringify(existingData, null, 2));
      console.log(`방문자 통계가 업데이트되었습니다: ${filePath}`);
    }

    const uploadResult = await uploadJsonToS3(
        existingData || currentStats,
        'http://localhost:3000/api/admin/visitors-hourly',
        process.env.AWS_BUCKET_NAME
    );

    if (uploadResult.success) {
      console.log('방문자 통계가 S3에 업로드되었습니다:', uploadResult.path);
    }
  } catch (error) {
    console.error('방문자 통계 저장 중 오류 발생:', error);
  }
}

// 5분마다 데이터 수집
const FIVE_MINUTES = 60 * 60 * 1000;
setInterval(collectVisitorStatistics, FIVE_MINUTES);

await collectVisitorStatistics();

export default collectVisitorStatistics;
