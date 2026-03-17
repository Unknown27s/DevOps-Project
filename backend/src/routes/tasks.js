const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const { pushToQueue } = require('../utils/redis');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/tasks — List user's tasks
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { userId: req.userId };
    if (status) query.status = status;

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-logs');

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// GET /api/tasks/:id — Get task details with logs
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task.' });
  }
});

// POST /api/tasks — Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, inputText, operation } = req.body;

    if (!title || !inputText || !operation) {
      return res.status(400).json({ error: 'Title, inputText, and operation are required.' });
    }

    const validOps = ['uppercase', 'lowercase', 'reverse', 'word_count'];
    if (!validOps.includes(operation)) {
      return res.status(400).json({
        error: `Invalid operation. Must be one of: ${validOps.join(', ')}`
      });
    }

    const task = new Task({
      userId: req.userId,
      title,
      inputText,
      operation,
      status: 'pending',
      logs: [{ message: 'Task created with status: pending', level: 'info' }]
    });

    await task.save();

    // Push to Redis queue for worker processing
    try {
      await pushToQueue('task_queue', {
        taskId: task._id.toString(),
        operation: task.operation,
        inputText: task.inputText
      });
      task.logs.push({ message: 'Task pushed to processing queue', level: 'info' });
      await task.save();
    } catch (queueError) {
      // If Redis fails, mark task as failed
      task.status = 'failed';
      task.error = 'Failed to queue task. Please try again.';
      task.logs.push({ message: `Queue error: ${queueError.message}`, level: 'error' });
      await task.save();
      console.error('Queue error:', queueError);
    }

    res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// DELETE /api/tasks/:id — Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// POST /api/tasks/:id/retry — Retry a failed task
router.post('/:id/retry', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    if (task.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed tasks can be retried.' });
    }

    task.status = 'pending';
    task.result = null;
    task.error = null;
    task.startedAt = null;
    task.completedAt = null;
    task.logs.push({ message: 'Task retry initiated', level: 'info' });
    await task.save();

    await pushToQueue('task_queue', {
      taskId: task._id.toString(),
      operation: task.operation,
      inputText: task.inputText
    });

    task.logs.push({ message: 'Task re-queued for processing', level: 'info' });
    await task.save();

    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retry task.' });
  }
});

module.exports = router;
