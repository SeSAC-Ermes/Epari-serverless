function Sidebar() {
  return (
    <div className="w-1/4">
      <nav className="space-y-1">
        <a 
          href="#" 
          className="bg-black bg-opacity-5 text-gray-900 group flex items-center px-3 py-2 text-sm font-medium rounded-full"
        >
          <i className="fas fa-clipboard-list w-6"></i>
          <span className="truncate">Board</span>
        </a>
        <a 
          href="#" 
          className="text-gray-600 hover:bg-black hover:bg-opacity-5 group flex items-center px-3 py-2 text-sm font-medium rounded-full transition-colors duration-200"
        >
          <i className="fas fa-blog w-6"></i>
          <span className="truncate">Blog</span>
        </a>
      </nav>
    </div>
  );
}

export default Sidebar; 