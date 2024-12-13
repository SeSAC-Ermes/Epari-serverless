import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// 환경변수 로딩
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../.env') });

// 환경변수 확인
console.log('Checking environment variables:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
console.log('AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
console.log('AWS_SECRET_ACCESS_KEY exists:', !!process.env.AWS_SECRET_ACCESS_KEY);

// S3 클라이언트 초기화
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export async function loadStatisticsFromS3(type, date) {
  try {
    const fileName = `statistics-instructor-${type}-${date}.json`;
    console.log('Attempting to load file:', fileName);
    console.log('Using bucket:', process.env.AWS_S3_BUCKET);

    if (!process.env.AWS_S3_BUCKET) {
      throw new Error('AWS_S3_BUCKET environment variable is not set');
    }

    const response = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName
    }));

    const data = await response.Body.transformToString();
    return JSON.parse(data);
  } catch (error) {
    console.error('S3 Error:', error);
    throw error;
  }
}
