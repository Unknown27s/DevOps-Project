# Architecture Document — AI Task Processing Platform

## 1. System Overview

The AI Task Processing Platform is a distributed system built with microservices architecture. It processes text-based AI operations asynchronously through a message queue pattern.

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend API    │────▶│    Redis     │
│  (React/Nginx│     │ (Express/Node)   │     │   (Queue)    │
└──────────────┘     └──────┬───────────┘     └──────┬───────┘
                            │                         │
                            │                         ▼
                     ┌──────▼───────────┐     ┌──────────────┐
                     │    MongoDB       │◀────│   Worker(s)  │
                     │   (Database)     │     │  (Python)    │
                     └──────────────────┘     └──────────────┘
```

**Request Flow:**
1. User creates a task via the frontend.
2. Backend validates request, creates a task record with status `pending`, and pushes a job to Redis.
3. Worker picks up the job via `BRPOP` (blocking pop), sets status to `running`.
4. Worker executes the operation and updates task to `success` or `failed` with result/logs.
5. Frontend polls every 5 seconds to reflect status changes.

---

## 2. Worker Scaling Strategy

### Horizontal Pod Autoscaler (HPA)
Workers are stateless — each instance listens to the same Redis queue using `BRPOP`. Redis ensures each job is delivered to exactly one worker (atomic pop).

```yaml
minReplicas: 2      # Always-on baseline
maxReplicas: 10     # Scale up under load
targetCPU: 70%      # Scale trigger
```

### Why it works:
- **No shared state**: Workers are independent; they only need Redis + MongoDB connectivity.
- **Competing consumers**: Multiple workers call `BRPOP` on the same queue. Redis guarantees only one worker receives each job.
- **Graceful shutdown**: Workers handle `SIGTERM` to finish current task before exiting, preventing job loss during scale-down.

---

## 3. Handling High Volume (100k tasks/day)

### 100k tasks/day ≈ ~1.15 tasks/second (average), bursts up to 10-50 tasks/second

| Component | Strategy |
|-----------|----------|
| **Backend API** | 2+ replicas behind load balancer. Each handles ~500 req/s. Stateless, scales horizontally. |
| **Redis Queue** | Single Redis handles ~100k ops/s easily. Add Redis Sentinel for HA. For extreme scale, use Redis Cluster with multiple queue shards. |
| **Workers** | HPA: 2-10 replicas. Each worker processes ~1 task/s (with 1s simulated delay). 10 workers = 10 tasks/s = 864k/day capacity. Remove delay for ~100x throughput. |
| **MongoDB** | With proper indexes, handles 100k writes/day trivially. Add read replicas for read-heavy workloads. |
| **Frontend** | Static assets served by Nginx CDN. No scaling concerns. |

### Bottleneck Analysis:
- At 100k/day, the bottleneck is the worker processing time. With the 1s simulated delay, 2 workers handle ~172k tasks/day. Without delay, throughput increases to millions/day.
- MongoDB write concern can be relaxed to `w:1` (from `w:majority`) for higher throughput if some durability trade-off is acceptable.

---

## 4. Database Indexing Strategy

```javascript
// User collection
{ email: 1 }                    // Login lookup

// Task collection
{ userId: 1, createdAt: -1 }    // User's task list (most recent first)
{ status: 1, createdAt: -1 }    // Filter by status
{ userId: 1, status: 1 }        // User's tasks filtered by status
```

### Rationale:
- **Compound indexes** cover the most common query patterns (user dashboard, status filtering).
- **Descending `createdAt`** optimizes "most recent first" sorting without in-memory sort.
- Status field has low cardinality (4 values), so it's placed second in compound indexes to leverage index prefix compression.

---

## 5. Handling Redis Failure

### Failure Scenario: Redis is unavailable

| Layer | Behavior |
|-------|----------|
| **Backend (task creation)** | Catches Redis push error → marks task as `failed` with error message "Failed to queue task" → returns error response to user. Task is persisted in MongoDB so user can retry. |
| **Worker** | Catches `ConnectionError` → logs warning → retries connection every 5 seconds. Worker stays alive and auto-recovers when Redis comes back. |
| **Data safety** | Task records exist in MongoDB regardless of Redis state. No data loss. Redis is used only as a transient queue, not as source of truth. |

### Recovery:
- User can manually retry any `failed` task via the UI (clicks "Retry").
- Worker auto-reconnects when Redis recovers — no manual intervention needed.

### Production hardening:
- Use **Redis Sentinel** for automatic failover (master-slave).
- Enable **Redis AOF persistence** to survive Redis restarts without losing queued jobs.
- Add a dead-letter queue for jobs that fail processing 3+ times.

---

## 6. Staging and Production Deployment

### Two-environment strategy using Kubernetes namespaces:

```
Cluster
├── ai-task-staging     (namespace)
│   ├── Lower resource limits
│   ├── Single replica per service
│   └── Staging secrets (separate MongoDB/Redis)
│
└── ai-task-production  (namespace)
    ├── Higher resource limits
    ├── Multiple replicas + HPA
    └── Production secrets
```

### Git branch strategy:
- `main` branch → auto-deploys to **staging** via Argo CD
- Git tag (e.g., `v1.2.0`) → promotes to **production** via Argo CD

### Argo CD manages both:
```yaml
# staging-app.yaml → watches main branch
# production-app.yaml → watches release tags
```

### Deployment process:
1. Developer pushes to `main`
2. CI/CD builds images, pushes to registry, updates infra repo
3. Argo CD detects changes → syncs **staging**
4. QA validates on staging
5. Create Git tag → Argo CD syncs **production**
