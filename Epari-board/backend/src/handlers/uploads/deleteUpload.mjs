import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION
});

export const handler = async (event) => {
  try {
    const { key } = event.pathParameters;

    const command = new DeleteObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: decodeURIComponent(key)
    });

    await s3Client.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'File deleted successfully' })
    };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to delete file' })
    };
  }
};
