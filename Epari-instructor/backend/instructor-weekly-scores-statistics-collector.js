import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 랜덤 주차별 성적 데이터 생성
 */
function generateWeeklyScores() {
  const weeks = 7;
  const weeklyScores = [];

  for (let i = 1; i <= weeks; i++) {
    // 75-95 사이의 랜덤 점수 생성
    const averageScore = (Math.random() * (95 - 75) + 75).toFixed(1);

    weeklyScores.push({
      week: `${i}주차`,
      averageScore: parseFloat(averageScore)
    });
  }

  return {
    weeklyScores
  };
}

/**
 * 현재 날짜로 파일명 생성하고 데이터 저장
 */
async function collectWeeklyScoreStatistics() {
  const now = new Date();
  const fileName = `statistics-instructor-weekly-scores-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  const stats = generateWeeklyScores();

  const scoreData = {
    statistics_list: []
  };

  // 새로운 통계 데이터
  const newStatistics = {
    timestamp: now.toISOString(),
    statistics: stats
  };

  try {
    const saveFolder = process.env.SAVEFOLDER || 'jsons';
    const filePath = join(__dirname, saveFolder, fileName);

    const existingData = await loadExistingData(filePath);
    if (existingData) {
      existingData.statistics_list.push(newStatistics);
      await writeFile(filePath, JSON.stringify(existingData, null, 2));
    } else {
      scoreData.statistics_list.push(newStatistics);
      await writeFile(filePath, JSON.stringify(scoreData, null, 2));
    }

    console.log(`통계가 성공적으로 저장되었습니다: ${filePath}`);
    console.log('주차별 평균 성적:');
    stats.weeklyScores.forEach(score => {
      console.log(`${score.week}: ${score.averageScore}점`);
    });
  } catch (error) {
    console.error('통계 저장 중 오류 발생:', error);
  }
}

async function loadExistingData(filePath) {
  try {
    if (existsSync(filePath)) {
      const fileContent = await readFile(filePath, 'utf8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('기존 데이터 로드 중 오류 발생:', error);
  }
  return null;
}

// 1시간마다 실행
const ONE_HOUR = 1000 * 60 * 60;
setInterval(collectWeeklyScoreStatistics, ONE_HOUR);

// 초기 실행
collectWeeklyScoreStatistics();
