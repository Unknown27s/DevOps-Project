# AI Task Processing Platform

> A production-ready, full-stack AI task processing system with MERN stack, Python worker, Docker, Kubernetes, Argo CD (GitOps), and CI/CD.

![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Orchestrated-326CE5)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF)

## 📋 Features

- **User Authentication**: Register/Login with JWT tokens
- **Task Management**: Create, view, delete, and retry AI tasks
- **Async Processing**: Background worker with Redis queue
- **Operations**: Uppercase, Lowercase, Reverse String, Word Count
- **Real-time Status**: Auto-polling for task status updates
- **Task Logs**: Detailed processing logs for each task
- **Security**: Helmet, CORS, Rate Limiting, bcrypt password hashing

## 🏗️ Architecture

| Service | Tech | Port |
|---------|------|------|
| Frontend | React + Vite + Nginx | 3000 (dev) / 80 (prod) |
| Backend API | Node.js + Express | 5000 |
| Worker | Python 3.12 | — (background) |
| Database | MongoDB 7 | 27017 |
| Queue | Redis 7 | 6379 |

## 🚀 Quick Start (Docker Compose)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose installed

### Run locally
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ai-task-platform.git
cd ai-task-platform

# Start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api/health
```

### Stop services
```bash
docker-compose down
# To also remove volumes:
docker-compose down -v
```

## 💻 Local Development (Without Docker)

### 1. Start MongoDB and Redis
```bash
# Using Docker for databases only
docker run -d --name mongodb -p 27017:27017 mongo:7
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI=mongodb://localhost:27017/ai-task-platform
npm install
npm run dev
```

### 3. Worker
```bash
cd worker
cp .env.example .env
# Edit .env: set MONGODB_URI=mongodb://localhost:27017/ai-task-platform, REDIS_HOST=localhost
pip install -r requirements.txt
python worker.py
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (k3s, minikube, or cloud)
- kubectl configured
- NGINX Ingress Controller installed

### Deploy
```bash
# Apply all manifests
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/configmap.yaml
kubectl apply -f infra/k8s/secrets.yaml
kubectl apply -f infra/k8s/mongodb.yaml
kubectl apply -f infra/k8s/redis.yaml
kubectl apply -f infra/k8s/backend.yaml
kubectl apply -f infra/k8s/frontend.yaml
kubectl apply -f infra/k8s/worker.yaml
kubectl apply -f infra/k8s/ingress.yaml

# Verify
kubectl get all -n ai-task-platform
```

### Scale Workers
```bash
kubectl scale deployment worker -n ai-task-platform --replicas=5
```

## 🔄 Argo CD Setup

### 1. Install Argo CD
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Access: https://localhost:8080 (user: admin)
```

### 2. Create Application
```bash
kubectl apply -f infra/argocd/application.yaml
```

### 3. Auto-sync
The application is configured with `automated` sync policy — changes to the infra repo will auto-deploy.

## 🔧 CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci-cd.yml`):

```
Push to main → Lint → Build Docker Images → Push to Registry → Update Infra Repo → Argo CD Auto-sync
```

### Required GitHub Secrets:
| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token |
| `INFRA_REPO_TOKEN` | GitHub PAT with repo access |

## 🆓 Free Deployment Guide

You can deploy this entire platform for **$0** using free tiers:

### Option A: Managed Services (Easiest)

| Component | Provider | Free Tier |
|-----------|----------|-----------|
| Frontend | [Vercel](https://vercel.com) | Unlimited deploys |
| Backend | [Render.com](https://render.com) | 750 hrs/month |
| Worker | [Render.com](https://render.com) | Background worker |
| MongoDB | [MongoDB Atlas](https://www.mongodb.com/atlas) | 512MB M0 cluster |
| Redis | [Upstash](https://upstash.com) | 10k commands/day |
| CI/CD | GitHub Actions | Unlimited (public repos) |

**Steps:**
1. Create MongoDB Atlas cluster (free M0) → get connection string
2. Create Upstash Redis → get host/port/password
3. Deploy backend to Render.com as a Web Service → set env vars
4. Deploy worker to Render.com as a Background Worker → set env vars
5. Deploy frontend to Vercel → set `VITE_API_URL` to Render backend URL
6. Set up GitHub Actions with Docker Hub credentials

### Option B: Full Kubernetes (Advanced)

| Component | Provider | Free Tier |
|-----------|----------|-----------|
| K8s Cluster | [Oracle Cloud](https://www.oracle.com/cloud/free/) | 4 ARM A1 instances (Always Free) |
| Container Registry | Docker Hub | Unlimited public repos |

**Steps:**
1. Sign up for Oracle Cloud Free Tier
2. Create 4 ARM A1 instances (24GB RAM, 4 OCPUs total)
3. Install k3s on the instances
4. Install NGINX Ingress Controller
5. Install Argo CD
6. Apply Kubernetes manifests
7. Point your domain to the Oracle Cloud IP

## 📁 Project Structure

```
.
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── server.js         # Express app setup
│   │   ├── models/           # Mongoose models
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth middleware
│   │   └── utils/            # Redis utility
│   └── Dockerfile
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── App.jsx           # Router & layout
│   │   ├── pages/            # Login, Register, Dashboard
│   │   ├── components/       # Task modals
│   │   ├── api.js            # Axios client
│   │   └── index.css         # Premium dark theme
│   ├── nginx.conf            # Production proxy config
│   └── Dockerfile
├── worker/                   # Python worker
│   ├── worker.py             # Queue consumer
│   └── Dockerfile
├── infra/                    # Infrastructure
│   ├── k8s/                  # Kubernetes manifests
│   └── argocd/               # Argo CD application
├── .github/workflows/        # CI/CD pipeline
├── docker-compose.yml        # Local development
├── ARCHITECTURE.md           # Architecture document
└── README.md                 # This file
```

## 🔐 Security

- ✅ Password hashing with bcrypt (12 rounds)
- ✅ JWT-based authentication
- ✅ Helmet middleware (HTTP security headers)
- ✅ Rate limiting (100 req/15 min per IP)
- ✅ CORS configuration
- ✅ No hardcoded secrets (env vars / K8s Secrets)
- ✅ Non-root Docker containers
- ✅ Input validation and sanitization

## 📊 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/tasks` | List user's tasks | Yes |
| GET | `/api/tasks/:id` | Get task details | Yes |
| POST | `/api/tasks` | Create new task | Yes |
| DELETE | `/api/tasks/:id` | Delete task | Yes |
| POST | `/api/tasks/:id/retry` | Retry failed task | Yes |
| GET | `/api/health` | Health check | No |

## 📄 License

MIT
