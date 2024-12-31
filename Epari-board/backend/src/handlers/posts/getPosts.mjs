import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";

// 전체 조회
export const handler = async (event) => {
  try {
    const { category } = event.queryStringParameters || {};

    let filterExpression = "begins_with(PK, :pk)";
    let expressionAttributeValues = {
      ":pk": "POST#"
    };

    if (category && category !== 'ALL') {
      if (category === 'MY') {
        filterExpression += " AND GSI1PK = :userId";
        expressionAttributeValues[":userId"] = "USER#user123";
      } else {
        filterExpression += " AND category = :category";
        expressionAttributeValues[":category"] = category;
      }
    }

    const command = new ScanCommand({
      TableName: process.env.POSTS_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues
    });

    const { Items } = await dynamodb.send(command);

    const posts = Items
        .map(post => ({
          ...post,
          id: post.PK.split('#')[1],
          metadata: {
            ...post.metadata,
            views: parseInt(post.metadata?.views || 0),
            likes: parseInt(post.metadata?.likes || 0),
            commentsCount: parseInt(post.metadata?.commentsCount || 0)
          }
        }))
        .sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(posts)
    };
  } catch (error) {
    console.error('Error in getPost:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch posts' })
    };
  }
};
