import { useState, useEffect } from 'react';
import EditorTabs from '../components/editor/EditorTabs';
import TinyEditor from '../components/editor/TinyEditor';
import ToastEditor from '../components/editor/ToastEditor';
import D3Editor from '../components/editor/D3Editor';
import { v4 as uuidv4 } from 'uuid';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { useLocation, useNavigate } from 'react-router-dom';
import defaultAvatar from '../assets/default-avatar.png';

function WritePostPage() {
  const [activeTab, setActiveTab] = useState('tiny');
  const [category, setCategory] = useState('ALL');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  
  const [editorContents, setEditorContents] = useState({
    tiny: '',
    toast: '',
    d3: ''
  });

  const [uploadedImages, setUploadedImages] = useState([]);

  const [isEditMode, setIsEditMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const editPostId = searchParams.get('edit');
    
    if (editPostId) {
      setIsEditMode(true);
      const fetchPost = async () => {
        try {
          const response = await fetch(`/api/posts/${editPostId}`);
          if (!response.ok) throw new Error('Failed to fetch post');
          
          const data = await response.json();
          setPost(data);
          setTitle(data.title);
          setCategory(data.category);
          setTags(data.tags?.filter(tag => tag !== '#') || []);
          setEditorContents({
            ...editorContents,
            [data.editorType]: data.content
          });
          setActiveTab(data.editorType);
        } catch (error) {
          console.error('Error fetching post:', error);
        }
      };
      fetchPost();
    }
  }, [location]);

  useEffect(() => {
    setTagInput('');
  }, [tags.length]);

  const categories = [
    { value: 'ALL', label: '전체' },
    { value: 'MY', label: 'My 게시글' },
    { value: 'BACKEND', label: '백엔드' },
    { value: 'FRONTEND', label: '프론트엔드' },
    { value: 'AI', label: 'AI' },
    { value: 'DATA', label: 'DATA분석' },
    { value: 'INFRA', label: '인프라' }
  ];

  const handleContentChange = (content) => {
    setEditorContents(prev => ({
      ...prev,
      [activeTab]: content
    }));
  };

  const handleImageUpload = (imageUrl) => {
    setUploadedImages(prev => [...prev, imageUrl]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const extractImageUrls = (content) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const images = Array.from(doc.querySelectorAll('img'));
        return images.map(img => img.src);
      };

      const usedImages = extractImageUrls(editorContents[activeTab]);
      
      const unusedImages = uploadedImages.filter(url => !usedImages.includes(url));

      await Promise.all(unusedImages.map(async (imageUrl) => {
        const key = imageUrl.split('.com/')[1];
        const deleteCommand = new DeleteObjectCommand({
          Bucket: import.meta.env.VITE_AWS_BUCKET_NAME,
          Key: key
        });

        const s3Client = new S3Client({
          region: import.meta.env.VITE_AWS_REGION,
          credentials: {
            accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
            secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
          }
        });

        await s3Client.send(deleteCommand);
      }));

      const postData = {
        title,
        content: editorContents[activeTab],
        category,
        tags,
        editorType: activeTab,
        author: {
          id: "user123",
          name: "John Doe",
          avatar: defaultAvatar
        }
      };

      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode 
        ? `/api/posts/${new URLSearchParams(location.search).get('edit')}`
        : '/api/posts';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) throw new Error(`Failed to ${isEditMode ? 'update' : 'save'} post`);

      navigate('/');
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'saving'} post:`, error);
    }
  };

  const handleEditorChange = (newType) => {
    setActiveTab(newType);
  };

  const handleCancel = () => {
    if (isEditMode) {
      // 수정 모드일 때는 목록으로 이동
      navigate('/');
    } else {
      // 작성 모드일 때도 목록으로 이동
      navigate('/');
    }
  };

  const renderEditor = () => {
    switch (activeTab) {
      case 'toast':
        return <ToastEditor 
          content={editorContents.toast} 
          onChange={handleContentChange}
          onImageUpload={handleImageUpload}
        />;
      case 'tiny':
        return <TinyEditor 
          content={editorContents.tiny} 
          onChange={handleContentChange}
          onImageUpload={handleImageUpload}
        />;
      case 'd3':
        return <D3Editor 
          content={editorContents.d3}
          onChange={handleContentChange}
        />;
      default:
        return null;
    }
  };

  const handleTagChange = (e) => {
    const value = e.target.value;
    setTagInput(value);
  };

  const handleTagKeyDown = (e) => {
    if (e.key === ' ' || e.keyCode === 32) {
      e.preventDefault();
      
      const tag = tagInput.trim().replace(/#/g, '');
      
      if (tag && !tag.includes(' ') && !tags.includes(tag)) {
        setTags(prev => [...prev, tag]);
      }
      
      requestAnimationFrame(() => {
        setTagInput('');
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      e.preventDefault();
      setTags(prev => prev.slice(0, -1));
    }
  };

  const handleCompositionEnd = (e) => {
    if (tagInput.includes(' ')) {
      const tag = tagInput.trim().replace(/#/g, '');
      if (tag && !tag.includes(' ') && !tags.includes(tag)) {
        setTags(prev => [...prev, tag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (e, indexToRemove) => {
    e.preventDefault();
    setTags(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleTagsChange = (newTags) => {
    setPost(prev => ({
      ...prev,
      tags: newTags
    }));
  };

  const handleTagDelete = (indexToDelete) => {
    setPost(prev => ({
      ...prev,
      tags: prev.tags.filter((_, index) => index !== indexToDelete)
    }));
  };

  return (
    <main className="flex-1 space-y-6">
      <div className="bg-white shadow-sm rounded-xl p-8 mb-6">
        <h2 className="text-2xl font-semibold mb-6">
          {isEditMode ? 'Edit Post' : 'Create New Post'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 카테고리 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-0 py-2 border-0 border-b border-gray-200 focus:outline-none focus:border-black text-lg bg-transparent"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* 목 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-0 py-2 border-0 border-b border-gray-200 focus:outline-none focus:border-black text-lg"
              placeholder="Enter post title..."
            />
          </div>

          {/* 에디터 섹션 */}
          <div className="editor-section border border-gray-200 rounded-lg overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex justify-between items-center px-4">
                <EditorTabs 
                  activeTab={activeTab} 
                  onTabChange={handleEditorChange}
                />
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('d3');
                  }}
                  className="text-black px-4 py-2 rounded-full"
                >
                  D3 Editor
                </button>
              </div>
            </div>
            <div className="editors-container relative">
              {renderEditor()}
            </div>
          </div>

          {/* 태그 입력 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100"
                >
                  #{tag}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeTag(e, index);
                    }}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input 
              type="text"
              value={tagInput}
              onChange={handleTagChange}
              onKeyDown={handleTagKeyDown}
              onCompositionEnd={handleCompositionEnd}
              className="w-full px-0 py-2 border-0 border-b border-gray-200 focus:outline-none focus:border-black text-lg"
              placeholder="Add tags with #, press space to add..."
            />
          </div>

          {/* 버튼 그룹 */}
          <div className="flex justify-end space-x-4">
            <button 
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-full"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-8 py-2.5 text-sm font-medium bg-black text-white rounded-full hover:bg-gray-800 transition-colors duration-200"
            >
              {isEditMode ? 'Update Post' : 'Publish Post'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default WritePostPage; 