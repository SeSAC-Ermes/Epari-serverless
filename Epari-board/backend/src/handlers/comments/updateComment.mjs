import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  const { postId, commentId } = event.pathParameters;
  const { content } = JSON.parse(event.body);
  const userId = "user123"; // TODO: Cognito 또는 JWT에서 사용자 ID 추출

  try {
    // 게시글 조회
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

    const post = Items[0];
    const commentIndex = post.comments?.findIndex(c => c.id === commentId);

    if (commentIndex === -1) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Comment not found' })
      };
    }

    // 권한 검증
    if (post.comments[commentIndex].author.id !== userId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Not authorized to update this comment' })
      };
    }

    // 댓글 업데이트
    const updatedComment = {
      ...post.comments[commentIndex],
      content: content,
      updatedAt: new Date().toISOString()
    };

    const updateCommand = new UpdateCommand({
      TableName: process.env.POSTS_TABLE,
      Key: {
        PK: post.PK,
        SK: post.SK
      },
      UpdateExpression: "SET comments[" + commentIndex + "] = :updatedComment",
      ExpressionAttributeValues: {
        ":updatedComment": updatedComment
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
      body: JSON.stringify(updatedComment)
    };
  } catch (error) {
    console.error('Error in updateComment:', {
      error,
      postId,
      commentId,
      userId,
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to update comment' })
    };
  }
};
