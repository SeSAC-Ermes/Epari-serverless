import express from 'express';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// S3 클라이언트를 함수로 만들어서 필요할 때 생성
const createS3Client = () => {
  console.log('Creating S3 client with:', {
    region: process.env.VITE_AWS_REGION,
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID?.slice(0, 5) + '...',
    bucketName: process.env.VITE_AWS_BUCKET_NAME
  });

  return new S3Client({
    region: process.env.VITE_AWS_REGION,
    credentials: {
      accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY
    },
    forcePathStyle: true,
    signatureVersion: 'v4'
  });
};

router.post('/generate', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  // 임시 코드 파일과 출력 파일 경로
  const tempDir = join(__dirname, '../temp');
  const codeFileName = `${uuidv4()}.txt`;
  
  try {
    // temp 디렉토리 생성
    await fs.mkdir(tempDir, { recursive: true });
    
    // 코드를 임시 파일로 저장
    await fs.writeFile(join(tempDir, codeFileName), code);

    // carbon-now-cli 실행 후 이미지 처리
    let generatedFilePath;
    await new Promise((resolve, reject) => {
      exec(
        `carbon-now "${codeFileName}" -l auto --theme one-light --no-window-controls --padding-vertical 0 --padding-horizontal 0`, 
        {
          cwd: tempDir,
          input: code
        },
        async (error, stdout, stderr) => {
          if (error) {
            console.error('Carbon CLI error:', error);
            console.error('stderr:', stderr);
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
      throw new Error('No PNG files found in temp directory');
    }

    const fileStats = await Promise.all(
      pngFiles.map(async (file) => ({
        name: file,
        stat: await fs.stat(join(tempDir, file))
      }))
    );

    const latestFile = fileStats.sort((a, b) => b.stat.mtime - a.stat.mtime)[0].name;

    // URL 형태로 반환
    const imageUrl = `http://localhost:3000/api/carbon/image/${latestFile}`;
    res.json({ url: imageUrl });
  } catch (error) {
    console.error('Failed to generate carbon image:', error);
    // 임시 파일들 정리
    await fs.unlink(join(tempDir, codeFileName)).catch(() => {});
    res.status(500).json({ 
      error: 'Failed to generate carbon image',
      details: error.message 
    });
  }
});

// 새로운 엔드포인트 추가: 최종 저장 시 S3에 업로드
router.post('/upload', async (req, res) => {
  const { paths } = req.body;  // 임시 파일 경로들의 배열
  
  try {
    const s3Client = createS3Client();
    const uploadResults = await Promise.all(
      paths.map(async (path) => {
        const fileContent = await fs.readFile(path);
        const fileName = path.split('/').pop();
        const s3FileName = `carbon/${fileName}`;
        
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.VITE_AWS_BUCKET_NAME,
          Key: s3FileName,
          Body: fileContent,
          ContentType: 'image/png'
        }));

        // 임시 파일 삭제
        await fs.unlink(path).catch(() => {});

        return `https://${process.env.VITE_AWS_BUCKET_NAME}.s3.${process.env.VITE_AWS_REGION}.amazonaws.com/${s3FileName}`;
      })
    );

    res.json({ urls: uploadResults });
  } catch (error) {
    console.error('Failed to upload images:', error);
    res.status(500).json({ 
      error: 'Failed to upload images',
      details: error.message 
    });
  }
});

// 이미지 파일을 직접 제공하는 라우트 추가
router.get('/image/:filename', async (req, res) => {
  const { filename } = req.params;
  const imagePath = join(__dirname, '../temp', filename);
  
  try {
    // 파일이 존재하는지 확인
    await fs.access(imagePath);
    
    // 이미지 파일 읽기
    const imageBuffer = await fs.readFile(imagePath);
    
    // 이미지 파일 전송
    res.setHeader('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error) {
    console.error('Failed to serve image:', error);
    res.status(404).json({ error: 'Image not found' });
  }
});

export default router; 