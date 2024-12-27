import { GetCommand, UpdateCommand, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  try {
    const { postId } = event.pathParameters;
    console.log('Fetching post with ID:', postId);
    
    const command = new QueryCommand({
      TableName: process.env.POSTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${postId}`
      }
    });

    const { Items } = await dynamodb.send(command);
    console.log('DynamoDB response:', Items);

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

    const Item = Items[0];

    await dynamodb.send(new UpdateCommand({
      TableName: process.env.POSTS_TABLE,
      Key: {
        PK: Item.PK,
        SK: Item.SK
      },
      UpdateExpression: "SET metadata.#views = metadata.#views + :inc",
      ExpressionAttributeNames: {
        "#views": "views"
      },
      ExpressionAttributeValues: {
        ":inc": 1
      }
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(Item)
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
