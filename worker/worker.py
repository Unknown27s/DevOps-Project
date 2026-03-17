import os
import json
import time
import signal
import sys
from datetime import datetime, timezone

import redis
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ──
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/ai-task-platform')
QUEUE_NAME = 'task_queue'

# ── Graceful Shutdown ──
running = True

def signal_handler(sig, frame):
    global running
    print(f"\n🛑 Received signal {sig}. Shutting down gracefully...")
    running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


# ── Task Operations ──
def process_uppercase(text):
    return text.upper()

def process_lowercase(text):
    return text.lower()

def process_reverse(text):
    return text[::-1]

def process_word_count(text):
    words = text.split()
    word_freq = {}
    for word in words:
        clean = word.strip('.,!?;:"\'()[]{}').lower()
        if clean:
            word_freq[clean] = word_freq.get(clean, 0) + 1

    result = {
        'total_words': len(words),
        'unique_words': len(word_freq),
        'characters': len(text),
        'characters_no_spaces': len(text.replace(' ', '')),
        'lines': text.count('\n') + 1,
        'top_words': dict(sorted(word_freq.items(), key=lambda x: x[-1], reverse=True)[:10])
    }
    return json.dumps(result, indent=2)

OPERATIONS = {
    'uppercase': process_uppercase,
    'lowercase': process_lowercase,
    'reverse': process_reverse,
    'word_count': process_word_count
}


def add_log(collection, task_id, message, level='info'):
    """Add a log entry to the task."""
    collection.update_one(
        {'_id': ObjectId(task_id)},
        {'$push': {'logs': {
            'timestamp': datetime.now(timezone.utc),
            'message': message,
            'level': level
        }}}
    )
    print(f"  [{level.upper()}] {message}")


def process_task(task_data, tasks_collection):
    """Process a single task from the queue."""
    task_id = task_data['taskId']
    operation = task_data['operation']
    input_text = task_data['inputText']

    print(f"\n🔧 Processing task {task_id} | Operation: {operation}")

    # Update status to 'running'
    tasks_collection.update_one(
        {'_id': ObjectId(task_id)},
        {
            '$set': {
                'status': 'running',
                'startedAt': datetime.now(timezone.utc)
            }
        }
    )
    add_log(tasks_collection, task_id, f'Worker picked up task. Operation: {operation}')

    try:
        # Validate operation
        if operation not in OPERATIONS:
            raise ValueError(f"Unknown operation: {operation}")

        # Simulate processing time (makes it feel more realistic)
        add_log(tasks_collection, task_id, 'Processing input text...')
        time.sleep(1)

        # Execute operation
        result = OPERATIONS[operation](input_text)
        add_log(tasks_collection, task_id, f'Operation "{operation}" completed successfully')

        # Update task with result
        tasks_collection.update_one(
            {'_id': ObjectId(task_id)},
            {
                '$set': {
                    'status': 'success',
                    'result': result,
                    'completedAt': datetime.now(timezone.utc)
                }
            }
        )
        add_log(tasks_collection, task_id, 'Task completed with status: success')
        print(f"  ✅ Task {task_id} completed successfully")

    except Exception as e:
        error_msg = str(e)
        tasks_collection.update_one(
            {'_id': ObjectId(task_id)},
            {
                '$set': {
                    'status': 'failed',
                    'error': error_msg,
                    'completedAt': datetime.now(timezone.utc)
                }
            }
        )
        add_log(tasks_collection, task_id, f'Task failed: {error_msg}', level='error')
        print(f"  ❌ Task {task_id} failed: {error_msg}")


def main():
    print("=" * 60)
    print("🐍 AI Task Worker Service")
    print("=" * 60)
    print(f"  Redis:   {REDIS_HOST}:{REDIS_PORT}")
    print(f"  MongoDB: {MONGODB_URI}")
    print(f"  Queue:   {QUEUE_NAME}")
    print("=" * 60)

    # Connect to Redis
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        decode_responses=True,
        socket_connect_timeout=5,
        retry_on_timeout=True
    )

    # Test Redis connection
    try:
        redis_client.ping()
        print("✅ Connected to Redis")
    except redis.ConnectionError as e:
        print(f"❌ Failed to connect to Redis: {e}")
        sys.exit(1)

    # Connect to MongoDB
    try:
        mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command('ping')
        db = mongo_client.get_database()
        tasks_collection = db['tasks']
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        sys.exit(1)

    print("\n⏳ Waiting for tasks...\n")

    while running:
        try:
            # BLPOP blocks until a job is available (timeout 5s for graceful shutdown check)
            result = redis_client.brpop(QUEUE_NAME, timeout=5)

            if result is None:
                continue

            _, job_data = result
            task_data = json.loads(job_data)
            process_task(task_data, tasks_collection)

        except redis.ConnectionError:
            print("⚠️  Redis connection lost. Retrying in 5 seconds...")
            time.sleep(5)
        except json.JSONDecodeError as e:
            print(f"⚠️  Invalid job data: {e}")
        except Exception as e:
            print(f"⚠️  Unexpected error: {e}")
            time.sleep(2)

    print("\n👋 Worker shut down gracefully.")
    mongo_client.close()


if __name__ == '__main__':
    main()
