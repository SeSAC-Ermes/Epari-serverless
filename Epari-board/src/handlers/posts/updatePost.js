import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDB } from "../../lib/dynamodb.js";

export const handler = async (event) => {
  try {
    const postId = event.pathParameters.postId;
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');
    const updatedData = JSON.parse(event.body);

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
    const timestamp = new Date().toISOString();

    const updatedPost = {
      ...post,
      ...updatedData,
      metadata: {
        ...post.metadata,
        updatedAt: timestamp
      }
    };

    await dynamoDB.send(new PutCommand({
      TableName: process.env.POSTS_TABLE,
      Item: updatedPost
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(updatedPost)
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
