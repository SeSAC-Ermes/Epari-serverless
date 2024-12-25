import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  try {
    const postId = event.pathParameters.postId;
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');
    const userId = "user123"; // TODO: 실제 인증된 사용자 ID로 대체

    const getCommand = new QueryCommand({
      TableName: process.env.POSTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${normalizedPostId}`
      }
    });

    const { Items } = await dynamodb.send(getCommand);

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
    const likedUsers = post.likedUsers || [];
    const hasLiked = likedUsers.includes(userId);

    if (hasLiked) {
      post.likedUsers = likedUsers.filter(id => id !== userId);
      post.metadata.likes = Math.max((post.metadata.likes || 0) - 1, 0);
    } else {
      post.likedUsers = [...likedUsers, userId];
      post.metadata.likes = (post.metadata.likes || 0) + 1;
    }

    await dynamodb.send(new PutCommand({
      TableName: process.env.POSTS_TABLE,
      Item: post
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        likes: post.metadata.likes,
        hasLiked: !hasLiked
      })
    };
  } catch (error) {
    console.error('Error in likePost:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to like post' })
    };
  }
};
