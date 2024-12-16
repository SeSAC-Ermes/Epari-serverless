import { writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { uploadJsonToS3 } from '../utils/s3-uploader.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 학생용 페이지 목록
const studentPages = [
  { path: '/dashboard', name: '대시보드' },
  { path: '/my-courses', name: '내 강의실' },
  { path: '/assignments', name: '과제 관리' },
  { path: '/materials', name: '학습자료' },
  { path: '/schedule', name: '수업 일정' },
  { path: '/notices', name: '공지사항' },
  { path: '/qna', name: 'Q&A' },
  { path: '/attendance', name: '출결 관리' },
  { path: '/grades', name: '성적 관리' },
  { path: '/profile', name: '내 정보' }
];

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

async function generateStudentPageVisitData() {
  const now = new Date();
  const currentHour = now.getHours();

  // 시간대별 트래픽 패턴 설정
  let trafficMultiplier;
  if (currentHour < 6) {
    trafficMultiplier = 0.3; // 새벽
  } else if (currentHour < 9) {
    trafficMultiplier = 0.8; // 아침
  } else if (currentHour < 18) {
    trafficMultiplier = 1.0; // 수업시간
  } else if (currentHour < 22) {
    trafficMultiplier = 0.9; // 저녁
  } else {
    trafficMultiplier = 0.4; // 밤
  }

  return studentPages.map(page => ({
    path: page.path,
    page_name: page.name,
    visits: Math.floor(Math.random() * 100 * trafficMultiplier) + 20,
    unique_visitors: Math.floor(Math.random() * 50 * trafficMultiplier) + 10,
    avg_duration_minutes: Math.floor(Math.random() * 20) + 5 // 5-25분
  }));
}

async function collectStudentPageStatistics() {
  const now = new Date();
  const fileName = `statistics-student-pages-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  try {
    const saveFolder = process.env.SAVEFOLDER ?? 'jsons';
    const filePath = join(__dirname, '..', saveFolder, fileName);

    const pageData = await generateStudentPageVisitData();
    const sortedPages = pageData.sort((a, b) => b.visits - a.visits);

    const startDate = new Date(now);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(now);
    endDate.setHours(23,59,59,999);

    const newDataPoint = {
      timestamp: {
        created_at: now.toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      },
      data: {
        total_pageviews: sortedPages.reduce((sum, page) => sum + page.visits, 0),
        total_unique_visitors: sortedPages.reduce((sum, page) => sum + page.unique_visitors, 0),
        pages: sortedPages
      }
    };

    const existingData = await loadExistingData(filePath);

    if (existingData) {
      // 기존 데이터가 있으면 historical_data에 새로운 데이터 추가
      if (!existingData.historical_data) {
        existingData.historical_data = [];
      }
      existingData.historical_data.push(newDataPoint);
      existingData.timestamp = now.toISOString();
      existingData.page_statistics = newDataPoint.data;

      await writeFile(filePath, JSON.stringify(existingData, null, 2));
    } else {
      // 새 파일 생성
      const currentStats = {
        timestamp: now.toISOString(),
        page_statistics: newDataPoint.data,
        historical_data: [newDataPoint]
      };

      await writeFile(filePath, JSON.stringify(currentStats, null, 2));
    }

    console.log(`학생 페이지 통계가 저장되었습니다: ${filePath}`);

    const uploadResult = await uploadJsonToS3(
        existingData || currentStats,
        'http://localhost:3000/api/admin/pages-ranking',
        process.env.AWS_BUCKET_NAME
    );

    if (uploadResult.success) {
      console.log('학생 페이지 통계가 S3에 업로드되었습니다:', uploadResult.path);
    }
  } catch (error) {
    console.error('학생 페이지 통계 처리 중 오류 발생:', error);
  }
}

// 1시간마다 데이터 수집
const ONE_HOUR = 60 * 60 * 1000;
setInterval(collectStudentPageStatistics, ONE_HOUR);

await collectStudentPageStatistics();

export default collectStudentPageStatistics;
