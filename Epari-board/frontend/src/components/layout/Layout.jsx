import Navbar from './Navbar';
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar';
import defaultAvatar from '../../assets/default-avatar.png';

function Layout({ children }) {
  return (
    <>
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-9xl mx-auto">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <img className="h-8 w-auto" src="https://ai-public.creatie.ai/gen_page/logo_placeholder.png" alt="Logo"/>
              </div>
            </div>
            <div className="flex items-center">
              <div className="ml-4 flex items-center">
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <i className="far fa-bell text-xl"></i>
                </button>
                <div className="ml-3 relative">
                  <div className="flex items-center">
                    <img className="h-8 w-8 rounded-full" src={defaultAvatar} alt="Profile"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-9xl mx-auto py-6">
        <div className="flex space-x-8">
          <div className="w-1/6">
            <Sidebar />
          </div>
          <div className="flex-1">
            {children}
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}

export default Layout; 
