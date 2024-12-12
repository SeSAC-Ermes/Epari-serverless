import app from './express.mjs';
import dotenv from 'dotenv';

// 환경변수 설정
dotenv.config();

// 포트 설정 (환경변수에 없으면 3000 사용)
const PORT = process.env.PORT || 3000;

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
