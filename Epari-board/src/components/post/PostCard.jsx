function PostCard({ post }) {
  return (
    <div className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl divide-y divide-gray-100">
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
            <span 
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black bg-opacity-5 text-gray-900 hover:bg-opacity-10 transition-colors duration-200"
            >
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
  );
}

export default PostCard; 