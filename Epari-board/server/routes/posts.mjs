import express from 'express';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();

// DynamoDB 클라이언트 생성을 함수로 만들어서 실제 요청 시점에 생성
const createDynamoDBClient = () => {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });

  return DynamoDBDocumentClient.from(client);
};

// 1. 구체적인 경로를 먼저 배치
router.post('/:postId/like', async (req, res) => {
  try {
    const docClient = createDynamoDBClient();
    const postId = req.params.postId;
    const userId = "user123";  // 실제로는 로그인된 사용자 ID

    // 현재 게시글 조회
    const getCommand = new QueryCommand({
      TableName: "Epari-board-lhl",
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${postId}`
      }
    });

    const result = await docClient.send(getCommand);
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.Items[0];
    const likedUsers = post.likedUsers || [];
    const hasLiked = likedUsers.includes(userId);

    // 좋아요 상태 토글
    if (hasLiked) {
      // 좋아요 취소
      post.likedUsers = likedUsers.filter(id => id !== userId);
      post.metadata.likes = Math.max((post.metadata.likes || 0) - 1, 0);
    } else {
      // 좋아요 추가
      post.likedUsers = [...likedUsers, userId];
      post.metadata.likes = (post.metadata.likes || 0) + 1;
    }

    // 게시글 업데이트
    await docClient.send(new PutCommand({
      TableName: "Epari-board-lhl",
      Item: post
    }));

    res.json({ 
      likes: post.metadata.likes,
      hasLiked: !hasLiked
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

router.get('/:postId/comments', async (req, res) => {
  try {
    const docClient = createDynamoDBClient();
    const postId = req.params.postId;
    
    // postId에서 leading zeros 다 5자리로 만들기
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');

    const command = new QueryCommand({
      TableName: "Epari-board-lhl",
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `POST#${normalizedPostId}`,
        ":sk": "COMMENT#"
      },
      ScanIndexForward: false
    });

    const result = await docClient.send(command);
    console.log('Found comments:', result.Items?.length);  // 로그 추가
    res.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/:postId/comments', async (req, res) => {
  try {
    const docClient = createDynamoDBClient();
    const postId = req.params.postId;
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');
    const { content } = req.body;

    // 게시글 조회
    const getCommand = new QueryCommand({
      TableName: "Epari-board-lhl",
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${normalizedPostId}`
      }
    });

    const result = await docClient.send(getCommand);
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.Items[0];
    const newComment = {
      id: uuidv4(),
      content,
      author: {
        id: "user123",
        name: "John Doe",
        avatar: "https://example.com/avatar.jpg"
      },
      createdAt: new Date().toISOString()
    };

    // 기존 댓글 배열에 새 댓글 추가
    const comments = post.comments || [];
    comments.unshift(newComment);  // 새 댓글을 앞에 추가

    // 게시글 업데이트
    const updateCommand = new PutCommand({
      TableName: "Epari-board-lhl",
      Item: {
        ...post,
        comments,
        metadata: {
          ...post.metadata,
          commentsCount: comments.length
        }
      }
    });

    await docClient.send(updateCommand);
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.put('/:postId/comments/:commentId', async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = "user123";  // 실제로는 로그인된 사용자 ID

    const docClient = createDynamoDBClient();
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');

    // 게시글 조회
    const getCommand = new QueryCommand({
      TableName: "Epari-board-lhl",
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${normalizedPostId}`
      }
    });

    const result = await docClient.send(getCommand);
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.Items[0];
    const commentIndex = post.comments.findIndex(c => c.id === commentId);

    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // 댓글 작성자 확인
    if (post.comments[commentIndex].author.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    // 댓글 수정
    post.comments[commentIndex] = {
      ...post.comments[commentIndex],
      content,
      updatedAt: new Date().toISOString()
    };

    // 게시글 업데이트
    await docClient.send(new PutCommand({
      TableName: "Epari-board-lhl",
      Item: post
    }));

    res.json(post.comments[commentIndex]);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

router.delete('/:postId/comments/:commentId', async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = "user123";  // 실제로는 로그인된 사용자 ID

    const docClient = createDynamoDBClient();
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');

    // 게시글 조회
    const getCommand = new QueryCommand({
      TableName: "Epari-board-lhl",
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${normalizedPostId}`
      }
    });

    const result = await docClient.send(getCommand);
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.Items[0];
    const comment = post.comments.find(c => c.id === commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // 댓글 작성자 확인
    if (comment.author.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // 댓글 삭제
    post.comments = post.comments.filter(c => c.id !== commentId);
    post.metadata.commentsCount = post.comments.length;

    // 게시글 업데이트
    await docClient.send(new PutCommand({
      TableName: "Epari-board-lhl",
      Item: post
    }));

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// 2. 기본 CRUD 라우트
router.get('/', async (req, res) => {
  try {
    console.log('Creating DynamoDB client...');
    const docClient = createDynamoDBClient();
    
    console.log('Preparing scan command...');
    const command = new ScanCommand({
      TableName: "Epari-board-lhl",
      FilterExpression: "begins_with(PK, :pk)",
      ExpressionAttributeValues: {
        ":pk": "POST#"
      }
    });

    console.log('Executing scan command...');
    const result = await docClient.send(command);
    console.log('Scan result:', { count: result.Items?.length, items: result.Items?.map(item => ({ PK: item.PK, title: item.title })) });

    // 게시글 정렬 (최신순)
    const sortedPosts = result.Items
      ?.filter(item => item.PK.startsWith('POST#'))
      .sort((a, b) => {
        // SK에서 timestamp 추출 (METADATA# 제거)
        const getTimestamp = (sk) => {
          if (!sk) return 0;
          return sk.startsWith('METADATA#') ? sk.replace('METADATA#', '') : sk;
        };

        const dateA = new Date(a.metadata?.createdAt || getTimestamp(a.SK) || 0);
        const dateB = new Date(b.metadata?.createdAt || getTimestamp(b.SK) || 0);
        return dateB - dateA;
      });

    // 중복 제거 (같은 PK를 진 게시글 중 최신 버전 유지)
    const uniquePosts = sortedPosts?.reduce((acc, current) => {
      const x = acc.find(item => item.PK === current.PK);
      if (!x) {
        // metadata가 없는 경우 기본값 추가
        if (!current.metadata) {
          current.metadata = {
            createdAt: current.SK || new Date().toISOString(),
            views: 0,
            likes: 0,
            commentsCount: 0
          };
        }
        return acc.concat([current]);
      }
      return acc;
    }, []);

    console.log('Sending response with sorted unique posts...');
    res.json(uniquePosts || []);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const docClient = createDynamoDBClient();
    const post = req.body;
    
    console.log('Received post data:', {
      category: post.category,
      title: post.title?.slice(0, 30),
      author: post.author
    });

    const timestamp = new Date().toISOString();
    
    try {
      // 마지막 POST 번호 조회 시 로그 추가
      console.log('Scanning for existing posts...');
      const scanCommand = new ScanCommand({
        TableName: "Epari-board-lhl",
        FilterExpression: "begins_with(PK, :pk)",
        ExpressionAttributeValues: {
          ":pk": "POST#"
        }
      });

      const lastPost = await docClient.send(scanCommand);
      console.log('Found posts:', lastPost.Items?.map(item => item.PK));

      let nextPostNumber;
      if (lastPost.Items?.length > 0) {
        const existingNumbers = lastPost.Items.map(item => 
          Number(item.PK.split('#')[1])
        );
        console.log('Existing post numbers:', existingNumbers);
        nextPostNumber = Math.max(...existingNumbers) + 1;
      } else {
        nextPostNumber = 1;
      }

      console.log('Generated next post number:', nextPostNumber);

      const postData = {
        ...post,
        PK: `POST#${nextPostNumber.toString().padStart(5, '0')}`,
        SK: `METADATA#${timestamp}`,
        GSI1PK: `USER#${post.author.id}`,
        GSI1SK: `POST#${nextPostNumber.toString().padStart(5, '0')}`,
        GSI2PK: `CATEGORY#${post.category}`,
        GSI2SK: timestamp,
        postNumber: nextPostNumber,
        tags: post.tags || []
      };

      await docClient.send(new PutCommand({
        TableName: "Epari-board-lhl",
        Item: postData
      }));

      res.status(201).json(postData);
    } catch (error) {
      console.error('Error saving post:', error);
      res.status(500).json({ error: 'Failed to save post' });
    }
  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

router.put('/:postId', async (req, res) => {
  try {
    const docClient = createDynamoDBClient();
    const postId = req.params.postId;
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');
    const userId = "user123";
    const updatedData = req.body;

    // 게시글 조회
    const getCommand = new QueryCommand({
      TableName: "Epari-board-lhl",
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${normalizedPostId}`
      }
    });

    const result = await docClient.send(getCommand);
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.Items[0];

    // 작성자 확인
    if (post.author.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    const timestamp = new Date().toISOString();
    const updatedPost = {
      ...post,
      ...updatedData,
      SK: `METADATA#${timestamp}`,  // SK 형식 통일
      metadata: {
        ...post.metadata,
        updatedAt: timestamp
      }
    };

    await docClient.send(new PutCommand({
      TableName: "Epari-board-lhl",
      Item: updatedPost
    }));

    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

router.delete('/:postId', async (req, res) => {
  try {
    const docClient = createDynamoDBClient();
    const postId = req.params.postId;
    const normalizedPostId = String(parseInt(postId)).padStart(5, '0');
    const userId = "user123";  // 실제로는 로그인된 사용자 ID

    // 게시글 조회
    const getCommand = new QueryCommand({
      TableName: "Epari-board-lhl",
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${normalizedPostId}`
      }
    });

    const result = await docClient.send(getCommand);
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.Items[0];

    // 작성자 확인
    if (post.author.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // 게시글 삭제
    await docClient.send(new DeleteCommand({
      TableName: "Epari-board-lhl",
      Key: {
        PK: post.PK,
        SK: post.SK
      }
    }));

    // S3에서 관련 이미지들 삭제
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });

    // 게시글에 포함된 모든 이미지 URL에서 S3 key 추출
    const imageUrls = extractImageUrls(post.content);
    await Promise.all(imageUrls.map(async (url) => {
      const key = url.split('.com/')[1];
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.VITE_AWS_BUCKET_NAME,
        Key: key
      }));
    }));

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

router.get('/:postId', async (req, res) => {
  try {
    const docClient = createDynamoDBClient();
    const postId = req.params.postId;
    console.log('Requested postId:', postId);

    const command = new QueryCommand({
      TableName: "Epari-board-lhl",
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `POST#${postId}`
      }
    });

    const result = await docClient.send(command);
    console.log('Query result:', JSON.stringify(result, null, 2));
    
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.Items[0];
    console.log('Original post:', JSON.stringify(post, null, 2));

    // 필수 필드가 없는 경우 기본값 설정
    const updatedPost = {
      ...post,
      metadata: {
        createdAt: post.metadata?.createdAt || post.SK || new Date().toISOString(),
        views: (post.metadata?.views || 0) + 1,
        likes: post.metadata?.likes || 0,
        commentsCount: post.metadata?.commentsCount || 0,
        updatedAt: post.metadata?.updatedAt || post.SK || new Date().toISOString()
      },
      tags: post.tags || [],
      likedUsers: post.likedUsers || [],
      comments: post.comments || []
    };

    console.log('Updated post:', JSON.stringify(updatedPost, null, 2));

    await docClient.send(new PutCommand({
      TableName: "Epari-board-lhl",
      Item: updatedPost
    }));

    res.json(updatedPost);
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// 이미지 URL 추출 함수
function extractImageUrls(content) {
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  const urls = [];
  let match;
  
  while ((match = imgRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  
  return urls;
}

// 인기 태그 조회
router.get('/tags/popular', async (req, res) => {
  try {
    const docClient = createDynamoDBClient();
    const command = new ScanCommand({
      TableName: "Epari-board-lhl",
      FilterExpression: "begins_with(PK, :pk)",
      ExpressionAttributeValues: {
        ":pk": "POST#"
      }
    });

    const result = await docClient.send(command);
    const allTags = result.Items
      .flatMap(post => post.tags || [])
      .filter(tag => tag.trim());

    // 태그 빈도수 계산
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

    // 빈도수 기준으로 정렬
    const popularTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);

    res.json(popularTags);
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    res.status(500).json({ error: 'Failed to fetch popular tags' });
  }
});

export default router; 