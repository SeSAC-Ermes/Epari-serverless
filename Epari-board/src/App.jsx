import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import WritePostPage from './pages/WritePostPage';
import PostDetailPage from './pages/PostDetailPage';
import './App.css';
import './styles/editor.css';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout><HomePage /></Layout>
  },
  {
    path: "/write",
    element: <Layout><WritePostPage /></Layout>
  },
  {
    path: "/posts/:postId",
    element: <Layout><PostDetailPage /></Layout>
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});

function App() {
  return <RouterProvider router={router} />;
}

export default App;
