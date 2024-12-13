import { uploadToS3 } from './utils/s3-uploader.js';
import { loadStatisticsFromS3 } from './utils/s3-loader.js';
import dotenv from 'dotenv';

dotenv.config();

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
 * 주차별 성적 통계 데이터를 생성하고 S3에 저장하는 함수
 */
async function collectWeeklyScoreStatistics() {
  const now = new Date();
  const fileName = `statistics-instructor-weekly-scores-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

  const stats = generateWeeklyScores();

  const scoreData = {
    statistics_list: []
  };

  const newStatistics = {
    timestamp: now.toISOString(),
    statistics: stats
  };

  try {
    // 기존 데이터 로드
    const existingData = await loadStatisticsFromS3('weekly-scores', now.toISOString().slice(0, 10).replace(/-/g, ''));

    let dataToSave;
    if (existingData) {
      existingData.statistics_list.push(newStatistics);
      dataToSave = existingData;
    } else {
      scoreData.statistics_list.push(newStatistics);
      dataToSave = scoreData;
    }

    // S3에 저장
    await uploadToS3('weekly-scores', fileName, dataToSave);

    console.log(`통계가 성공적으로 저장되었습니다: weekly-scores/${fileName}`);
    console.log('주차별 평균 성적:');
    stats.weeklyScores.forEach(score => {
      console.log(`${score.week}: ${score.averageScore}점`);
    });
  } catch (error) {
    console.error('통계 저장 중 오류 발생:', error);
  }
}

// 1시간마다 실행
const ONE_HOUR = 1000 * 60 * 60;
setInterval(collectWeeklyScoreStatistics, ONE_HOUR);

// 초기 실행
collectWeeklyScoreStatistics();
