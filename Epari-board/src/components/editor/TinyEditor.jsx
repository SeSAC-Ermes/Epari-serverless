import { useRef, useState, useCallback } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Excalidraw, exportToCanvas } from "@excalidraw/excalidraw";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

function TinyEditor({ content, onChange }) {
  const editorRef = useRef(null);
  const [showDrawing, setShowDrawing] = useState(false);
  const [drawingData, setDrawingData] = useState(null);
  const [showCarbon, setShowCarbon] = useState(false);
  const [carbonCode, setCarbonCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDrawingChange = useCallback((elements, state) => {
    setDrawingData({
      elements,
      appState: {
        ...state,
        collaborators: null,
        currentItemFontFamily: 0,
        selectedElementIds: {},
        width: undefined,
        height: undefined
      }
    });
  }, []);

  const handleDrawingSave = async () => {
    if (drawingData && editorRef.current) {
      try {
        // 그림을 캔버스로 변환
        const canvas = await exportToCanvas({
          elements: drawingData.elements,
          appState: drawingData.appState,
          files: null,
        });

        // 캔버스를 Blob으로 변환
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // S3 클라이언트 생성
        const s3Client = new S3Client({
          region: import.meta.env.VITE_AWS_REGION,
          credentials: {
            accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
            secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
          }
        });

        // 파일 이름 생성 (UUID 사용)
        const fileName = `drawings/${uuidv4()}.png`;

        // S3에 업로드
        await s3Client.send(new PutObjectCommand({
          Bucket: import.meta.env.VITE_AWS_BUCKET_NAME,
          Key: fileName,
          Body: blob,
          ContentType: 'image/png'
        }));

        // S3 URL 생성
        const imageUrl = `https://${import.meta.env.VITE_AWS_BUCKET_NAME}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${fileName}`;
        
        // 에디터에 이미지 삽입
        editorRef.current.execCommand('mceInsertContent', false, `<img src="${imageUrl}" alt="drawing" />`);
        
        setShowDrawing(false);
        setDrawingData(null);
      } catch (error) {
        console.error('Failed to save drawing:', error);
      }
    }
  };

  const handleCarbonSave = async () => {
    if (carbonCode && editorRef.current) {
      try {
        setIsLoading(true);  // 로딩 시작
        const response = await fetch('/api/carbon/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: carbonCode })
        });

        if (!response.ok) throw new Error('Failed to generate carbon image');
        
        const { url } = await response.json();
        editorRef.current.execCommand('mceInsertContent', false, `<img src="${url}" alt="code" />`);
        
        setShowCarbon(false);
        setCarbonCode('');
      } catch (error) {
        console.error('Failed to save code:', error);
      } finally {
        setIsLoading(false);  // 로딩 종료
      }
    }
  };

  const handleInit = (evt, editor) => {
    editorRef.current = editor;
    editor.ui.registry.addButton('drawing', {
      text: 'Drawing',
      tooltip: 'Insert Drawing',
      onAction: () => setShowDrawing(true)
    });
    editor.ui.registry.addButton('carbon', {
      text: 'Carbon',
      tooltip: 'Insert Code with Carbon',
      onAction: () => setShowCarbon(true)
    });
  };

  return (
    <>
      <div className="min-h-[400px]">
        <Editor
          apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
          onInit={handleInit}
          value={content}
          init={{
            height: 400,
            menubar: false,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
              'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | drawing carbon | ' +
              'blocks | bold italic forecolor | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'removeformat | help',
            content_style: 'body { font-family:Inter,Arial,sans-serif; font-size:14px }'
          }}
          onEditorChange={onChange}
        />
      </div>

      {showDrawing && (
        <div 
          className="fixed inset-0 z-[9999] overflow-y-auto"
          aria-labelledby="modal-title" 
          role="dialog" 
          aria-modal="true"
        >
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDrawing(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-[900px] sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Drawing</h3>
                  <div className="space-x-2">
                    <button 
                      onClick={handleDrawingSave}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => {
                        setShowDrawing(false);
                        setDrawingData(null);
                      }}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div style={{ height: "500px", width: "100%" }}>
                  <Excalidraw
                    onChange={handleDrawingChange}
                    theme="light"
                    gridModeEnabled={false}
                    zenModeEnabled={false}
                    viewModeEnabled={false}
                    initialData={{
                      elements: [],
                      appState: {
                        viewBackgroundColor: "#ffffff"
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCarbon && (
        <div 
          className="fixed inset-0 z-[9999] overflow-y-auto"
          aria-labelledby="modal-title" 
          role="dialog" 
          aria-modal="true"
        >
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCarbon(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-[900px] sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Insert Code</h3>
                  <div className="space-x-2">
                    <button 
                      onClick={handleCarbonSave}
                      disabled={isLoading}
                      className={`px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </span>
                      ) : 'Insert'}
                    </button>
                    <button 
                      onClick={() => {
                        setShowCarbon(false);
                        setCarbonCode('');
                      }}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <textarea
                  value={carbonCode}
                  onChange={(e) => setCarbonCode(e.target.value)}
                  className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
                  placeholder="Paste your code here..."
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TinyEditor; 