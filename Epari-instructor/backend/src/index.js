import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

// 기본 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = 3001;
const JSONS_DIR = join(__dirname, '../jsons');

// Express 앱 초기화
const app = express();

// 미들웨어 설정
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(compression());
app.use(express.json());

/**
 * 날짜 문자열의 유효성을 검증하는 함수
 */
const isValidDate = (dateString) => {
  if (!/^\d{8}$/.test(dateString)) return false;

  const year = parseInt(dateString.substring(0, 4));
  const month = parseInt(dateString.substring(4, 6)) - 1;
  const day = parseInt(dateString.substring(6, 8));

  const date = new Date(year, month, day);
  return date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day;
};

/**
 * 통계 데이터를 로드하는 공통 함수
 */
const loadStatisticsData = async (type, date) => {
  try {
    const filePath = join(JSONS_DIR, `statistics-instructor-${type}-${date}.json`);
    console.log(`Loading ${type} statistics:`, filePath);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
};

// 공통 미들웨어: 날짜 유효성 검사
const validateDate = (req, res, next) => {
  const { date } = req.params;
  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYYMMDD' });
  }
  next();
};

// API 라우트 설정
// 시험 통계
app.get('/api/v1/statistics/exam/:date', validateDate, async (req, res) => {
  const data = await loadStatisticsData('exam', req.params.date);
  if (!data) {
    return res.status(404).json({ error: 'Exam statistics data not found' });
  }
  res.json(data);
});

// 주차별 성적 통계
app.get('/api/v1/statistics/weekly-scores/:date', validateDate, async (req, res) => {
  const data = await loadStatisticsData('weekly-scores', req.params.date);
  if (!data) {
    return res.status(404).json({ error: 'Weekly scores statistics data not found' });
  }
  res.json(data);
});

// 과제 통계
app.get('/api/v1/statistics/assignment/:date', validateDate, async (req, res) => {
  const data = await loadStatisticsData('assignment', req.params.date);
  if (!data) {
    return res.status(404).json({ error: 'Assignment statistics data not found' });
  }
  res.json(data);
});

// 현재 과제 통계
app.get('/api/v1/statistics/current-assignment/:date', validateDate, async (req, res) => {
  const data = await loadStatisticsData('current-assignment', req.params.date);
  if (!data) {
    return res.status(404).json({ error: 'Current assignment statistics data not found' });
  }
  res.json(data);
});

// 학생 통계
app.get('/api/v1/statistics/students/:date', validateDate, async (req, res) => {
  const data = await loadStatisticsData('students', req.params.date);
  if (!data) {
    return res.status(404).json({ error: 'Student statistics data not found' });
  }
  res.json(data);
});

// 404 에러 핸들링
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
