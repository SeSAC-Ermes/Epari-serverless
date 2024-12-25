import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDB } from "../../lib/dynamodb.js";

export const handler = async (event) => {
  const { postId, commentId } = event.pathParameters;
  const userId = "user123"; // TODO: Cognito 또는 JWT에서 사용자 ID 추출

  try {
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

    // 권한 검증 로직
    if (post.comments[commentIndex].author.id !== userId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Not authorized to delete this comment' })
      };
    }

    // 댓글 삭제 및 메타데이터 업데이트
    post.comments = post.comments.filter(c => c.id !== commentId);
    post.metadata = {
      ...post.metadata,
      commentsCount: post.comments.length,
      updatedAt: new Date().toISOString()
    };

    // 낙관적 락킹을 통한 동시성 제어
    const updateCommand = new PutCommand({
      TableName: process.env.POSTS_TABLE,
      Item: post,
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)"
    });

    await dynamoDB.send(updateCommand);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache' // 캐시 무효화
      },
      body: JSON.stringify({
        message: 'Comment deleted successfully',
        newCommentsCount: post.metadata.commentsCount
      })
    };

  } catch (error) {
    console.error('Error in deleteComment:', {
      error,
      postId,
      commentId,
      userId,
      timestamp: new Date().toISOString()
    });

    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Comment was modified by another request' })
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to delete comment' })
    };
  }
};
