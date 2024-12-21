import { useState } from 'react';
import CategoryFilter from '../components/post/CategoryFilter';
import SearchBar from '../components/post/SearchBar';
import PostCard from '../components/post/PostCard';

function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 임시 데이터
  const posts = [
    {
      id: 1,
      title: "Best Practices for Online Learning Engagement",
      excerpt: "Exploring effective strategies to boost student engagement in virtual classrooms. From interactive assignments to collaborative projects, discover proven methods that enhance the learning experience...",
      author: {
        name: "Sarah Wilson",
        avatar: "https://creatie.ai/ai/api/search-image?query=A professional headshot of a female professional with a warm smile"
      },
      createdAt: "Posted 2 hours ago",
      tags: ["education", "online-learning", "teaching"],
      views: "2.4k",
      likes: "142",
      comments: "38"
    },
    {
      id: 2,
      title: "The Future of Educational Technology",
      excerpt: "Analyzing emerging trends in EdTech and their impact on modern education. From AI-powered learning tools to virtual reality classrooms, discover what's next in educational innovation...",
      author: {
        name: "Michael Chen",
        avatar: "https://creatie.ai/ai/api/search-image?query=A professional headshot of an Asian male professional"
      },
      createdAt: "Posted yesterday",
      tags: ["edtech", "innovation", "future"],
      views: "1.8k",
      likes: "98",
      comments: "24"
    }
  ];

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
    <>
      <main className="w-2/4 space-y-6">
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
            <div key={post.id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <img className="h-10 w-10 rounded-full" src={post.author.avatar} alt="" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{post.author.name}</p>
                      <p className="text-sm text-gray-500">{post.createdAt}</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-500">
                    <i className="fas fa-ellipsis-h"></i>
                  </button>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">{post.title}</h2>
                <p className="mt-2 text-gray-600">{post.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black bg-opacity-5 text-gray-900 hover:bg-opacity-10 transition-colors duration-200">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center space-x-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <i className="far fa-eye mr-1.5"></i>
                    <span>{post.views} views</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <i className="far fa-heart mr-1.5"></i>
                    <span>{post.likes} likes</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <i className="far fa-comment mr-1.5"></i>
                    <span>{post.comments} comments</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <aside className="w-1/4">
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
    </>
  );
}

export default HomePage; 