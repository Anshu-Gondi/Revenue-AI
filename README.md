# Revenue-AI

Lightweight full-stack application for sales forecasting and exploratory data analysis (EDA).

**Hardware Baseline (All development & testing):**

* Intel Celeron N4020 (Gemini Lake, 2017)
* 2 cores / 2 threads
* 8GB RAM
* CPU-only (no GPU acceleration)
* Single-machine deployment

The system is designed and profiled under constrained hardware rather than high-performance environments.

---

## Project Overview

Revenue-AI allows users to:

1. Upload structured sales data (CSV)
2. Perform exploratory data analysis
3. Train regression models
4. Save and export results

The goal is not model novelty, but practical usability under limited compute.

---

## Engineering Constraints & Design Decisions

### CPU-Only ML

* PyTorch used in CPU mode (`torch.set_num_threads(2)`)
* Scikit-learn models preferred for lower memory footprint
* Thread counts restricted where appropriate
* Large datasets optionally downsampled

### Memory Discipline

* No in-memory dataset duplication
* Matplotlib figures serialized and cleared after generation
* SQLite used instead of heavier DB systems

### Deployment Simplicity

* No external services required
* Runs locally or on low-tier cloud instances
* No distributed architecture assumptions

---

## Architecture

### Backend (Django)

* `prediction/models.py` → ML training & evaluation logic
* `prediction/eda.py` → Summary statistics & visualization generation
* `views.py` → API endpoints
* SQLite for result persistence

All heavy computation happens server-side.

EDA results returned as:

* JSON summaries
* Base64-encoded PNG plots

### Frontend (TypeScript + Vite)

* Minimal dependency footprint
* No heavy UI frameworks
* PNG rendering for maximum compatibility

---

## ML Workflow

1. **Upload CSV**

   * Validated and preprocessed

2. **EDA**

   * Summary statistics
   * Missing value analysis
   * Correlation matrices
   * Histograms / boxplots

3. **Model Training**
   Supported models:

   * Linear Regression
   * Random Forest
   * XGBoost
   * LightGBM
   * PyTorch Neural Network (CPU, 50 epochs, batch size 16, Adam optimizer)

   Metrics computed:

   * RMSE
   * R²

4. **Result Management**

   * Save experiments
   * Add notes
   * Export JSON

---

## Known Limitations

* No background job queue (training is synchronous)
* No distributed training
* Not optimized for very large datasets (> memory capacity)
* No experiment tracking system (e.g., MLflow)

These constraints are intentional given the hardware baseline.

---

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173)
Backend API: [http://localhost:8000](http://localhost:8000)

---

## What This Project Represents

Revenue-AI reflects an early phase of my ML system development before adopting stricter profiling and architectural separation practices seen in later projects.

It demonstrates:

* Full-stack ML integration
* CPU-aware system design
* Clean separation between API and ML logic
* Practical deployment discipline

---

Contact: [agondi982@gmail.com](mailto:agondi982@gmail.com)

---

## Benchmark Snapshot (CPU-Only)

All benchmarks measured on:

* Intel Celeron N4020 (Gemini Lake, 2017)
* 2 cores / 2 threads
* 8GB RAM
* CPU-only
* `torch.set_num_threads(2)`
* Averaged over 3 runs

Dataset capped at 5,000 rows (downsampling logic applied).

| Dataset Size | Model             | Training Time | Configuration             |
| ------------ | ----------------- | ------------- | ------------------------- |
| 5k rows      | Linear Regression | 0.8s          | Default sklearn           |
| 5k rows      | Random Forest     | 3.2s          | n_jobs=2                  |
| 5k rows      | PyTorch NN        | ~3–4 min      | 50 epochs, batch=16, Adam |

---
