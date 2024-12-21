import { statisticsRepository } from './utils/statistics-repository.js';
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
 * 주차별 성적 통계 데이터를 생성하고 DynamoDB에 저장하는 함수
 */
async function collectWeeklyScoreStatistics() {
  try {
    const stats = generateWeeklyScores();

    // DynamoDB에 통계 저장
    await statisticsRepository.saveStatistics('weekly-scores', stats);

    console.log(`주차별 성적 통계가 저장되었습니다`);
    console.log('주차별 평균 성적:');
    stats.weeklyScores.forEach(score => {
      console.log(`${score.week}: ${score.averageScore}점`);
    });
  } catch (error) {
    console.error('주차별 성적 통계 저장 중 오류 발생:', error);
  }
}

// 1시간마다 실행
const ONE_HOUR = 1000 * 60 * 60;
setInterval(collectWeeklyScoreStatistics, ONE_HOUR);

// 초기 실행
collectWeeklyScoreStatistics();
