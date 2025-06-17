import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use a non-GUI backend for servers
import seaborn as sns
import io
import base64

def fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return img_base64

def generate_graphs(df, product_name_col=None, product_type_col=None):
    graphs = {}

    # Histogram for numeric columns
    fig = df.hist(figsize=(10, 6))
    plt.tight_layout()
    graphs["histogram"] = fig_to_base64(plt.gcf())

    # Correlation heatmap
    corr = df.corr(numeric_only=True)
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(corr, annot=True, cmap="coolwarm", ax=ax)
    graphs["correlation_heatmap"] = fig_to_base64(fig)

    # Scatter plots: target vs other numeric features
    numeric_columns = df.select_dtypes(include='number').columns
    if len(numeric_columns) > 1:
        target_col = numeric_columns[-1]
        for col in numeric_columns[:-1]:
            fig, ax = plt.subplots()
            sns.scatterplot(data=df, x=col, y=target_col, ax=ax)
            graphs[f"scatter_{col}_vs_{target_col}"] = fig_to_base64(fig)

    # Bar + Pie + Trend for product names
    if product_name_col:
        top_names = df[product_name_col].value_counts().head(5)

        # Bar chart
        fig, ax = plt.subplots()
        top_names.plot(kind='bar', color='skyblue', ax=ax)
        ax.set_title("Top 5 Product Names (Bar)")
        ax.set_ylabel("Count")
        graphs["top_product_names_bar"] = fig_to_base64(fig)

        # Pie chart
        fig, ax = plt.subplots()
        top_names.plot(kind='pie', autopct='%1.1f%%', ax=ax)
        ax.set_ylabel('')
        ax.set_title("Top 5 Product Names (Pie)")
        graphs["top_product_names_pie"] = fig_to_base64(fig)

        # Monthly trend (if 'month' is present)
        if 'month' in df.columns:
            monthly_name_trend = df[df[product_name_col].isin(top_names.index)].groupby(['month', product_name_col]).size().unstack(fill_value=0)
            fig, ax = plt.subplots(figsize=(10, 6))
            monthly_name_trend.plot(ax=ax, marker='o')
            ax.set_title("Monthly Trend of Top 5 Product Names")
            ax.set_xlabel("Month")
            ax.set_ylabel("Count")
            graphs["monthly_product_name_trend"] = fig_to_base64(fig)

    # Bar + Pie + Trend for product types
    if product_type_col:
        top_types = df[product_type_col].value_counts().head(5)

        # Bar chart
        fig, ax = plt.subplots()
        top_types.plot(kind='bar', color='lightgreen', ax=ax)
        ax.set_title("Top 5 Product Types (Bar)")
        ax.set_ylabel("Count")
        graphs["top_product_types_bar"] = fig_to_base64(fig)

        # Pie chart
        fig, ax = plt.subplots()
        top_types.plot(kind='pie', autopct='%1.1f%%', ax=ax)
        ax.set_ylabel('')
        ax.set_title("Top 5 Product Types (Pie)")
        graphs["top_product_types_pie"] = fig_to_base64(fig)

        # Monthly trend (if 'month' is present)
        if 'month' in df.columns:
            monthly_type_trend = df[df[product_type_col].isin(top_types.index)].groupby(['month', product_type_col]).size().unstack(fill_value=0)
            fig, ax = plt.subplots(figsize=(10, 6))
            monthly_type_trend.plot(ax=ax, marker='o')
            ax.set_title("Monthly Trend of Top 5 Product Types")
            ax.set_xlabel("Month")
            ax.set_ylabel("Count")
            graphs["monthly_product_type_trend"] = fig_to_base64(fig)

    return graphs
