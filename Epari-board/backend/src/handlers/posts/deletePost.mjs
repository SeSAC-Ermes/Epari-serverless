import { DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { dynamodb } from "../../lib/dynamodb.mjs";
import { s3 } from "../../lib/s3.mjs";

export const handler = async (event) => {
  try {
    const { postId } = event.pathParameters;

    // 먼저 게시글 관련 모든 항목 조회
    const queryCommand = new QueryCommand({
      TableName: process.env.POSTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${postId}`
      }
    });

    const { Items } = await dynamodb.send(queryCommand);

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

    // 게시글 내용이 있는 항목 찾기
    const mainPost = Items.find(item => item.content);

    if (mainPost) {
      // 이미지 URL 추출 및 삭제
      const imageUrls = extractImageUrls(mainPost.content);
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
    }

    // 게시글과 관련된 모든 항목 삭제
    await Promise.all(Items.map(item =>
        dynamodb.send(new DeleteCommand({
          TableName: process.env.POSTS_TABLE,
          Key: {
            PK: item.PK,
            SK: item.SK
          }
        }))
    ));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'Post and all related items deleted successfully' })
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
