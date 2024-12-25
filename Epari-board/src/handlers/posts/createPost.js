import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { dynamoDB } from "../../lib/dynamodb.js";

export const handler = async (event) => {
  try {
    const post = JSON.parse(event.body);
    const timestamp = new Date().toISOString();

    // 마지막 POST 번호 조회
    const scanCommand = new ScanCommand({
      TableName: process.env.POSTS_TABLE,
      FilterExpression: "begins_with(PK, :pk)",
      ExpressionAttributeValues: {
        ":pk": "POST#"
      }
    });

    const { Items } = await dynamoDB.send(scanCommand);

    // 다음 게시글 번호 계산
    const nextPostNumber = Items && Items.length > 0
        ? Math.max(...Items.map(item => {
      const match = item.PK.match(/POST#(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })) + 1
        : 1;

    const postData = {
      PK: `POST#${nextPostNumber.toString().padStart(5, '0')}`,
      SK: `METADATA#${timestamp}`,
      GSI1PK: `USER#${post.author.id}`,
      GSI1SK: `POST#${nextPostNumber.toString().padStart(5, '0')}`,
      id: uuidv4(),
      title: post.title,
      content: post.content,
      category: post.category || 'ALL',
      editorType: post.editorType,
      author: post.author,
      metadata: {
        createdAt: timestamp,
        updatedAt: timestamp,
        views: 0,
        likes: 0,
        commentsCount: 0
      },
      tags: post.tags || [],
      comments: [],
      likedUsers: []
    };

    await dynamoDB.send(new PutCommand({
      TableName: process.env.POSTS_TABLE,
      Item: postData
    }));

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(postData)
    };
  } catch (error) {
    console.error('Error in createPost:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to create post' })
    };
  }
};
