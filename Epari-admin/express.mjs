import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// ES 모듈에서 __dirname 사용하기 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// 미들웨어 설정
app.use(cors());  // CORS 활성화
app.use(express.json());  // JSON 파싱
app.use(express.static('public'));  // 정적 파일 제공

// 유틸리티 함수: JSON 파일 읽기
async function readJsonFile(fileName) {
  try {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const filePath = join(__dirname, 'src', 'jsons', `${fileName}-${formattedDate}.json`);

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Error reading file: ${error.message}`);
  }
}

// API 엔드포인트

// 1. 각 과정별 수강생 현황
app.get('/api/admin/courses-students', async (req, res) => {
  try {
    const data = await readJsonFile('statistics-admin-courses');
    res.json({
      timestamp: data.timestamp,
      course_statistics: {
        total_enrollment: data.course_statistics.total_enrollment,
        course_enrollments: data.course_statistics.course_enrollments
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. 운영중인 과정 현황
app.get('/api/admin/courses-active', async (req, res) => {
  try {
    const data = await readJsonFile('statistics-admin-facility');
    res.json({
      timestamp: data.timestamp,
      course_statistics: {
        course_enrollments: data.course_statistics.course_enrollments.map(course => ({
          course_id: course.course_id,
          course_name: course.course_name,
          instructor: course.instructor,
          period: course.period,
          room: course.room,
          current_students: course.current_students
        })),
        facility_status: data.course_statistics.facility_status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. 시간별 방문자 현황
app.get('/api/admin/visitors-hourly', async (req, res) => {
  try {
    const data = await readJsonFile('statistics-admin-visitors');
    res.json({
      timestamp: data.timestamp,
      visitor_statistics: data.visitor_statistics,
      historical_data: data.historical_data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. 페이지별 방문 순위
app.get('/api/admin/pages-ranking', async (req, res) => {
  try {
    const data = await readJsonFile('statistics-student-pages');
    res.json({
      timestamp: data.timestamp,
      page_statistics: data.page_statistics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. 과정별 취업률 및 이탈률 현황
app.get('/api/admin/courses-employment-retention', async (req, res) => {
  try {
    const now = new Date();
    const formattedMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const filePath = join(__dirname, 'src', 'jsons', `statistics-course-performance-${formattedMonth}.json`);

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const data = await readFile(filePath, 'utf8');
    const parsedData = JSON.parse(data);

    res.json({
      timestamp: parsedData.timestamp,
      current_month: parsedData.current_month,
      historical_data: parsedData.historical_data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});


// 6. 강의 분야별 선호도
app.get('/api/admin/courses-preference', async (req, res) => {
  try {
    const currentDate = new Date();
    const fileName = `statistics-admin-preference-${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}.json`;
    const filePath = join(__dirname,'src', 'jsons', fileName);

    // 정확한 파일 경로 출력
    console.log('Current directory:', __dirname);
    console.log('Attempting to read file at:', filePath);
    console.log('File exists?', existsSync(filePath));

    const data = await readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error details:', error);
    res.status(500).json({ error: '선호도 데이터를 불러올 수 없습니다.' });
  }
});


export default app;
