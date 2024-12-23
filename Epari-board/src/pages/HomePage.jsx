import { useState, useEffect } from 'react';
import CategoryFilter from '../components/post/CategoryFilter';
import SearchBar from '../components/post/SearchBar';
import PostCard from '../components/post/PostCard';

function HomePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/posts');
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        const data = await response.json();
        console.log('Fetched posts:', data);  // 데이터 확인용 로그
        setPosts(data);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) return <div>Loading posts...</div>;
  if (error) return <div>Error: {error}</div>;

  const trendingPosts = [
    { id: 1, title: "The Impact of AI on Education", views: "3.2k" },
    { id: 2, title: "Remote Learning Best Practices", views: "2.8k" },
    { id: 3, title: "Digital Assessment Strategies", views: "2.1k" }
  ];

  const popularTags = [
    "education",
    "learning",
    "teaching",
    "edtech",
    "online"
  ];

  return (
    <div className="flex space-x-8">
      <main className="flex-1 space-y-6">
        <div className="flex items-center mb-6">
          <CategoryFilter 
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <div className="space-y-6">
          {posts.map(post => (
            <PostCard key={post.PK} post={{
              id: post.PK,
              title: post.title,
              excerpt: post.content,
              author: post.author,
              createdAt: new Date(post.metadata.createdAt).toLocaleDateString(),
              tags: post.tags,
              metadata: {
                views: post.metadata?.views || 0,
                likes: post.metadata?.likes || 0,
                commentsCount: post.metadata?.commentsCount || 0
              }
            }} />
          ))}
        </div>
      </main>

      <aside className="w-80">
        <div className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-900">Popular Tags</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {popularTags.map((tag, index) => (
              <button 
                key={tag}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  index === 0 
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-black bg-opacity-5 text-gray-900 hover:bg-opacity-10'
                } transition-colors duration-200`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-900">Trending Posts</h3>
          <div className="mt-4 space-y-4">
            {trendingPosts.map((post, index) => (
              <div key={post.id} className="flex items-start space-x-3">
                <span className="flex-shrink-0 text-custom font-medium">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{post.title}</h4>
                  <p className="text-sm text-gray-500">{post.views} views</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default HomePage; 