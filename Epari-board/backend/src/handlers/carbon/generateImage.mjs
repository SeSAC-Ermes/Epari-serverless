import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION
});

export const handler = async (event) => {
  try {
    const { code } = JSON.parse(event.body);
    if (!code) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Code is required' })
      };
    }

    // Carbon API에 코드 전송하여 이미지 생성
    const carbonResponse = await fetch('https://carbonara.solopov.dev/api/cook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        backgroundColor: "#1F2937",
        theme: "one-dark",
        language: "auto",
        fontFamily: "Hack",
        fontSize: "14px",
        lineNumbers: true,
        dropShadow: true,
        width: 680
      })
    });

    if (!carbonResponse.ok) {
      throw new Error('Failed to generate carbon image');
    }

    // Carbon API로부터 이미지 데이터 받기
    const imageBuffer = await carbonResponse.arrayBuffer();

    // S3에 이미지 업로드
    const fileName = `carbon/${uuidv4()}.png`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: fileName,
      Body: Buffer.from(imageBuffer),
      ContentType: 'image/png'
    }));

    // S3 URL 생성
    const imageUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ url: imageUrl })
    };
  } catch (error) {
    console.error('Error generating carbon image:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to generate carbon image' })
    };
  }
};
