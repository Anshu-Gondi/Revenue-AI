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

    numeric_columns = df.select_dtypes(include='number').columns
    target_col = numeric_columns[-1] if len(numeric_columns) > 1 else None

    # Histogram
    fig = df.hist(figsize=(10, 6))
    plt.tight_layout()
    graphs["histogram"] = fig_to_base64(plt.gcf())

    # Correlation Heatmap
    corr = df.corr(numeric_only=True)
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(corr, annot=True, cmap="coolwarm", ax=ax)
    graphs["correlation_heatmap"] = fig_to_base64(fig)

    # Scatter plots
    if target_col:
        for col in numeric_columns[:-1]:
            fig, ax = plt.subplots()
            sns.scatterplot(data=df, x=col, y=target_col, ax=ax)
            ax.set_title(f"{col} vs {target_col}")
            graphs[f"scatter_{col}_vs_{target_col}"] = fig_to_base64(fig)

    # Boxplots
    for col in numeric_columns:
        fig, ax = plt.subplots()
        sns.boxplot(x=df[col], ax=ax)
        ax.set_title(f"Boxplot of {col}")
        graphs[f"boxplot_{col}"] = fig_to_base64(fig)

    # KDE / Density Plots
    for col in numeric_columns:
        fig, ax = plt.subplots()
        sns.kdeplot(df[col].dropna(), fill=True, ax=ax)
        ax.set_title(f"KDE of {col}")
        graphs[f"kde_{col}"] = fig_to_base64(fig)

    # Missing value heatmap
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(df.isnull(), cbar=False, yticklabels=False, ax=ax)
    ax.set_title("Missing Values Overview")
    graphs["missing_values_heatmap"] = fig_to_base64(fig)

    # Violin plot (target vs product type)
    if product_type_col and target_col:
        fig, ax = plt.subplots(figsize=(10, 6))
        sns.violinplot(x=product_type_col, y=target_col, data=df, ax=ax)
        ax.set_title("Value Distribution by Product Type")
        graphs["violin_target_by_type"] = fig_to_base64(fig)

    # Pairplot (only if not too many columns)
    if len(numeric_columns) <= 10:
        pairplot = sns.pairplot(df[numeric_columns])
        graphs["pairplot"] = fig_to_base64(pairplot.fig)

    # Bar, Pie, Trend for product names
    if product_name_col:
        top_names = df[product_name_col].value_counts().head(5)

        fig, ax = plt.subplots()
        top_names.plot(kind='bar', color='skyblue', ax=ax)
        ax.set_title("Top 5 Product Names (Bar)")
        graphs["top_product_names_bar"] = fig_to_base64(fig)

        fig, ax = plt.subplots()
        top_names.plot(kind='pie', autopct='%1.1f%%', ax=ax)
        ax.set_ylabel('')
        ax.set_title("Top 5 Product Names (Pie)")
        graphs["top_product_names_pie"] = fig_to_base64(fig)

        if 'month' in df.columns:
            trend = df[df[product_name_col].isin(top_names.index)]
            monthly = trend.groupby(['month', product_name_col]).size().unstack(fill_value=0)
            fig, ax = plt.subplots(figsize=(10, 6))
            monthly.plot(ax=ax, marker='o')
            ax.set_title("Monthly Trend of Top 5 Product Names")
            graphs["monthly_product_name_trend"] = fig_to_base64(fig)

    # Bar, Pie, Trend for product types
    if product_type_col:
        top_types = df[product_type_col].value_counts().head(5)

        fig, ax = plt.subplots()
        top_types.plot(kind='bar', color='lightgreen', ax=ax)
        ax.set_title("Top 5 Product Types (Bar)")
        graphs["top_product_types_bar"] = fig_to_base64(fig)

        fig, ax = plt.subplots()
        top_types.plot(kind='pie', autopct='%1.1f%%', ax=ax)
        ax.set_ylabel('')
        ax.set_title("Top 5 Product Types (Pie)")
        graphs["top_product_types_pie"] = fig_to_base64(fig)

        if 'month' in df.columns:
            trend = df[df[product_type_col].isin(top_types.index)]
            monthly = trend.groupby(['month', product_type_col]).size().unstack(fill_value=0)
            fig, ax = plt.subplots(figsize=(10, 6))
            monthly.plot(ax=ax, marker='o')
            ax.set_title("Monthly Trend of Top 5 Product Types")
            graphs["monthly_product_type_trend"] = fig_to_base64(fig)

    return graphs
