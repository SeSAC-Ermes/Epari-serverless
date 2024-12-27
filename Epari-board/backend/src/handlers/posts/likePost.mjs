import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  try {
    const { postId } = event.pathParameters;
    const { userId } = JSON.parse(event.body);

    const command = new UpdateCommand({
      TableName: process.env.POSTS_TABLE,
      Key: {
        PK: `POST#${postId}`,
        SK: 'METADATA'
      },
      // ... rest of the code
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
