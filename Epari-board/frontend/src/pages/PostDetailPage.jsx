import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CommentItem from '../components/comment/CommentItem';
import defaultAvatar from '../assets/default-avatar.png';
import TrendingPosts from "../components/post/TrendingPosts";
import PopularTags from "../components/tags/PopularTags";

function PostDetailPage() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [liked, setLiked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        console.log('Fetching post with ID:', postId);

        const response = await fetch(`/api/posts/${postId}`);
        console.log('Response status:', response.status);

        if (!response.ok) {
          throw new Error('Failed to fetch post');
        }

        const data = await response.json();
        setPost(data)
        console.log('Fetched post data:', data);

        setPost(data);
        setLiked(data.likedUsers?.includes("user123") || false);
      } catch (error) {
        console.error('Error fetching post:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: 'user123' }) // 현재는 하드코딩된 userId 사용
      });
      if (!response.ok) throw new Error('Failed to like post');

      const data = await response.json();
      setPost(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          likes: data.likes
        }
      }));
      setLiked(!liked);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: comment,
          author: {
            id: 'user123',
            name: 'John Doe',
            avatar: defaultAvatar
          }
        })
      });

      if (!response.ok) throw new Error('Failed to add comment');

      const newComment = await response.json();

      setPost(prev => {
        const updatedComments = [...(prev.comments || [])];
        updatedComments.unshift(newComment);  // 새 댓글을 배열 앞에 추가

        return {
          ...prev,
          comments: updatedComments,
          metadata: {
            ...prev.metadata,
            commentsCount: updatedComments.length
          }
        };
      });

      setComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleCommentUpdate = async (commentId, content) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) throw new Error('Failed to update comment');

      const updatedComment = await response.json();
      setPost(prev => ({
        ...prev,
        comments: prev.comments.map(c =>
            c.id === commentId ? updatedComment : c
        )
      }));
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleCommentDelete = async (commentId) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      setPost(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId),
        metadata: {
          ...prev.metadata,
          commentsCount: prev.metadata.commentsCount - 1
        }
      }));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleEdit = () => {
    navigate(`/write?edit=${postId}`);
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete post');
      navigate('/');
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const renderContent = (content) => {
    const chartRegex = /```chart\n([\s\S]*?)```/g;
    let processedContent = content;
    let match;

    while ((match = chartRegex.exec(content)) !== null) {
      try {
        const chartData = JSON.parse(match[1]);
        const container = document.createElement('div');
        const chartPlugin = new D3ChartPlugin();
        chartPlugin.initChart(container, chartData.type, chartData.data);

        processedContent = processedContent.replace(match[0], container.outerHTML);
      } catch (error) {
        console.error('Failed to render chart:', error);
      }
    }

    return processedContent;
  };

  if (loading) return <div>Loading post...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!post) return <div>Post not found</div>;

  return (
      <div className="flex space-x-8">
        <main className="flex-1">
          <article className="bg-white shadow-sm rounded-xl p-8">
            <div className="mb-6">
              <button
                  onClick={() => navigate('/')}
                  className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to List
              </button>
            </div>

            <header className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                      src={defaultAvatar}
                      alt={post.author.name}
                      className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <h3 className="text-lg font-medium">{post.author.name}</h3>
                    <time className="text-sm text-gray-500">
                      {new Date(post.metadata.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                </div>
                {post.author.id === "user123" && (  // 작성자만 볼 수 있음
                    <div className="flex space-x-2">
                      <button
                          onClick={handleEdit}
                          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                          onClick={handleDelete}
                          className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
              <div className="flex flex-wrap gap-2">
                {post.tags?.filter(tag => tag !== '#').map(tag => (
                    <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-sm rounded-full"
                    >
                  #{tag}
                </span>
                ))}
              </div>
            </header>

            <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
            />

            <footer className="mt-8 pt-8 border-t">
              <div className="flex items-center justify-between">
                <div className="flex space-x-4 text-sm text-gray-500">
                  <span><i className="far fa-eye mr-1"></i>{post.metadata.views} views</span>
                  <button
                      onClick={handleLike}
                      className={`flex items-center space-x-1 ${liked ? 'text-red-500' : ''}`}
                  >
                    <i className={`${liked ? 'fas' : 'far'} fa-heart`}></i>
                    <span>{post.metadata.likes} likes</span>
                  </button>
                  <span><i className="far fa-comment mr-1"></i>{post.metadata.commentsCount} comments</span>
                </div>
              </div>

              {/* 댓글 션 */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Comments</h3>
                <form onSubmit={handleComment} className="mb-6">
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:border-black resize-none"
                    rows="3"
                />
                  <div className="mt-2 flex justify-end">
                    <button
                        type="submit"
                        className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800"
                    >
                      Post Comment
                    </button>
                  </div>
                </form>
                {/* 댓글 목록 */}
                <div className="space-y-4">
                  {post.comments?.map(comment => (
                      <CommentItem
                          key={comment.id}
                          comment={comment}
                          onUpdate={handleCommentUpdate}
                          onDelete={handleCommentDelete}
                          currentUserId="user123"
                      />
                  ))}
                </div>
              </div>
            </footer>
          </article>
        </main>

        <aside className="w-80">
          <div className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
            <PopularTags/>
          </div>

          <div className="mt-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900">Trending Posts</h3>
            <div className="mt-4">
              <TrendingPosts/>
            </div>
          </div>
        </aside>
      </div>
  );
}

export default PostDetailPage; 
