import Navbar from './Navbar';
import Sidebar from './Sidebar';

function Layout({ children }) {
  return (
    <>
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <img className="h-8 w-auto" src="https://ai-public.creatie.ai/gen_page/logo_placeholder.png" alt="Logo"/>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a href="#" className="border-custom text-custom inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">Board</a>
                <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">Blog</a>
              </div>
            </div>
            <div className="flex items-center">
              <div className="ml-4 flex items-center">
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <i className="far fa-bell text-xl"></i>
                </button>
                <div className="ml-3 relative">
                  <div className="flex items-center">
                    <img className="h-8 w-8 rounded-full" src="https://creatie.ai/ai/api/search-image?query=A professional headshot" alt="Profile"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-8">
          <div className="w-1/4">
            <nav className="space-y-1">
              <a href="#" className="bg-black bg-opacity-5 text-gray-900 group flex items-center px-3 py-2 text-sm font-medium rounded-full">
                <i className="fas fa-clipboard-list w-6"></i>
                <span className="truncate">Board</span>
              </a>
              <a href="#" className="text-gray-600 hover:bg-black hover:bg-opacity-5 group flex items-center px-3 py-2 text-sm font-medium rounded-full transition-colors duration-200">
                <i className="fas fa-blog w-6"></i>
                <span className="truncate">Blog</span>
              </a>
            </nav>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

export default Layout; 