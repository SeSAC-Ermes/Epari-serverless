import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

// 기본 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = 3001;
const JSONS_DIR = join(__dirname, 'jsons');

/**
 * CORS 헤더를 설정하는 함수
 * 크로스 오리진 요청을 허용하기 위한 설정
 */
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

/**
 * JSON 형식의 응답을 보내는 유틸리티 함수
 */
const sendJsonResponse = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

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
 * 특정 날짜의 통계 데이터를 로드하는 함수
 */
const loadStatisticsData = async (date) => {
  try {
    const filePath = join(JSONS_DIR, `statistics-instructor-exam-${date}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
};

/**
 * HTTP 서버 인스턴스 생성 및 요청 처리
 */
const server = http.createServer(async (req, res) => {
  // CORS 사전 요청(preflight) 처리
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API 엔드포인트 라우팅
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // 통계 데이터 조회 API 처리
  if (req.method === 'GET' &&
      pathParts[0] === 'api' &&
      pathParts[1] === 'v1' &&
      pathParts[2] === 'statistics' &&
      pathParts[3] === 'exam' &&
      pathParts[4]) {

    const date = pathParts[4];

    if (!isValidDate(date)) {
      sendJsonResponse(res, 400, { error: 'Invalid date format. Use YYYYMMDD' });
      return;
    }

    const data = await loadStatisticsData(date);
    if (!data) {
      sendJsonResponse(res, 404, { error: 'Statistics data not found' });
      return;
    }

    sendJsonResponse(res, 200, data);
    return;
  }

  sendJsonResponse(res, 404, { error: 'Not Found' });
});

// 서버 시작
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
