const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: 200
  },
  inputText: {
    type: String,
    required: [true, 'Input text is required'],
    maxlength: 10000
  },
  operation: {
    type: String,
    required: [true, 'Operation is required'],
    enum: ['uppercase', 'lowercase', 'reverse', 'word_count']
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed'],
    default: 'pending',
    index: true
  },
  result: {
    type: String,
    default: null
  },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    message: String,
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' }
  }],
  startedAt: Date,
  completedAt: Date,
  error: String
}, {
  timestamps: true
});

// ── Compound Indexes for performance ──
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
