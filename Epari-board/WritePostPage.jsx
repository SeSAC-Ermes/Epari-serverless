// Excalidraw 저장 핸들러
const handleDrawingSave = async (imageBlob) => {
  try {
    const drawingId = `draw_${uuidv4()}`;
    const file = new File([imageBlob], `${drawingId}.png`, { type: 'image/png' });
    const uploadedUrl = await uploadToS3(file, 'drawings');

    // resources 데이터 업데이트
    setPostData(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        drawings: [
          ...(prev.resources?.drawings || []),
          {
            id: drawingId,
            url: uploadedUrl,
            uploadedAt: new Date().toISOString()
          }
        ]
      }
    }));

  } catch (error) {
    console.error('Error saving drawing:', error);
  }
}; 