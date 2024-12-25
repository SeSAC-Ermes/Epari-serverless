import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  try {
    const { postId } = event.pathParameters;
    const { content } = JSON.parse(event.body);

    // postId 정규화 (5자리 숫자로 패딩)
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');

    // 게시글 조회
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

    // 새로운 댓글 객체 생성
    const newComment = {
      id: uuidv4(),
      content,
      author: {
        id: "user123", // TODO: Cognito나 다른 인증 시스템에서 사용자 ID 가져오기
        name: "John Doe", // TODO: 사용자 프로필에서 실제 이름 가져오기
        avatar: "https://example.com/avatar.jpg" // TODO: 사용자 아바타 URL
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 기존 댓글 배열 업데이트
    const comments = Array.isArray(post.comments) ? [newComment, ...post.comments] : [newComment];

    // 게시글 업데이트
    const updatedPost = {
      ...post,
      comments,
      metadata: {
        ...post.metadata,
        commentsCount: comments.length,
        updatedAt: new Date().toISOString()
      }
    };

    // DynamoDB 업데이트
    await dynamodb.send(new PutCommand({
      TableName: process.env.POSTS_TABLE,
      Item: updatedPost,
      // 낙관적 락킹을 위한 조건 추가
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)"
    }));

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(newComment)
    };

  } catch (error) {
    console.error('Error in createComment:', error);

    // ConditionalCheckFailedException 처리
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Concurrent modification detected' })
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to create comment',
        details: process.env.STAGE === 'dev' ? error.message : undefined
      })
    };
  }
};
