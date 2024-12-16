import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import { readJsonFromS3 } from "./src/utils/s3-reader.mjs";

dotenv.config();
const app = express();

// 미들웨어 설정
app.use(cors());  // CORS 활성화
app.use(express.json());  // JSON 파싱
app.use(express.static('public'));  // 정적 파일 제공

// 1. 각 과정별 수강생 현황
app.get('/api/admin/courses-students', async (req, res) => {
  try {
    const data = await readJsonFromS3('courses-students', process.env.AWS_BUCKET_NAME);
    res.json({
      timestamp: data.timestamp,
      course_statistics: {
        total_enrollment: data.course_statistics.total_enrollment,
        course_enrollments: data.course_statistics.course_enrollments
      }
    });
  } catch (error) {
    console.log('Full error:', {
      message: error.message,
      code: error.Code,
      key: error.Key,
      requestId: error.RequestId
    });
    res.status(500).json({ error: error.message });
  }
});

// 2. 운영중인 과정 현황
app.get('/api/admin/courses-active', async (req, res) => {
  try {
    const data = await readJsonFromS3('courses-active', process.env.AWS_BUCKET_NAME);
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
    const data = await readJsonFromS3('visitors-hourly', process.env.AWS_BUCKET_NAME);
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
    const data = await readJsonFromS3('pages-ranking', process.env.AWS_BUCKET_NAME);
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
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const data = await readJsonFromS3(`courses-employment-retention`, process.env.AWS_BUCKET_NAME)

    res.json({
      timestamp: data.timestamp,
      current_month: data.current_month,
      historical_data: data.historical_data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. 강의 분야별 선호도
app.get('/api/admin/courses-preference', async (req, res) => {
  try {
    const data = await readJsonFromS3('courses-preference', process.env.AWS_BUCKET_NAME);
    res.json(data);
  } catch (error) {
    console.error('Error details:', error);
    res.status(500).json({ error: '선호도 데이터를 불러올 수 없습니다.' });
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


export default app;
