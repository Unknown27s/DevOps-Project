const OPERATIONS = {
  uppercase: 'Uppercase',
  lowercase: 'Lowercase',
  reverse: 'Reverse',
  word_count: 'Word Count'
};

export default function TaskDetailModal({ task, onClose, onDelete, onRetry }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const formatLogTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task.title}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Status & Operation */}
          <div className="detail-section">
            <div className="detail-grid">
              <div>
                <h3>Status</h3>
                <span className={`status-badge ${task.status}`}>
                  <span className="status-dot" />
                  {task.status}
                </span>
              </div>
              <div>
                <h3>Operation</h3>
                <div className="detail-value">
                  {OPERATIONS[task.operation] || task.operation}
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="detail-section">
            <div className="detail-grid">
              <div>
                <h3>Created</h3>
                <div className="detail-value">{formatDate(task.createdAt)}</div>
              </div>
              <div>
                <h3>Completed</h3>
                <div className="detail-value">{formatDate(task.completedAt)}</div>
              </div>
            </div>
          </div>

          {/* Input Text */}
          <div className="detail-section">
            <h3>Input Text</h3>
            <div className="result-box">{task.inputText}</div>
          </div>

          {/* Result */}
          {task.result && (
            <div className="detail-section">
              <h3>Result</h3>
              <div className="result-box" style={{
                borderColor: 'rgba(16, 185, 129, 0.3)',
                background: 'rgba(16, 185, 129, 0.05)'
              }}>
                {task.result}
              </div>
            </div>
          )}

          {/* Error */}
          {task.error && (
            <div className="detail-section">
              <h3>Error</h3>
              <div className="result-box" style={{
                borderColor: 'rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: '#ef4444'
              }}>
                {task.error}
              </div>
            </div>
          )}

          {/* Logs */}
          {task.logs && task.logs.length > 0 && (
            <div className="detail-section">
              <h3>Processing Logs</h3>
              <div className="log-list">
                {task.logs.map((log, i) => (
                  <div key={i} className={`log-entry ${log.level}`}>
                    <span className="log-time">{formatLogTime(log.timestamp)}</span>
                    <span className="log-msg">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {task.status === 'failed' && (
            <button className="btn btn-primary btn-sm" onClick={() => onRetry(task._id)}>
              🔄 Retry
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(task._id)}>
            🗑️ Delete
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
