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

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
      marshallCustom: (input) => {
        if (input && typeof input === 'object' && 'resources' in input) {
          return {
            ...input,
            resources: {
              drawings: { L: input.resources.drawings },
              images: { L: input.resources.images }
            }
          };
        }
        return input;
      }
    }
  });
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
    const docClient = createDynamoDBClient();
    
    const command = new ScanCommand({
      TableName: "Epari-board-lhl",
    });

    const result = await docClient.send(command);
    
    if (!result.Items) {
      return res.json([]);
    }

    // 게시글 정렬 (최신순)
    const sortedPosts = result.Items
      .filter(item => item.PK?.startsWith('POST#'))
      .map(post => ({
        id: post.id?.S || post.id,
        postNumber: post.postNumber?.N || post.postNumber,
        title: post.title?.S || post.title,
        content: post.content?.S || post.content,
        category: post.category?.S || post.category,
        editorType: post.editorType?.S || post.editorType,
        author: post.author?.M ? {
          id: post.author.M.id.S,
          name: post.author.M.name.S,
          avatar: post.author.M.avatar.S
        } : post.author,
        metadata: {
          createdAt: post.metadata?.createdAt || post.SK?.replace('METADATA#', '') || post.SK,
          updatedAt: post.metadata?.updatedAt || post.SK?.replace('METADATA#', '') || post.SK,
          views: parseInt(post.metadata?.views || 0),
          likes: parseInt(post.metadata?.likes || 0),
          commentsCount: (post.comments?.length || 0)
        },
        comments: Array.isArray(post.comments) ? post.comments : [],
        likedUsers: Array.isArray(post.likedUsers) ? post.likedUsers : [],
        tags: (post.tags?.L || []).map(tag => tag.S),
        PK: post.PK?.S || post.PK,
        SK: post.SK?.S || post.SK
      }))
      .sort((a, b) => {
        const dateA = new Date(a.metadata.createdAt);
        const dateB = new Date(b.metadata.createdAt);
        return dateB - dateA;
      });

    // 중복 제거
    const uniquePosts = sortedPosts.reduce((acc, current) => {
      const x = acc.find(item => item.PK === current.PK);
      if (!x) {
        return acc.concat([current]);
      }
      return acc;
    }, []);

    res.json(uniquePosts);

  } catch (error) {
    console.error('Error in GET /posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const docClient = createDynamoDBClient();
    const post = req.body;
    const timestamp = new Date().toISOString();
    
    // 마지막 POST 번호 조회
    const scanCommand = new ScanCommand({
      TableName: "Epari-board-lhl",
      FilterExpression: "begins_with(PK, :pk)",
      ExpressionAttributeValues: {
        ":pk": "POST#"
      }
    });

    const lastPost = await docClient.send(scanCommand);
    
    // 다음 게시글 번호 계산
    let nextPostNumber = 1;
    if (lastPost.Items?.length > 0) {
      const postNumbers = lastPost.Items
        .map(item => {
          const pk = item.PK;
          if (!pk) return 0;
          const match = pk.match(/POST#(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(num => !isNaN(num));

      if (postNumbers.length > 0) {
        nextPostNumber = Math.max(...postNumbers) + 1;
      }
    }
    
    // HTML서 이미지 URL 추출
    const imageUrls = extractImageUrls(post.content);
    
    // drawings와 images 분류
    const resources = {
      drawings: imageUrls
        .filter(url => url.includes('/drawings/'))
        .map(url => ({
          id: `draw_${uuidv4()}`,
          url: url,
          uploadedAt: timestamp
        })),
      images: imageUrls
        .filter(url => !url.includes('/drawings/'))
        .map(url => ({
          id: `img_${uuidv4()}`,
          url: url,
          uploadedAt: timestamp
        }))
    };

    // postData 생성
    const postData = {
      PK: `POST#${nextPostNumber.toString().padStart(5, '0')}`,
      SK: `METADATA#${timestamp}`,
      GSI1PK: `USER#${post.author.id}`,
      GSI1SK: `POST#${nextPostNumber.toString().padStart(5, '0')}`,
      GSI2PK: `CATEGORY#${post.category || 'ALL'}`,
      GSI2SK: timestamp,
      id: uuidv4(),
      postNumber: nextPostNumber,
      title: post.title || '',
      content: post.content || '',
      category: post.category || 'ALL',
      editorType: post.editorType || 'tiny',
      author: {
        id: post.author.id,
        name: post.author.name,
        avatar: post.author.avatar || '/src/assets/default-avatar.png'
      },
      metadata: {
        createdAt: timestamp,
        updatedAt: timestamp,
        views: 0,
        likes: 0,
        commentsCount: 0
      },
      comments: [],
      likedUsers: [],
      tags: Array.isArray(post.tags) ? post.tags : [],
      resources: {
        drawings: resources.drawings.map(drawing => ({
          id: drawing.id,
          url: drawing.url,
          uploadedAt: drawing.uploadedAt
        })),
        images: resources.images.map(image => ({
          id: image.id,
          url: image.url,
          uploadedAt: image.uploadedAt
        }))
      }
    };

    console.log('Resources before conversion:', resources);
    console.log('PostData resources before save:', postData.resources);

    console.log('Saving post data:', postData);

    await docClient.send(new PutCommand({
      TableName: "Epari-board-lhl",
      Item: postData
    }));

    res.status(201).json(postData);
  } catch (error) {
    console.error('Error in POST /posts:', error);
    res.status(500).json({ 
      error: 'Failed to save post',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    
    // 현재 content에서 사용 중인 이미지 URL 추출
    const usedUrls = extractImageUrls(updatedData.content);
    
    // 사용하지 않는 이미지 필터링하여 resources 업데이트
    const updatedResources = {
      drawings: (updatedData.resources?.drawings || [])
        .filter(drawing => usedUrls.includes(drawing.url))
        .map(drawing => ({
          id: drawing.id,
          url: drawing.url,
          uploadedAt: drawing.uploadedAt || timestamp
        })),
      images: (updatedData.resources?.images || [])
        .filter(image => usedUrls.includes(image.url))
        .map(image => ({
          id: image.id,
          url: image.url,
          uploadedAt: image.uploadedAt || timestamp
        }))
    };

    const updatedPost = {
      ...post,
      ...updatedData,
      resources: updatedResources,
      metadata: {
        ...post.metadata,
        updatedAt: timestamp
      }
    };

    // 기존 SK 유지
    updatedPost.SK = post.SK;

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
    const userId = "user123";  // 실제로는 로그인��� 사용자 ID

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
    console.log('Post to delete:', post); // 디버깅용

    // 작성자 확인
    if (post.author.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // S3에서 이미지 삭제
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });

    // 게시글 내용에서 이미지 URL 추출
    const imageUrls = extractImageUrls(post.content);
    
    // resources에서 이미지 URL 추출
    if (post.resources) {
      if (Array.isArray(post.resources.drawings)) {
        post.resources.drawings.forEach(drawing => {
          if (drawing.url) imageUrls.push(drawing.url);
        });
      }
      if (Array.isArray(post.resources.images)) {
        post.resources.images.forEach(image => {
          if (image.url) imageUrls.push(image.url);
        });
      }
    }

    console.log('Images to delete:', imageUrls); // 디버깅용

    // S3에서 이미지 삭제
    for (const url of imageUrls) {
      try {
        const key = url.split('.com/')[1];
        if (key) {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: "epari-community",
            Key: key
          }));
        }
      } catch (error) {
        console.warn('Failed to delete image:', url, error);
        // 이미지 삭제 실패해도 계속 진행
      }
    }

    // 게시글 삭제
    await docClient.send(new DeleteCommand({
      TableName: "Epari-board-lhl",
      Key: {
        PK: post.PK,
        SK: post.SK
      }
    }));

    console.log('Post deleted successfully'); // 디버깅용
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ 
      error: 'Failed to delete post',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
  if (!content) return [];
  
  const urls = [];
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
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
