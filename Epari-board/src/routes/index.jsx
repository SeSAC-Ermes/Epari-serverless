import { BrowserRouter, Route, Switch } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import HomePage from '../pages/HomePage';
import PostDetailPage from '../pages/PostDetailPage';
import WritePostPage from '../pages/WritePostPage';

function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <Switch>
          <Route exact path="/" component={HomePage} />
          <Route path="/post/:id" component={PostDetailPage} />
          <Route path="/write" component={WritePostPage} />
        </Switch>
      </Layout>
    </BrowserRouter>
  );
}

export default AppRouter; 