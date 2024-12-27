import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const post = JSON.parse(event.body);
    const postId = uuidv4();
    const timestamp = new Date().toISOString();

    const postData = {
      PK: `POST#${postId}`,
      SK: `METADATA#${timestamp}`,
      GSI1PK: `USER#${post.author.id}`,
      GSI1SK: `POST#${postId}`,
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

    console.log('Saving post:', {
      PK: `POST#${postId}`,
      SK: 'METADATA',
      // ... 다른 필드들
    });

    await docClient.send(new PutCommand({
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
    console.error('Error creating post:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Could not create post' })
    };
  }
};
