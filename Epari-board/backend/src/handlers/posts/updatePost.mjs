import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  try {
    const { postId } = event.pathParameters;
    const updates = JSON.parse(event.body);
    const timestamp = new Date().toISOString();

    // 먼저 게시글 조회
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Post not found' })
      };
    }

    const post = Items[0];

    // 게시글 업데이트
    const updateCommand = new UpdateCommand({
      TableName: process.env.POSTS_TABLE,
      Key: {
        PK: post.PK,
        SK: post.SK
      },
      UpdateExpression: "SET title = :title, content = :content, metadata.updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":title": updates.title,
        ":content": updates.content,
        ":updatedAt": timestamp
      },
      ReturnValues: "ALL_NEW"
    });

    const { Attributes } = await dynamodb.send(updateCommand);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(Attributes)
    };
  } catch (error) {
    console.error('Error in updatePost:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to update post' })
    };
  }
};
