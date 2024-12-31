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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Post not found' })
      };
    }

    const post = Items[0];

    // 새 댓글 데이터
    const newComment = {
      id: commentId,
      content: comment.content,
      author: comment.author,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // 게시글 업데이트 (comments 배열에 새 댓글 추가)
    const updateCommand = new UpdateCommand({
      TableName: process.env.POSTS_TABLE,
      Key: {
        PK: post.PK,
        SK: post.SK
      },
      UpdateExpression: "SET comments = list_append(if_not_exists(comments, :empty_list), :newComment), metadata.commentsCount = if_not_exists(metadata.commentsCount, :zero) + :one",
      ExpressionAttributeValues: {
        ":empty_list": [],
        ":newComment": [newComment],
        ":zero": 0,
        ":one": 1
      },
      ReturnValues: "ALL_NEW"
    });

    const { Attributes } = await dynamodb.send(updateCommand);

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
