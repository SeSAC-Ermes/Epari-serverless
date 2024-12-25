import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION
});

export const handler = async (event) => {
  try {
    const { contentType } = JSON.parse(event.body);
    const fileName = `uploads/${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: fileName,
      ContentType: contentType
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600 // URL expires in 1 hour
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        uploadUrl: signedUrl,
        key: fileName
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
