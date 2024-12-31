import { useState, useEffect } from 'react';
import CategoryFilter from '../components/post/CategoryFilter';
import SearchBar from '../components/post/SearchBar';
import PostCard from '../components/post/PostCard';
import TrendingPosts from '../components/post/TrendingPosts';
import PopularTags from '@components/tags/PopularTags';
import { useSearchParams } from 'react-router-dom';

function HomePage() {
  const [posts, setPosts] = useState([]);  // 빈 배열로 초기화
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCategory = searchParams.get('category') || 'ALL';

  const searchPosts = async (query, category) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (category) params.append('category', category);

    const response = await fetch(`/api/posts/search?${params}`);
    if (!response.ok) throw new Error('Search failed');

    return response.json();
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const timestamp = new Date().getTime();

        let response;
        if (searchQuery) {
          // 검색어가 있는 경우 검색 API 사용
          const response = await searchPosts(searchQuery, selectedCategory);
          setPosts(response.posts || []); // response.posts가 없는 경우 빈 배열 사용
          return;
        }

        // 검색어가 없는 경우 일반 목록 API 사용
        const url = selectedCategory === 'ALL'
            ? `/api/posts?_=${timestamp}`
            : `/api/posts?category=${selectedCategory}&_=${timestamp}`;

        response = await fetch(url, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const seen = new Set();
        const uniquePosts = data.filter(post => {
          const duplicate = seen.has(post.PK);
          seen.add(post.PK);
          return !duplicate;
        });

        setPosts(uniquePosts);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    // 디바운스 처리로 성능 최적화
    const timeoutId = setTimeout(() => {
      fetchPosts();
    }, 300); // 300ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [selectedCategory, searchQuery]);

  const handleCategoryChange = (category) => {
    setSearchParams({ category });
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const renderPosts = () => {
    if (loading) {
      return (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
      );
    }

    if (error) {
      return (
          <div className="text-red-500 text-center p-4 bg-white rounded-xl shadow-sm">
            Error: {error}
          </div>
      );
    }

    if (!posts || posts.length === 0) {
      return (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">
              {searchQuery
                  ? '검색 결과가 없습니다.'
                  : '이 카테고리에는 아직 게시글이 없습니다.'}
            </p>
            <p className="text-gray-400 mt-2">첫 게시글을 작성해보세요!</p>
          </div>
      );
    }

    return (
        <div className="space-y-6">
          {posts.map(post => (
              <PostCard
                  key={`${post.PK}-${post.metadata.createdAt}`}
                  post={{
                    id: post.PK,
                    title: post.title,
                    excerpt: post.content,
                    author: post.author,
                    createdAt: new Date(post.metadata.createdAt).toLocaleDateString(),
                    tags: post.tags || [],
                    metadata: {
                      views: post.metadata?.views || 0,
                      likes: post.metadata?.likes || 0,
                      commentsCount: post.metadata?.commentsCount || 0
                    }
                  }}
                  to={`/posts/${post.PK.split('#')[1]}`}
              />
          ))}
        </div>
    );
  };

  return (
      <div className="flex space-x-8">
        <main className="flex-1 space-y-6">
          <div className="flex items-center mb-6">
            <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
            />
          </div>
          <SearchBar
              value={searchQuery}
              onChange={handleSearch}
          />
          {renderPosts()}
        </main>

        <aside className="w-80">
          <PopularTags />
          <div className="mt-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900">Trending Posts</h3>
            <div className="mt-4">
              <TrendingPosts />
            </div>
          </div>
        </aside>
      </div>
  );
}

export default HomePage;
