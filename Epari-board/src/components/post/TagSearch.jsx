import React, { useEffect, useState } from 'react';

function TagSearch({ onTagSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [popularTags, setPopularTags] = useState([]);

  useEffect(() => {
    // 인기 태그 가져오기
    const fetchPopularTags = async () => {
      try {
        const response = await fetch('/api/tags/popular');
        if (response.ok) {
          const data = await response.json();
          setPopularTags(data);
        }
      } catch (error) {
        console.error('Error fetching popular tags:', error);
      }
    };

    fetchPopularTags();
  }, []);

  return (
    <div className="mb-6">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by tag..."
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {popularTags.map(tag => (
          <button
            key={tag}
            onClick={() => onTagSelect(tag)}
            className="px-3 py-1 rounded-full text-sm bg-gray-100 hover:bg-gray-200"
          >
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TagSearch; 