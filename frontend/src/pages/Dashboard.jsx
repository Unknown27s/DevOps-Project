import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tasksAPI } from '../api';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';

const OPERATIONS = {
  uppercase: 'Uppercase',
  lowercase: 'Lowercase',
  reverse: 'Reverse',
  word_count: 'Word Count'
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchTasks = useCallback(async () => {
    try {
      const params = { page: pagination.page, limit: 20 };
      if (filter !== 'all') params.status = filter;
      const { data } = await tasksAPI.getAll(params);
      setTasks(data.tasks);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filter, pagination.page]);

  useEffect(() => {
    fetchTasks();
    // Poll for status updates every 5 seconds
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleCreateTask = async (taskData) => {
    try {
      await tasksAPI.create(taskData);
      toast.success('Task created! Processing will begin shortly.');
      setShowCreate(false);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create task');
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await tasksAPI.delete(id);
      toast.success('Task deleted');
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const handleRetryTask = async (id) => {
    try {
      await tasksAPI.retry(id);
      toast.success('Task re-queued for processing');
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      toast.error('Failed to retry task');
    }
  };

  const handleViewTask = async (id) => {
    try {
      const { data } = await tasksAPI.getById(id);
      setSelectedTask(data.task);
    } catch (err) {
      toast.error('Failed to load task details');
    }
  };

  // Stats
  const stats = {
    total: pagination.total,
    success: tasks.filter(t => t.status === 'success').length,
    pending: tasks.filter(t => t.status === 'pending' || t.status === 'running').length,
    failed: tasks.filter(t => t.status === 'failed').length
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="logo-icon">🤖</span>
          <h2>AI Tasks</h2>
        </div>

        <nav className="sidebar-nav">
          <button className="sidebar-link active">
            <span>📊</span> Dashboard
          </button>
          <button className="sidebar-link" onClick={() => setShowCreate(true)}>
            <span>➕</span> New Task
          </button>
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div className="user-info">
            <div className="user-name">{user.name || 'User'}</div>
            <div className="user-email">{user.email || ''}</div>
          </div>
          <button className="btn-icon" onClick={handleLogout} title="Logout">
            🚪
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="page-header">
          <h1>Dashboard</h1>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              ➕ New Task
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card accent">
            <div className="stat-label">Total Tasks</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card success">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{stats.success}</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-label">In Progress</div>
            <div className="stat-value">{stats.pending}</div>
          </div>
          <div className="stat-card error">
            <div className="stat-label">Failed</div>
            <div className="stat-value">{stats.failed}</div>
          </div>
        </div>

        {/* Task List */}
        <div className="task-list-header">
          <h2>Tasks</h2>
          <div className="filter-bar">
            {['all', 'pending', 'running', 'success', 'failed'].map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => { setFilter(f); setPagination(p => ({ ...p, page: 1 })); }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No tasks yet</h3>
            <p>Create your first AI task to get started</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Create Task
            </button>
          </div>
        ) : (
          <div className="task-list">
            {tasks.map(task => (
              <div key={task._id} className="task-card" onClick={() => handleViewTask(task._id)}>
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    <span className="task-operation">{OPERATIONS[task.operation] || task.operation}</span>
                    <span>{formatDate(task.createdAt)}</span>
                  </div>
                </div>
                <span className={`status-badge ${task.status}`}>
                  <span className="status-dot" />
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              ← Previous
            </button>
            <span style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateTask}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onDelete={handleDeleteTask}
          onRetry={handleRetryTask}
        />
      )}
    </div>
  );
}
