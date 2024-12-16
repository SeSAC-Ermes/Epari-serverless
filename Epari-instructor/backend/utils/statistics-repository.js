import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import dotenv from 'dotenv';

dotenv.config();

class StatisticsRepository {
  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    this.docClient = DynamoDBDocumentClient.from(this.client);
    this.tableName = "instructor-statistics";
  }

  /**
   * 통계 데이터를 DynamoDB에 저장
   * @param {string} type - 통계 유형 (exam, assignment, current-assignment, weekly-scores, students)
   * @param {Object} data - 저장할 통계 데이터
   */
  async saveStatistics(type, data) {
    const timestamp = new Date().toISOString();
    const dateKey = timestamp.slice(0, 10).replace(/-/g, '');

    const item = {
      PK: `${type.toUpperCase()}#${dateKey}`,
      SK: `TIMESTAMP#${timestamp}`,
      statistics: data,
      createdAt: timestamp
    };

    console.log(item);

    try {
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));
      console.log(`Statistics saved successfully: ${type}`);
      return item;
    } catch (error) {
      console.error(`Error saving statistics: ${type}`, error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 최신 통계 데이터 조회
   * @param {string} type - 통계 유형
   * @param {string} date - 조회할 날짜 (YYYYMMDD 형식)
   */
  async getLatestStatistics(type, date) {
    try {
      const response = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `${type.toUpperCase()}#${date}`
        },
        ScanIndexForward: false, // 내림차순 정렬 (최신 데이터 먼저)
        Limit: 1
      }));

      return response.Items?.[0] || null;
    } catch (error) {
      console.error(`Error getting statistics: ${type}`, error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 모든 통계 데이터 조회
   * @param {string} type - 통계 유형
   * @param {string} date - 조회할 날짜 (YYYYMMDD 형식)
   */
  async getAllStatisticsByDate(type, date) {
    try {
      const response = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `${type.toUpperCase()}#${date}`
        },
        ScanIndexForward: true // 오름차순 정렬
      }));

      return response.Items || [];
    } catch (error) {
      console.error(`Error getting all statistics: ${type}`, error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 export
export const statisticsRepository = new StatisticsRepository();
