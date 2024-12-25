import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import Sharp from 'sharp';

const s3Client = new S3Client({
  region: process.env.AWS_REGION
});

export const handler = async (event) => {
  try {
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key);

    // Skip if not an image or already processed
    if (!key.match(/\.(jpg|jpeg|png|gif)$/i) || key.includes('processed-')) {
      return;
    }

    // Get the image from S3
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const { Body: imageStream } = await s3Client.send(getCommand);
    const imageBuffer = await streamToBuffer(imageStream);

    // Process image with Sharp
    const processedImage = await Sharp(imageBuffer)
        .resize(800, 800, { // Resize to max dimensions
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ // Convert to JPEG and compress
          quality: 80,
          progressive: true
        })
        .toBuffer();

    // Upload processed image back to S3
    const processedKey = `processed-${key}`;
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: processedKey,
      Body: processedImage,
      ContentType: 'image/jpeg'
    });

    await s3Client.send(putCommand);

    console.log(`Successfully processed ${key} to ${processedKey}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image processed successfully',
        processedKey
      })
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

// Helper function to convert stream to buffer
const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};
