import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-provider-env";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: fromEnv()
});

/**
 * S3에서 JSON 파일을 읽어오는 함수
 * @param {string} endpoint - API 엔드포인트 (예: 'http://localhost:3000/api/admin/courses-preference')
 * @param {string} bucketName - S3 버킷 이름
 * @returns {Promise<Object>} JSON 데이터
 */
export async function readJsonFromS3(identifier, bucketName) {
  try {
    const now = new Date();
    const fileName = `statistics-${identifier}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

    const s3Key = `${identifier}/${fileName}`;

    console.log('Attempting to read from S3:', {
      bucket: bucketName,
      key: s3Key,
      fullPath: `s3://${bucketName}/${s3Key}`
    });

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    });

    const response = await s3Client.send(command);
    const data = await response.Body.transformToString();

    return JSON.parse(data);
  } catch (error) {
    console.error('S3 Read Error:', {
      error: error.message,
      code: error.Code,
      key: error.Key,
      bucket: bucketName
    });
    throw error;
  }
}
