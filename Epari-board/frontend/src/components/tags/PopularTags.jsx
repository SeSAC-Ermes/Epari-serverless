import { useState, useEffect } from 'react';

function PopularTags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPopularTags = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tags/popular');
        if (!response.ok) throw new Error('Failed to fetch popular tags');

        const data = await response.json();
        setTags(data);
      } catch (error) {
        console.error('Error fetching popular tags:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularTags();
  }, []);

  if (loading) {
    return (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(5)].map((_, index) => (
                <div key={index} className="h-6 bg-gray-200 rounded-full w-16"></div>
            ))}
          </div>
        </div>
    );
  }

  if (error) {
    return null; // 에러 발생 시 컴포넌트를 숨김
  }

  return (
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
        <h3 className="text-lg font-medium text-gray-900">Popular Tags</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map(({ tag, count }, index) => (
              <button
                  key={tag}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                      index === 0
                          ? 'bg-black text-white hover:bg-gray-800'
                          : 'bg-black bg-opacity-5 text-gray-900 hover:bg-opacity-10'
                  } transition-colors duration-200`}
              >
                #{tag}
                <span className="ml-1 text-xs opacity-75">({count})</span>
              </button>
          ))}
        </div>
      </div>
  );
}

export default PopularTags;
