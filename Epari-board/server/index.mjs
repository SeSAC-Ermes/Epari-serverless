import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import carbonRouter from './routes/carbon.mjs';
import postsRouter from './routes/posts.mjs';

// ES 모듈에서 __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일의 정확한 경로 지정
const envPath = join(__dirname, '../.env');
console.log('Loading .env from:', envPath);

// dotenv 설정을 먼저 로드
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Environment variables loaded successfully');
  // 환경 변수 로드 확인을 위한 로그
  console.log('Loaded AWS_REGION:', process.env.AWS_REGION);
  console.log('Loaded AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID?.slice(0, 5) + '...');
}

const app = express();
app.use(express.json());

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use('/api/carbon', carbonRouter);
app.use('/api/posts', postsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 