import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  try {
    const command = new ScanCommand({
      TableName: process.env.POSTS_TABLE,
      FilterExpression: "begins_with(PK, :pk)",
      ExpressionAttributeValues: {
        ":pk": "POST#"
      }
    });

    const { Items } = await dynamodb.send(command);

    // 최근 7일 이내의 게시글만 필터링
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPosts = Items.filter(post =>
        new Date(post.metadata.createdAt) > sevenDaysAgo
    );

    // 조회수로 정렬하고 상위 5개 선택
    const trendingPosts = recentPosts
        .sort((a, b) => (b.metadata?.views || 0) - (a.metadata?.views || 0))
        .slice(0, 5)
        .map(post => ({
          id: post.PK.split('#')[1],
          title: post.title,
          views: post.metadata?.views || 0
        }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300' // 5분 캐시
      },
      body: JSON.stringify(trendingPosts)
    };
  } catch (error) {
    console.error('Error in getTrendingPosts:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch trending posts' })
    };
  }
};
