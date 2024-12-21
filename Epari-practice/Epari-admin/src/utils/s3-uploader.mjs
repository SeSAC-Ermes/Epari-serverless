import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-provider-env";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: fromEnv()
});

/**
 * JSON 데이터를 S3에 업로드하는 함수
 * @param {Object} data - 업로드할 JSON 데이터
 * @param {string} endpoint - API 엔드포인트 (예: 'http://localhost:3000/api/admin/courses-preference')
 * @param {string} bucketName - S3 버킷 이름
 * @returns {Promise<Object>} 업로드 결과
 */
export async function uploadJsonToS3(data, endpoint, bucketName) {
  try {

    console.log('AWS Credentials:', {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ? '***' : 'missing',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? '***' : 'missing'
    });

    // API 엔드포인트에서 폴더명 추출 (예: 'courses-preference')
    const folderName = endpoint.split('/').pop();

    // 현재 날짜로 파일명 생성
    const now = new Date();
    const fileName = `statistics-${folderName}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

    // S3 키(경로) 생성 (예: 'courses-preference/statistics-courses-preference-20240314.json')
    const s3Key = `${folderName}/${fileName}`;

    // JSON 데이터를 문자열로 변환
    const jsonString = JSON.stringify(data, null, 2);

    // S3 업로드 파라미터
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: jsonString,
      ContentType: 'application/json'
    };

    // S3에 업로드
    const command = new PutObjectCommand(uploadParams);
    const response = await s3Client.send(command);

    console.log(`파일이 성공적으로 업로드되었습니다: ${s3Key}`);
    return {
      success: true,
      path: s3Key,
      response: response
    };

  } catch (error) {
    console.error('S3 업로드 중 에러 발생:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
