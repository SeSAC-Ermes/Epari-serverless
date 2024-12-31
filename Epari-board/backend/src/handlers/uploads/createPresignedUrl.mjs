import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION
});

export const handler = async (event) => {
  try {
    const { fileType, contentType, source } = JSON.parse(event.body);
    const fileId = uuidv4();

    // source가 'drawing'인 경우 drawings/ 폴더에, 그 외의 경우 uploads/ 폴더에 저장
    const folderPath = source === 'drawing' ? 'drawings/' : 'images/';
    const key = `${folderPath}${fileId}${fileType}`;

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      ContentType: contentType
    });

    console.log('presigned URL 생성 요청:', event.body);
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600 // URL expires in 1 hour
    });
    console.log('presigned URL 생성 완료:', signedUrl);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        uploadUrl: signedUrl,
        key: key
      })
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to generate upload URL' })
    };
  }
};
