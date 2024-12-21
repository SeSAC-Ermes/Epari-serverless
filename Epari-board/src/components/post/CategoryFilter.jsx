import { withRouter } from 'react-router-dom';

function CategoryFilter({ selectedCategory, onCategoryChange, history }) {
  const categories = [
    { id: 'all', name: 'All' },
    { id: 'backend', name: 'Backend' },
    { id: 'frontend', name: 'Frontend' },
    { id: 'ai', name: 'AI' },
    { id: 'design', name: 'Design' },
    { id: 'marketing', name: 'Marketing' }
  ];

  return (
    <div className="flex items-center mb-6">
      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-4 py-2 text-sm font-medium ${
            category.id === selectedCategory
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-black hover:border-b-2 hover:border-black transition-colors duration-200'
          }`}
        >
          {category.name}
        </button>
      ))}
      <button 
        onClick={() => history.push('/write')}
        className="ml-auto px-4 py-2 text-sm font-medium bg-black text-white rounded-full hover:bg-gray-800 transition-colors duration-200"
      >
        + New Post
      </button>
    </div>
  );
}

export default withRouter(CategoryFilter); 