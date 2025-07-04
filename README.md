# Revenue-AI

**Contact:** agondi982@gmail.com

---

## Project Overview

Revenue-AI is a lightweight, full-stack web application for sales prediction and exploratory data analysis (EDA). Designed with efficiency in mind, it runs smoothly even on low-end hardware and minimal cloud environments. The backend leverages optimized Python libraries and CPU-friendly settings, while the frontend is built with modern, fast-loading TypeScript and Vite.

---

## Why Revenue-AI Works on Low-End Systems

- **Backend:**  
  - Uses efficient libraries (scikit-learn, pandas, PyTorch with CPU-only mode).
  - Limits resource usage (e.g., downsampling large datasets, restricting thread count).
  - No GPU required; all ML and plotting operations are CPU-optimized.
  - Minimal dependencies and small memory footprint.

- **Frontend:**  
  - Built with Vite and vanilla TypeScript for fast load times.
  - No heavy frameworks; works in any modern browser.
  - Responsive and accessible UI, even on older devices.

- **Deployment:**  
  - Can be run locally or on free/low-tier cloud VMs (Heroku, Render, etc.).
  - No database required for basic prediction/EDA; uses SQLite for persistence.

---

## File Structure

```
backend/
  manage.py
  requirements.txt
  prediction/
    models.py         # ML pipeline, model training, EDA logic
    views.py          # API endpoints for EDA, training, saving results
    eda.py            # EDA graph generation (matplotlib, seaborn)
    utils.py          # Helper functions for data processing
  database/
    models.py         # Django models for saved results
    views.py          # CRUD API for results
    migrations/       # Database schema migrations
frontend/
  src/
    main.ts           # App entry, routing, page rendering
    Pages/
      Predication/    # Prediction/EDA UI, handlers, tests
      About/          # About page
      Contact/        # Contact form
    Components/       # Reusable UI components (Navbar, Toast, Loader, etc.)
  index.html
  style.css
```

---

## Data Science Workflow

1. **Upload CSV:**  
   Users upload their sales data (CSV). The backend reads and preprocesses the file.

2. **EDA (Exploratory Data Analysis):**  
   - The backend ([prediction/eda.py](backend/prediction/eda.py)) generates summary statistics, missing value analysis, and a variety of graphs (histograms, correlations, boxplots, etc.).
   - Results are returned as JSON and base64-encoded images for fast rendering in the browser.

3. **Model Training:**  
   - Users select a model (Random Forest, Linear Regression, XGBoost, LightGBM, PyTorch NN).
   - The backend ([prediction/models.py](backend/prediction/models.py)) trains the model on the uploaded data, computes metrics (RMSE, R²), and generates diagnostic plots.
   - All computation is optimized for CPU and small memory usage.

4. **Result Saving & Management:**  
   - Users can save EDA/model results, add notes, and download results as JSON.
   - Results are stored in a lightweight SQLite database ([database/models.py](backend/database/models.py)).

5. **Visualization:**  
   - All graphs are rendered as PNG images in the frontend for maximum compatibility and speed.

---

## How to Set Up and Run

### Prerequisites

- Python 3.10+ (for backend)
- Node.js 16+ (for frontend)
- (Optional) Git for version control

### Backend Setup

```sh
cd backend
python -m venv myenv
source myenv/bin/activate  # or myenv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup

```sh
cd frontend
npm install
npm run dev
```

### Accessing the App

- Open your browser and go to `http://localhost:5173` (frontend).
- The backend API runs at `http://localhost:8000`.

---

## Contact

For questions, suggestions, or collaborations, email: **agondi982@gmail.com**

---

*Revenue-AI: Fast, simple, and accessible sales prediction for everyone—even on the lowest-end
