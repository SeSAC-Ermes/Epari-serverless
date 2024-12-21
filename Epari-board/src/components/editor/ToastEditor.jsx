import { useEffect, useRef, useState } from 'react';
import '@toast-ui/editor/dist/toastui-editor.css';
import { Editor } from '@toast-ui/react-editor';
import { Excalidraw } from "@excalidraw/excalidraw";

function ToastEditor({ content, onChange }) {
  const editorRef = useRef(null);
  const [showDrawing, setShowDrawing] = useState(false);
  const [drawingData, setDrawingData] = useState(null);
  const toolbarInitialized = useRef(false);

  useEffect(() => {
    if (editorRef.current && content) {
      const editorInstance = editorRef.current.getInstance();
      editorInstance.setMarkdown(content);
    }
  }, [content]);

  useEffect(() => {
    if (editorRef.current && !toolbarInitialized.current) {
      toolbarInitialized.current = true;
      const editorInstance = editorRef.current.getInstance();
      editorInstance.insertToolbarItem({ groupIndex: 4, itemIndex: 0 }, {
        name: 'drawing',
        tooltip: 'Insert Drawing',
        className: 'drawing',
        text: 'Drawing',
        onClick: () => setShowDrawing(true)
      });
    }
  }, []);

  const handleChange = () => {
    if (editorRef.current) {
      const editorInstance = editorRef.current.getInstance();
      const markdown = editorInstance.getMarkdown();
      onChange(markdown);
    }
  };

  const handleDrawingChange = (elements, state) => {
    const data = {
      elements,
      appState: {
        ...state,
        collaborators: null,
        currentItemFontFamily: 0,
        selectedElementIds: {},
        width: undefined,
        height: undefined
      }
    };
    setDrawingData(data);
  };

  const handleDrawingSave = () => {
    if (drawingData && editorRef.current) {
      const editorInstance = editorRef.current.getInstance();
      const drawingContent = `\n\`\`\`excalidraw\n${JSON.stringify(drawingData)}\n\`\`\`\n`;
      editorInstance.insertText(drawingContent);
      setShowDrawing(false);
      setDrawingData(null);
    }
  };

  return (
    <>
      <div className="min-h-[400px]">
        <Editor
          ref={editorRef}
          initialValue={content || ''}
          previewStyle="vertical"
          height="400px"
          initialEditType="markdown"
          useCommandShortcut={true}
          onChange={handleChange}
          toolbarItems={[
            ['heading', 'bold', 'italic', 'strike'],
            ['hr', 'quote'],
            ['ul', 'ol', 'task', 'indent', 'outdent'],
            ['table', 'image', 'link'],
            ['code', 'codeblock']
          ]}
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
                      onClick={() => setShowDrawing(false)}
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
                    UIOptions={{
                      canvasActions: {
                        loadScene: false,
                        saveAsImage: false,
                        saveToActiveFile: false,
                        export: false,
                        toggleTheme: false,
                        clearCanvas: true
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ToastEditor; 