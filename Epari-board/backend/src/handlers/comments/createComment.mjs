import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  try {
    const { postId } = event.pathParameters;
    const comment = JSON.parse(event.body);

    // 필수 필드 검증
    if (!comment.content || !comment.author || !comment.author.id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['content', 'author.id', 'author.name']
        })
      };
    }

    const commentId = uuidv4();
    const timestamp = new Date().toISOString();

    // 먼저 게시글 존재 여부 확인
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

    // 댓글 데이터 생성
    const commentData = {
      PK: `POST#${postId}`,
      SK: `COMMENT#${commentId}`,
      GSI1PK: `USER#${comment.author.id}`,
      GSI1SK: `COMMENT#${commentId}`,
      id: commentId,
      content: comment.content,
      author: comment.author,
      metadata: {
        createdAt: timestamp,
        updatedAt: timestamp
      }
    };

    // 댓글 저장
    await dynamodb.send(new PutCommand({
      TableName: process.env.POSTS_TABLE,
      Item: commentData
    }));

    // 게시글의 댓글 수 증가
    await dynamodb.send(new UpdateCommand({
      TableName: process.env.POSTS_TABLE,
      Key: {
        PK: Items[0].PK,
        SK: Items[0].SK
      },
      UpdateExpression: "SET metadata.commentsCount = metadata.commentsCount + :inc",
      ExpressionAttributeValues: {
        ":inc": 1
      }
    }));

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(commentData)
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
      body: JSON.stringify({ error: 'Failed to create comment' })
    };
  }
};
