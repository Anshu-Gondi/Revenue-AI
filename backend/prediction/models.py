from django.db import models
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

# Create your models here.


def train_model_pipeline(df, model_name='random_forest'):
    from .views import inter_target_column  # if still in views

    df = df.copy()
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
        X, y, test_size=0.2, random_state=42)

    if model_name == 'linear_regression':
        model = LinearRegression()
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

    elif model_name == 'decision_tree':
        model = DecisionTreeRegressor(random_state=42)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

    elif model_name == 'xgboost':
        model = XGBRegressor(random_state=42, verbosity=0)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

    elif model_name == 'lightgbm':
        model = LGBMRegressor(random_state=42)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

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

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        X_train_tensor = torch.tensor(
            X_train.values, dtype=torch.float32).to(device)
        y_train_tensor = torch.tensor(
            y_train.values, dtype=torch.float32).view(-1, 1).to(device)
        X_test_tensor = torch.tensor(
            X_test.values, dtype=torch.float32).to(device)

        dataset = TensorDataset(X_train_tensor, y_train_tensor)
        loader = DataLoader(dataset, batch_size=32, shuffle=True)

        model = PyTorchNN(X_train.shape[1]).to(device)
        criterion = nn.MSELoss()
        optimizer = optim.Adam(model.parameters(), lr=0.01)

        model.train()
        for epoch in range(100):
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
        model = RandomForestRegressor(random_state=42)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

    rmse = mean_squared_error(y_test, y_pred) ** 0.5
    r2   = r2_score(y_test,  y_pred)
    # if R² came back undefined (NaN), coerce it to 0.0
    if np.isnan(r2):
        r2 = 0.0

    forecast_plot = None
    if 'month' in X.columns:
        rows = []
        for i in range(1, 6):
            row = {}
            for col in X.columns:
                if col == 'month':
                    row[col] = i
                else:
                    row[col] = X_train[col].median()
            rows.append(row)
        future_months = pd.DataFrame(rows)[X.columns]
        
        if model_name == 'pytorch_nn':
            model.eval()
            with torch.no_grad():
                future_tensor = torch.tensor(
                    future_months.values, dtype=torch.float32
                    ).to(device)
                future_preds = model(future_tensor).cpu().numpy().flatten()
        else:
            future_preds = model.predict(future_months)


        plt.figure()
        plt.plot(range(1, 6), future_preds, marker='o')
        plt.title("Future Forecast (Next 5 Months)")
        plt.xlabel("Month")
        plt.ylabel(target_col)
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png')
        buffer.seek(0)
        forecast_plot = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close()

    return {
        'target_column': target_col,
        'features_used': list(X.columns),
        'rmse': round(rmse, 2),
        'r2_score': round(r2, 3),
        'sample_predictions': y_pred[:5].tolist(),
        'forecast_plot_base64': forecast_plot
    }
