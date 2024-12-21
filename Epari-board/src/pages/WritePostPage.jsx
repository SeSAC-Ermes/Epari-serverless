import { useState } from 'react';
import EditorTabs from '../components/editor/EditorTabs';
import ToastEditor from '../components/editor/ToastEditor';
import TinyEditor from '../components/editor/TinyEditor';

function WritePostPage() {
  const [activeTab, setActiveTab] = useState('tiny');
  const [category, setCategory] = useState('ALL');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  
  // 각 에디터별 content를 별도로 관리
  const [editorContents, setEditorContents] = useState({
    tiny: '',
    toast: ''
  });

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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({
      category,
      title,
      content: editorContents[activeTab],
      tags,
      editorType: activeTab
    });
  };

  const renderEditor = () => {
    switch (activeTab) {
      case 'toast':
        return <ToastEditor content={editorContents.toast} onChange={handleContentChange} />;
      case 'tiny':
        return <TinyEditor content={editorContents.tiny} onChange={handleContentChange} />;
      default:
        return null;
    }
  };

  return (
    <>
      <main className="w-2/4 space-y-6">
        <div className="bg-white shadow-sm rounded-xl p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6">Create New Post</h2>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 카테리 선택 */}
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

            {/* 제목 입력 */}
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
              <EditorTabs activeTab={activeTab} onTabChange={setActiveTab} />
              <div className="editors-container">
                {renderEditor()}
              </div>
            </div>

            {/* 태그 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <input 
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-0 py-2 border-0 border-b border-gray-200 focus:outline-none focus:border-black text-lg"
                placeholder="Add tags separated by commas..."
              />
            </div>

            {/* 버튼 그룹 */}
            <div className="flex justify-end space-x-4">
              <button 
                type="button"
                className="px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-full"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-8 py-2.5 text-sm font-medium bg-black text-white rounded-full hover:bg-gray-800 transition-colors duration-200"
              >
                Publish Post
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* 미리보기 사이드바 */}
      <aside className="w-1/4">
        <div className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Preview</h3>
            <button className="text-sm text-gray-600 hover:text-black flex items-center gap-2">
              <i className="fas fa-sync-alt"></i>
              Live
            </button>
          </div>
          <div className="prose max-w-none">
            {/* 미리보기 내용 */}
          </div>
        </div>
      </aside>
    </>
  );
}

export default WritePostPage; 