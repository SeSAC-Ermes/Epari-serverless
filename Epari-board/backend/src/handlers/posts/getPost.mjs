import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";


// 단일 조회
export const handler = async (event) => {
  try {
    const { postId } = event.pathParameters;

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

    // 조회수 증가
    const updateCommand = new UpdateCommand({
      TableName: process.env.POSTS_TABLE,
      Key: {
        PK: post.PK,
        SK: post.SK
      },
      UpdateExpression: "SET metadata.#v = if_not_exists(metadata.#v, :zero) + :inc",
      ExpressionAttributeNames: {
        "#v": "views"
      },
      ExpressionAttributeValues: {
        ":inc": 1,
        ":zero": 0
      },
      ReturnValues: "ALL_NEW"
    });

    await dynamodb.send(updateCommand);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(post)
    };
  } catch (error) {
    console.error('Error in getPost:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch post' })
    };
  }
};
