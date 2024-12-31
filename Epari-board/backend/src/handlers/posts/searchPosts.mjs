import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodb } from "../../lib/dynamodb.mjs";

export const handler = async (event) => {
  try {
    const { query, category } = event.queryStringParameters || {};

    // 기본 필터 표현식 (항상 POST로 시작하는 PK만 검색)
    let filterExpression = "begins_with(PK, :pk)";
    let expressionAttributeValues = {
      ":pk": "POST#"
    };
    let expressionAttributeNames = {};

    // 검색어가 있는 경우 필터 추가
    if (query) {
      // 제목, 내용, 태그에서 검색
      filterExpression += " AND (contains(#title, :query) OR contains(content, :query) OR contains(#tags, :query))";
      expressionAttributeValues[":query"] = query.toLowerCase();
      expressionAttributeNames["#title"] = "title";
      expressionAttributeNames["#tags"] = "tags";
    }

    // 카테고리 필터 추가
    if (category && category !== 'ALL') {
      if (category === 'MY') {
        filterExpression += " AND GSI1PK = :userId";
        expressionAttributeValues[":userId"] = "USER#user123"; // 실제 구현시 인증된 사용자 ID 사용
      } else {
        filterExpression += " AND category = :category";
        expressionAttributeValues[":category"] = category;
      }
    }

    const command = new ScanCommand({
      TableName: process.env.POSTS_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      // 필요한 속성만 가져오도록 설정하여 성능 최적화
      ProjectionExpression: "PK, SK, title, content, category, author, metadata, tags",
    });

    const { Items, LastEvaluatedKey } = await dynamodb.send(command);

    // 검색 결과 데이터 정제
    const posts = Items.map(post => ({
      ...post,
      id: post.PK.split('#')[1],
      metadata: {
        ...post.metadata,
        views: parseInt(post.metadata?.views || 0),
        likes: parseInt(post.metadata?.likes || 0),
        commentsCount: parseInt(post.metadata?.commentsCount || 0)
      }
    }));

    // 최신순으로 정렬
    const sortedPosts = posts.sort((a, b) =>
        new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt)
    );

    // 응답에 페이지네이션 정보 포함
    const response = {
      posts: sortedPosts,
      metadata: {
        total: sortedPosts.length,
        hasMore: !!LastEvaluatedKey
      }
    };

    if (LastEvaluatedKey) {
      response.metadata.nextKey = LastEvaluatedKey;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': query ? 'no-cache' : 'public, max-age=300' // 검색 결과는 캐시하지 않음
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error in searchPosts:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to search posts',
        message: error.message
      })
    };
  }
};
