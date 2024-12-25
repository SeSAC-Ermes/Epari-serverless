import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import WritePostPage from './pages/WritePostPage';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout/>,
    children: [
      {
        index: true,
        element: <HomePage/>
      },
      {
        path: "posts/:postId",
        element: <PostDetailPage/>
      },
      {
        path: "write",
        element: <WritePostPage/>
      }
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});

function App() {
  console.log('App component rendering');
  return <RouterProvider router={router}/>;
}

export default App;
