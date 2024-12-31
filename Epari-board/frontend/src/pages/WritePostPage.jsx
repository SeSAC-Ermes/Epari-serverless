import { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import EditorTabs from '../components/editor/EditorTabs';
import '@toast-ui/editor/dist/toastui-editor.css';
import TinyEditor from '../components/editor/TinyEditor';
import ToastEditor from '../components/editor/ToastEditor';
import D3Editor from '../components/editor/D3Editor';
import { useLocation, useNavigate } from 'react-router-dom';
import defaultAvatar from '../assets/default-avatar.png';

function WritePostPage() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 상태 관리
  const [activeTab, setActiveTab] = useState('tiny');
  const [category, setCategory] = useState('ALL');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [editorContents, setEditorContents] = useState({
    tiny: '',
    toast: '',
    d3: ''
  });
  const [tempImages, setTempImages] = useState(new Map()); // 임시 이미지 저장소
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [post, setPost] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // 카테고리 목록
  const categories = [
    { value: 'ALL', label: '전체' },
    { value: 'MY', label: 'My 게시글' },
    { value: 'BACKEND', label: '백엔드' },
    { value: 'FRONTEND', label: '프론트엔드' },
    { value: 'AI', label: 'AI' },
    { value: 'DATA', label: 'DATA분석' },
    { value: 'INFRA', label: '인프라' }
  ];

  // 수정 모드 처리
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const editPostId = searchParams.get('edit');

    if (editPostId) {
      setIsEditMode(true);
      const fetchPost = async () => {
        try {
          const response = await fetch(`/api/posts/${editPostId}`);
          if (!response.ok) throw new Error('게시글 가져오기 실패');

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
          console.error('게시글 가져오기 오류:', error);
        }
      };
      fetchPost();
    }
  }, [location]);

  // 태그 입력 후 초기화
  useEffect(() => {
    setTagInput('');
  }, [tags.length]);

  // 임시 이미지 추가 핸들러
  const handleTempImageAdd = (fileName, blob) => {
    setTempImages(prev => new Map(prev.set(fileName, blob)));
  };

  // 게시글 저장 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !isMountedRef.current) return; // 언마운트된 경우 제출 방지

    try {
      setIsSubmitting(true);

      // HTML 파싱을 위한 DOMParser 생성
      const parser = new DOMParser();
      const doc = parser.parseFromString(editorContents[activeTab], 'text/html');

      // 모든 이미지 업로드 처리
      const uploadImages = async () => {
        if (!isMountedRef.current) return doc.body.innerHTML;

        const images = doc.querySelectorAll('img[data-filename]');
        console.log('images 배열:', images, images.length);

        for (const img of images) {
          if (!isMountedRef.current) break;

          const fileName = img.getAttribute('data-filename');
          const blob = tempImages.get(fileName);
          console.log('blob:', blob);

          if (blob) {
            try {
              // 1. presigned URL 요청
              console.log('presigned URL 요청:', fileName);
              const response = await fetch('/api/uploads/presigned-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fileType: '.png',
                  contentType: 'image/png',
                  key: fileName,
                  source: fileName.startsWith('drawings/') ? 'drawing' : 'image' // 파일명에 따라 source 설정
                })
              });
              console.log('presigned URL 응답:', response);
              if (!response.ok) {
                const errorData = await response.json(); // 에러 응답 내용 확인
                console.error('presigned URL 요청 실패:', response.status, errorData);
                throw new Error('Failed to get presigned URL');
              }

              const { uploadUrl } = await response.json();

              // 2. S3에 이미지 업로드
              console.log('S3 업로드 시작:', uploadUrl);
              const s3Response = await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': 'image/png' }
              });
              console.log('S3 업로드 응답:', s3Response);
              if (!s3Response.ok) {
                console.error('S3 업로드 실패:', s3Response.status);
                throw new Error('Failed to upload image to S3');
              }

              // 3. 업로드된 이미지 URL로 img 태그의 src 속성 업데이트
              const finalUrl = uploadUrl.split('?')[0];
              img.src = finalUrl;
              img.removeAttribute('data-filename');
            } catch (error) {
              console.error('이미지 업로드 실패:', error);
            }
          }
        }

        return doc.body.innerHTML;
      };

      // 모든 이미지를 업로드하고 최종 컨텐츠 생성
      console.log('uploadImages 함수 호출 전');
      const updatedContent = await uploadImages();
      console.log('uploadImages 함수 호출 후', updatedContent);

      // 게시글 데이터 준비
      const postData = {
        title,
        content: updatedContent,
        category,
        tags,
        editorType: activeTab,
        author: {
          id: "user123",
          name: "John Doe",
          avatar: defaultAvatar
        }
      };

      // API 엔드포인트와 메서드 결정
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode
          ? `/api/posts/${new URLSearchParams(location.search).get('edit')}`
          : '/api/posts';

      // 게시글 저장 요청
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (!response.ok) throw new Error('게시글 저장 실패');

      // 임시 저장소 비우기
      setTempImages(new Map());

      // 홈으로 이동
      navigate('/');
    } catch (error) {
      console.error(`게시글 ${isEditMode ? '수정' : '저장'} 오류:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 에디터 내용 변경 핸들러
  const handleContentChange = (content) => {
    setEditorContents(prev => ({
      ...prev,
      [activeTab]: content
    }));
  };

  // 에디터 타입 변경 핸들러
  const handleEditorChange = (newType) => {
    setActiveTab(newType);
  };

  // 취소 핸들러
  const handleCancel = () => {
    navigate('/');
  };

  // 태그 입력 핸들러
  const handleTagChange = (e) => {
    setTagInput(e.target.value);
  };

  // 태그 키 입력 핸들러
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

  // 한글 입력 완료 핸들러
  const handleCompositionEnd = (e) => {
    if (tagInput.includes(' ')) {
      const tag = tagInput.trim().replace(/#/g, '');
      if (tag && !tag.includes(' ') && !tags.includes(tag)) {
        setTags(prev => [...prev, tag]);
      }
      setTagInput('');
    }
  };

  // 태그 삭제 핸들러
  const removeTag = (e, indexToRemove) => {
    e.preventDefault();
    setTags(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // 에디터 렌더링 함수
  const renderEditor = () => {
    switch (activeTab) {
      case 'tiny':
        return <TinyEditor
            content={editorContents.tiny}
            onChange={handleContentChange}
            onTempImageAdd={handleTempImageAdd}
        />;
      case 'toast':
        return <ToastEditor
            content={editorContents.toast}
            onChange={handleContentChange}
            onImageUpload={(url) => {
            }}
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

  return (
      <main className="flex-1 space-y-6">
        <div className="bg-white shadow-sm rounded-xl p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6">
            {isEditMode ? '게시글 수정' : '새 게시글 작성'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 카테고리 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
              <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-0 py-2 border-0 border-b border-gray-200 focus:outline-none focus:border-black text-lg"
                  placeholder="제목을 입력하세요..."
              />
            </div>

            {/* 에디터 영역 */}
            <div className="editor-section border border-gray-200 rounded-lg overflow-hidden">
              <div className="border-b border-gray-200">
                <div className="flex justify-between items-center px-4">
                  <EditorTabs
                      activeTab={activeTab}
                      onTabChange={handleEditorChange}
                  />
                </div>
              </div>
              <div className="editors-container relative">
                {renderEditor()}
              </div>
            </div>

            {/* 태그 입력 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">태그</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100"
                    >
                  #{tag}
                      <button
                          type="button"
                          onClick={(e) => removeTag(e, index)}
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
                  placeholder="태그를 입력하고 스페이스바를 누르세요..."
              />
            </div>

            {/* 버튼 영역 */}
            <div className="flex justify-end space-x-4">
              <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-full"
              >
                취소
              </button>
              <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2.5 text-sm font-medium bg-black text-white rounded-full hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50"
              >
                {isSubmitting ?
                    '저장 중...' : (isEditMode ? '수정하기' : '발행하기')}
              </button>
            </div>
          </form>
        </div>
      </main>
  );
}

export default WritePostPage;
