import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  try {
    // 모든 게시글 조회
    const command = new ScanCommand({
      TableName: process.env.POSTS_TABLE,
      FilterExpression: "begins_with(PK, :pk)",
      ExpressionAttributeValues: {
        ":pk": "POST#"
      }
    });

    const { Items } = await dynamodb.send(command);

    // 태그 집계
    const tagCounts = {};
    Items.forEach(post => {
      (post.tags || []).forEach(tag => {
        if (tag && tag !== '#') {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      });
    });

    // 태그를 사용 횟수로 정렬하고 상위 5개 선택
    const popularTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag, count]) => ({
          tag,
          count
        }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300' // 5분 캐시
      },
      body: JSON.stringify(popularTags)
    };
  } catch (error) {
    console.error('Error in getPopularTags:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch popular tags' })
    };
  }
};
