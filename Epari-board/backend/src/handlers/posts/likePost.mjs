import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  try {
    // 요청에서 postId와 userId 추출
    const { postId } = event.pathParameters;
    const { userId } = JSON.parse(event.body);

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
    const likedUsers = post.likedUsers || [];
    // 사용자가 이미 좋아요를 눌렀는지 확인
    const isLiked = likedUsers.includes(userId);

    let updateExpression, expressionAttributeValues;

    if (isLiked) {
      // 좋아요 취소: likedUsers 배열에서 사용자 제거 및 좋아요 수 감소
      updateExpression = `
        SET metadata.likes = metadata.likes - :inc,
            likedUsers = :newLikedUsers
      `;
      expressionAttributeValues = {
        ":inc": 1,
        ":newLikedUsers": likedUsers.filter(id => id !== userId)
      };
    } else {
      // 좋아요: likedUsers 배열에 사용자 추가 및 좋아요 수 증가
      updateExpression = `
        SET metadata.likes = if_not_exists(metadata.likes, :zero) + :inc,
            likedUsers = list_append(if_not_exists(likedUsers, :emptyList), :newUser)
      `;
      expressionAttributeValues = {
        ":inc": 1,
        ":zero": 0,
        ":emptyList": [],
        ":newUser": [userId]
      };
    }

    // DynamoDB 업데이트 실행
    const updateCommand = new UpdateCommand({
      TableName: process.env.POSTS_TABLE,
      Key: {
        PK: post.PK,
        SK: post.SK
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW" // 업데이트된 전체 항목 반환
    });

    const { Attributes } = await dynamodb.send(updateCommand);

    // 성공 응답 반환
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        likes: Attributes.metadata.likes,
        likedUsers: Attributes.likedUsers
      })
    };
  } catch (error) {
    // 에러 로깅 및 에러 응답 반환
    console.error('Error in likePost:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to update like status' })
    };
  }
};
