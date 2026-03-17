import { useState } from 'react';

const OPERATIONS = [
  { value: 'uppercase', label: '🔠 Uppercase', desc: 'Convert all text to UPPERCASE' },
  { value: 'lowercase', label: '🔡 Lowercase', desc: 'Convert all text to lowercase' },
  { value: 'reverse', label: '🔄 Reverse', desc: 'Reverse the entire string' },
  { value: 'word_count', label: '🔢 Word Count', desc: 'Count words, characters, and frequency' },
];

export default function CreateTaskModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    inputText: '',
    operation: 'uppercase'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onCreate(form);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✨ Create New Task</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="task-title">Task Title</label>
              <input
                id="task-title"
                type="text"
                placeholder="e.g., Process customer feedback"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-input">Input Text</label>
              <textarea
                id="task-input"
                placeholder="Enter the text you want to process..."
                value={form.inputText}
                onChange={(e) => setForm({ ...form, inputText: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-operation">Operation</label>
              <select
                id="task-operation"
                value={form.operation}
                onChange={(e) => setForm({ ...form, operation: e.target.value })}
              >
                {OPERATIONS.map(op => (
                  <option key={op.value} value={op.value}>
                    {op.label} — {op.desc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : '🚀 Create & Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
