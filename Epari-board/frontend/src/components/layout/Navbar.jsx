function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <img 
                className="h-8 w-auto" 
                src="https://ai-public.creatie.ai/gen_page/logo_placeholder.png" 
                alt="Logo"
              />
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-4 flex items-center">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <i className="far fa-bell text-xl"></i>
              </button>
              <div className="ml-3 relative">
                <div className="flex items-center">
                  <img 
                    className="h-8 w-8 rounded-full" 
                    src="https://creatie.ai/ai/api/search-image?query=A professional headshot" 
                    alt="Profile"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 