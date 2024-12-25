import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDB } from "../../lib/dynamodb.js";

export const handler = async (event) => {
  const { postId } = event.pathParameters;

  try {
    // 성능 최적화를 위한 정규화된 postId
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');

    const command = new QueryCommand({
      TableName: process.env.POSTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${normalizedPostId}`
      },
      // 필요한 속성만 가져와 RCU 최적화
      ProjectionExpression: "comments, metadata.commentsCount",
      ConsistentRead: false // 최신 데이터가 필수가 아닌 경우 eventually consistent read 사용
    });

    const { Items } = await dynamoDB.send(command);

    if (!Items || Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300' // 캐시 전략 적용
        },
        body: JSON.stringify({ error: 'Post not found' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60' // 댓글은 빈번히 변경될 수 있으므로 짧은 캐시 시간
      },
      body: JSON.stringify({
        comments: Items[0].comments || [],
        total: Items[0].metadata?.commentsCount || 0
      })
    };
  } catch (error) {
    console.error('Error in getComments:', {
      error,
      postId,
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store' // 에러는 캐시하지 않음
      },
      body: JSON.stringify({ error: 'Failed to fetch comments' })
    };
  }
};
