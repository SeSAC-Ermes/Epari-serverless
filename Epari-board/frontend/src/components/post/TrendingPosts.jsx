import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function TrendingPosts() {
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/posts/trending');
        if (!response.ok) throw new Error('Failed to fetch trending posts');

        const data = await response.json();
        setTrendingPosts(data);
      } catch (error) {
        console.error('Error fetching trending posts:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingPosts();
  }, []);

  if (loading) return <div className="animate-pulse space-y-4">
    {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start space-x-3">
          <div className="w-6 h-4 bg-gray-200 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
    ))}
  </div>;

  if (error) return null;

  return (
      <div className="space-y-4">
        {trendingPosts.map((post, index) => (
            <Link
                key={post.id}
                to={`/posts/${post.id}`}
                className="flex items-start space-x-3 group"
            >
          <span className="flex-shrink-0 text-custom font-medium">
            {String(index + 1).padStart(2, '0')}
          </span>
              <div>
                <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                  {post.title}
                </h4>
                <p className="text-sm text-gray-500">
                  {post.views.toLocaleString()} views
                </p>
              </div>
            </Link>
        ))}
      </div>
  );
}

export default TrendingPosts;
