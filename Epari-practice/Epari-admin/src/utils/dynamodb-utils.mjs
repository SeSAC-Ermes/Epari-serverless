import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@aws-sdk/credential-provider-env";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: fromEnv()
});

const docClient = DynamoDBDocumentClient.from(client);

/**
 * DynamoDB에 데이터 저장
 */
export async function saveToDatabase(tableName, entityType, data) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timestamp = now.toISOString();

  const item = {
    PK: `${entityType}#${dateStr}`,
    SK: `TIMESTAMP#${timestamp}`,
    entityType,
    timestamp,
    data
  };

  try {
    await docClient.send(
        new PutCommand({
          TableName: tableName,
          Item: item
        })
    );
    return { success: true, id: item.PK };
  } catch (error) {
    console.error('DynamoDB 저장 중 에러 발생:', error);
    throw error;
  }
}

/**
 * 특정 날짜의 데이터 조회
 */
export async function getDataByDate(tableName, entityType, date) {
  try {
    const response = await docClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `${entityType}#${date}`
          },
          ScanIndexForward: false
        })
    );
    return response.Items;
  } catch (error) {
    console.error('DynamoDB 조회 중 에러 발생:', error);
    throw error;
  }
}

/**
 * 최신 데이터 조회
 */
export async function getLatestData(tableName, entityType) {
  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await docClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `${entityType}#${today}`
          },
          ScanIndexForward: false,
          Limit: 1
        })
    );
    return response.Items?.[0] || null;
  } catch (error) {
    console.error('DynamoDB 조회 중 에러 발생:', error);
    throw error;
  }
}
