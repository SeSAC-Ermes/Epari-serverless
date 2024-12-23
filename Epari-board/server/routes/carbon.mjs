import express from 'express';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

// S3 클라이언트 생성 함수
const createS3Client = () => {
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });
};

router.post('/generate', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const tempDir = join(dirname(fileURLToPath(import.meta.url)), '../temp');
  const codeFileName = `${uuidv4()}.txt`;
  const s3Client = createS3Client();
  
  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(join(tempDir, codeFileName), code);

    // Carbon CLI로 이미지 생성
    await new Promise((resolve, reject) => {
      exec(
        `carbon-now "${codeFileName}" -l auto --theme one-light --no-window-controls --padding-vertical 0 --padding-horizontal 0`,
        { cwd: tempDir },
        (error, stdout, stderr) => {
          if (error) {
            console.error('Carbon CLI error:', error);
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });

    // 생성된 PNG 파일 찾기
    const files = await fs.readdir(tempDir);
    const pngFiles = files.filter(f => f.endsWith('.png'));
    
    if (pngFiles.length === 0) {
      throw new Error('No PNG files found');
    }

    const latestFile = pngFiles[pngFiles.length - 1];
    const pngPath = join(tempDir, latestFile);
    
    // PNG 파일을 S3에 업로드
    const fileContent = await fs.readFile(pngPath);
    const s3FileName = `carbon/${uuidv4()}.png`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.VITE_AWS_BUCKET_NAME,
      Key: s3FileName,
      Body: fileContent,
      ContentType: 'image/png'
    }));

    // S3 URL 생성
    const imageUrl = `https://${process.env.VITE_AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3FileName}`;

    // 임시 파일 정리
    await fs.unlink(join(tempDir, codeFileName));
    await fs.unlink(pngPath);

    res.json({ url: imageUrl });
  } catch (error) {
    console.error('Failed to generate carbon image:', error);
    res.status(500).json({ error: 'Failed to generate carbon image' });
  }
});

export default router; 