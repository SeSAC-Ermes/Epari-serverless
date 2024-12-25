import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDB } from "../../lib/dynamodb.js";

export const handler = async (event) => {
  try {
    const command = new ScanCommand({
      TableName: process.env.POSTS_TABLE,
      FilterExpression: "begins_with(PK, :pk)",
      ExpressionAttributeValues: {
        ":pk": "POST#"
      }
    });

    const { Items } = await dynamoDB.send(command);

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
    console.error('Error in getPosts:', error);
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
