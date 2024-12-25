import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  try {
    const postId = event.pathParameters.postId;
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');

    const command = new QueryCommand({
      TableName: process.env.POSTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${normalizedPostId}`
      }
    });

    const { Items } = await dynamodb.send(command);

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

    // 조회수 증가
    await dynamodb.send(new UpdateCommand({
      TableName: process.env.POSTS_TABLE,
      Key: {
        PK: post.PK,
        SK: post.SK
      },
      UpdateExpression: "SET metadata.#views = metadata.#views + :inc",
      ExpressionAttributeNames: {
        "#views": "views"
      },
      ExpressionAttributeValues: {
        ":inc": 1
      }
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(post)
    };
  } catch (error) {
    console.error('Error in getPost:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch post' })
    };
  }
};
