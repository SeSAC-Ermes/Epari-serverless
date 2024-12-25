import { DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { dynamoDB } from "../../lib/dynamodb.js";
import { s3 } from "../../lib/s3.js";

export const handler = async (event) => {
  try {
    const postId = event.pathParameters.postId;
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');

    const getCommand = new QueryCommand({
      TableName: process.env.POSTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${normalizedPostId}`
      }
    });

    const { Items } = await dynamoDB.send(getCommand);

    if (!Items || Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Post not found' })
      };
    }

    const post = Items[0];

    // 이미지 URL 추출 및 삭제
    const imageUrls = extractImageUrls(post.content);
    for (const url of imageUrls) {
      try {
        const key = url.split('.com/')[1];
        if (key) {
          await s3.send(new DeleteObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: key
          }));
        }
      } catch (error) {
        console.warn('Failed to delete image:', url, error);
      }
    }

    await dynamoDB.send(new DeleteCommand({
      TableName: process.env.POSTS_TABLE,
      Key: {
        PK: post.PK,
        SK: post.SK
      }
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'Post deleted successfully' })
    };
  } catch (error) {
    console.error('Error in deletePost:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to delete post' })
    };
  }
};

function extractImageUrls(content) {
  if (!content) return [];
  const urls = [];
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}
