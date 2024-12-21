function EditorTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'tiny', label: 'Rich Text' },
    { id: 'toast', label: 'Markdown' }
  ];

  return (
    <div className="tab-container flex space-x-4 mb-4 border-b border-gray-200">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`tab-button px-4 py-2 text-sm font-medium ${
            activeTab === tab.id
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-black hover:border-b-2 hover:border-black transition-colors duration-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default EditorTabs; 