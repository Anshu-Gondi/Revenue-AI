import os
import pandas as pd
import io
import base64
import matplotlib.pyplot as plt
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader

# Force CPU usage in PyTorch
torch.set_num_threads(2)
os.environ['OMP_NUM_THREADS'] = '2'

def train_model_pipeline(df, model_name='random_forest'):
    from .views import inter_target_column
    import matplotlib.pyplot as plt
    from sklearn.model_selection import learning_curve
    import io, base64
    import shap

    def fig_to_base64(fig):
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        img = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        return img

    graphs = {}
    df = df.copy()

    # Downsample if data too large
    if len(df) > 5000:
        df = df.sample(n=5000, random_state=42)

    target_col = inter_target_column(df)
    if not target_col:
        raise ValueError('Target column not found.')

    df = df[df[target_col].notna()]

    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df['month'] = df['date'].dt.month
        df = df.drop(columns=['date'])

    for col in df.select_dtypes(include='object').columns:
        df[col] = LabelEncoder().fit_transform(df[col].astype(str))

    df = df.dropna()
    X = df.drop(columns=[target_col])
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    if model_name == 'linear_regression':
        model = LinearRegression()
    elif model_name == 'decision_tree':
        model = DecisionTreeRegressor(random_state=42)
    elif model_name == 'xgboost':
        model = XGBRegressor(random_state=42, verbosity=0, n_jobs=2)
    elif model_name == 'lightgbm':
        model = LGBMRegressor(random_state=42, n_jobs=2)
    elif model_name == 'pytorch_nn':
        class PyTorchNN(nn.Module):
            def __init__(self, input_size):
                super(PyTorchNN, self).__init__()
                self.net = nn.Sequential(
                    nn.Linear(input_size, 64),
                    nn.ReLU(),
                    nn.Linear(64, 32),
                    nn.ReLU(),
                    nn.Linear(32, 1)
                )

            def forward(self, x):
                return self.net(x)

        device = torch.device("cpu")  # Force CPU
        X_train_tensor = torch.tensor(X_train.values, dtype=torch.float32).to(device)
        y_train_tensor = torch.tensor(y_train.values, dtype=torch.float32).view(-1, 1).to(device)
        X_test_tensor = torch.tensor(X_test.values, dtype=torch.float32).to(device)

        dataset = TensorDataset(X_train_tensor, y_train_tensor)
        loader = DataLoader(dataset, batch_size=16, shuffle=True)  # Smaller batch

        model = PyTorchNN(X_train.shape[1]).to(device)
        criterion = nn.MSELoss()
        optimizer = optim.Adam(model.parameters(), lr=0.01)

        model.train()
        for epoch in range(50):  # Fewer epochs
            for batch_X, batch_y in loader:
                optimizer.zero_grad()
                outputs = model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()

        model.eval()
        with torch.no_grad():
            y_pred_tensor = model(X_test_tensor)
            y_pred = y_pred_tensor.cpu().numpy().flatten()
    else:
        model = RandomForestRegressor(random_state=42, n_jobs=2)

    if model_name != 'pytorch_nn':
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

    # ─── Evaluation ─────────────────────
    rmse = mean_squared_error(y_test, y_pred) ** 0.5
    r2 = r2_score(y_test, y_pred)
    r2 = 0.0 if np.isnan(r2) else r2

    # ─── Diagnostic Plots ───────────────
    residuals = y_test - y_pred

    fig, ax = plt.subplots()
    ax.scatter(y_pred, residuals, alpha=0.6)
    ax.axhline(0, color='red')
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Residuals")
    ax.set_title("Residuals vs Predicted")
    graphs['residuals_plot'] = fig_to_base64(fig)

    fig, ax = plt.subplots()
    ax.scatter(y_test, y_pred, alpha=0.6)
    ax.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--')
    ax.set_xlabel("Actual")
    ax.set_ylabel("Predicted")
    ax.set_title("Predicted vs Actual")
    graphs['pred_vs_actual'] = fig_to_base64(fig)

    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
        idx = np.argsort(importances)[::-1]
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.barh([X.columns[i] for i in idx], importances[idx])
        ax.set_title("Feature Importances")
        ax.invert_yaxis()
        graphs['feature_importance'] = fig_to_base64(fig)

    # Learning Curve (skip if too heavy)
    try:
        if model_name != 'pytorch_nn':
            train_sizes, train_scores, val_scores = learning_curve(
                model, X, y, cv=3, scoring='neg_root_mean_squared_error',
                train_sizes=np.linspace(0.1, 1.0, 3), n_jobs=2
            )
            train_scores = -train_scores
            val_scores = -val_scores
            fig, ax = plt.subplots()
            ax.plot(train_sizes, train_scores.mean(axis=1), 'o-', label='Train RMSE')
            ax.plot(train_sizes, val_scores.mean(axis=1), 'o-', label='Validation RMSE')
            ax.set_xlabel('Training Size')
            ax.set_ylabel('RMSE')
            ax.set_title("Learning Curve")
            ax.legend()
            graphs['learning_curve'] = fig_to_base64(fig)
    except Exception as e:
        print("Learning curve skipped:", e)

    fig, ax = plt.subplots()
    ax.hist(residuals, bins=20, edgecolor='black')
    ax.set_title("Error Distribution (Residuals)")
    ax.set_xlabel("Residual")
    graphs['error_histogram'] = fig_to_base64(fig)

    # SHAP (optional and heavy)
    try:
        if model_name not in ['pytorch_nn', 'linear_regression']:
            explainer = shap.Explainer(model, X)
            shap_values = explainer(X_test)
            fig = shap.plots.beeswarm(shap_values, show=False)
            graphs['shap_summary'] = fig_to_base64(fig)
    except Exception as e:
        print("SHAP skipped:", e)

    # Forecast Plot
    forecast_plot = None
    if 'month' in X.columns:
        rows = []
        for i in range(1, 6):
            row = {col: (i if col == 'month' else X_train[col].median()) for col in X.columns}
            rows.append(row)
        future_months = pd.DataFrame(rows)[X.columns]

        if model_name == 'pytorch_nn':
            with torch.no_grad():
                future_tensor = torch.tensor(future_months.values, dtype=torch.float32).to(device)
                future_preds = model(future_tensor).cpu().numpy().flatten()
        else:
            future_preds = model.predict(future_months)

        fig, ax = plt.subplots()
        ax.plot(range(1, 6), future_preds, marker='o')
        ax.set_title("Future Forecast (Next 5 Months)")
        ax.set_xlabel("Month")
        ax.set_ylabel(target_col)
        forecast_plot = fig_to_base64(fig)

    return {
        'target_column': target_col,
        'features_used': list(X.columns),
        'rmse': round(rmse, 2),
        'r2_score': round(r2, 3),
        'sample_predictions': y_pred[:5].tolist(),
        'forecast_plot_base64': forecast_plot,
        'diagnostic_graphs': graphs
    }
