import pandas as pd
from sklearn.linear_model import LinearRegression

def process_and_predict(df: pd.DataFrame) -> dict:
    df.columns = df.columns.str.lower().str.strip()

    # Try to detect the target column
    possible_targets = ['revenue', 'income', 'sales', 'target']
    target_col = next((col for col in df.columns if any(t in col for t in possible_targets)), None)

    if not target_col:
        raise ValueError("Couldn't detect a target column.")

    features = df.drop(columns=[target_col])
    target = df[target_col]

    # Basic preprocessing
    features = features.select_dtypes(include=['float64', 'int64'])  # remove strings for now
    features = features.fillna(features.mean())

    # Train simple model
    model = LinearRegression()
    model.fit(features, target)
    predictions = model.predict(features)

    return {
        "predictions": predictions[:10].tolist(),  # send first 10 as sample
        "target_column": target_col,
        "features_used": features.columns.tolist()
    }
