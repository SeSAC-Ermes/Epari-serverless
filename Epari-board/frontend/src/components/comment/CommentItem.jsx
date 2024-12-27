import React, { useState } from 'react';

function CommentItem({ comment, onUpdate, onDelete, currentUserId }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isAuthor = currentUserId === comment.author.id;

  const handleUpdate = async () => {
    if (!editContent.trim()) return;
    await onUpdate(comment.id, editContent);
    setIsEditing(false);
  };

  return (
    <div className="flex space-x-3 p-4 bg-gray-50 rounded-lg">
      <img 
        src={comment.author.avatar} 
        alt={comment.author.name}
        className="w-8 h-8 rounded-full"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">{comment.author.name}</h4>
          <div className="flex items-center space-x-2">
            <time className="text-xs text-gray-500">
              {new Date(comment.createdAt).toLocaleDateString()}
            </time>
            {isAuthor && (
              <div className="flex space-x-2">
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                <button 
                  onClick={() => onDelete(comment.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:border-black"
              rows="3"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleUpdate}
                className="px-3 py-1 bg-black text-white text-sm rounded-full hover:bg-gray-800"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-gray-600">{comment.content}</p>
        )}
      </div>
    </div>
  );
}

export default CommentItem; 