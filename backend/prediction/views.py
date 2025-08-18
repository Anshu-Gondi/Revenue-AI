# Create your views here.
from rest_framework.views import APIView
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, permissions
import polars as pl
from .utils import process_and_predict
from .eda import generate_graphs
import re
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use a non-GUI backend for servers
from .models import train_model_pipeline
from database.models import SavedResult
from .serializers import SignUpSerializer, UserSerializer
from google.oauth2 import id_token
from google.auth.transport import requests
import datetime

class PredictAPIView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.data.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=400)

        try:
            df = pl.read_csv(file)
            results = process_and_predict(df)
            return Response(results)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ─── SANITIZE ───────────────────────────────────────────────

def sanitize_for_json(data):
    if isinstance(data, dict):
        return {k: sanitize_for_json(v) for k, v in data.items()}

    elif isinstance(data, list):
        return [sanitize_for_json(i) for i in data]

    elif isinstance(data, (datetime.date, datetime.datetime)):
        return data.isoformat()

    elif isinstance(data, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(data)

    elif isinstance(data, (np.floating, np.float64, np.float32)):
        if np.isnan(data) or np.isinf(data):
            return None
        return float(data)

    elif isinstance(data, tuple):
        return [sanitize_for_json(i) for i in data]

    elif isinstance(data, float):
        if np.isnan(data) or np.isinf(data):
            return None
        return data

    return data


def inter_target_column(df: pl.DataFrame):
    """Try to detect the most likely target column eg., revenue, sales, profit."""
    target_keywords = ["revenue", "target", "sales", "income", "profit", "earning"]
    for col in df.columns:
        for keyword in target_keywords:
            if re.search(keyword, col.lower()):
                return col
    return None


# ─── EDA ────────────────────────────────────────────────────

@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def eda_view(request):
    file = request.FILES.get('file')
    if not file:
        return Response({"error": "No file uploaded."}, status=400)

    df = pl.read_csv(file)

    # 1) date → month
    date_column = None
    for col in df.columns:
        if 'date' in col.lower():
            try:
                df = df.with_columns([
                    pl.col(col).str.strptime(pl.Datetime, strict=False).alias(col)
                ])
                df = df.with_columns([
                    df[col].dt.month().alias("month")
                ])
                date_column = col
                break
            except Exception:
                continue

    # 2) infer target & product columns
    target_col = inter_target_column(df)
    product_name_col = next((c for c in df.columns if 'product' in c.lower() and 'name' in c.lower()), None)
    product_type_col = next((c for c in df.columns if 'product' in c.lower() and ('type' in c.lower() or 'category' in c.lower())), None)

    # Convert Polars → Pandas for some EDA ops (describe, corr, etc.)
    df_pd = df.to_pandas()

    # 3) build payload
    eda_payload = {
        'shape': df.shape,
        'columns': df.columns,
        'dtypes': {c: str(df[c].dtype) for c in df.columns},
        'missing_values': df.null_count().to_dict(as_series=False),
        'descriptive_stats': df_pd.describe(include='all').fillna('').to_dict(),
        'correlation_matrix': df_pd.corr(numeric_only=True).round(2).to_dict(),
        'unique_values': {c: df[c].n_unique() for c in df.columns},
        'example_rows': df.head(5).to_pandas().to_dict(orient='records'),
        'inferred_target': target_col,
        'date_column_used': date_column,
        'month_feature_added': 'month' in df.columns,
        'graphs': generate_graphs(df_pd, product_name_col, product_type_col)
    }
    eda_payload = sanitize_for_json(eda_payload)

    # 4) save/update with owner=request.user
    filename = file.name
    saved_obj, created = SavedResult.objects.get_or_create(
        owner=request.user,
        file_name=filename,
        defaults={
            'eda_result': eda_payload,
            'inferred_target': target_col or '',
            'data_shape': f"{df.shape[0]} rows, {df.shape[1]} columns",
            'model_name': '',
        }
    )
    if not created:
        saved_obj.eda_result      = eda_payload
        saved_obj.inferred_target = target_col or saved_obj.inferred_target
        saved_obj.data_shape      = f"{df.shape[0]} rows, {df.shape[1]} columns"
        saved_obj.save()

    return Response(eda_payload)


# ─── TRAIN ──────────────────────────────────────────────────

@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def train_model_view(request):
    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'No file uploaded'}, status=400)

    df = pl.read_csv(file)
    model_name = request.data.get('model', 'random_forest')

    result = train_model_pipeline(df, model_name)

    # Scrub JSON
    result = sanitize_for_json(result)

    # Save/update with owner=request.user
    filename = file.name
    saved_obj, created = SavedResult.objects.get_or_create(
        owner=request.user,
        file_name=filename,
        defaults={
            'model_result': result,
            'model_name': model_name,
            'inferred_target': result.get('target_column') or '',
            'data_shape': f"{df.shape[0]} rows, {df.shape[1]} columns"
        }
    )
    if not created:
        saved_obj.model_result    = result
        saved_obj.model_name      = model_name
        saved_obj.inferred_target = result.get('target_column') or saved_obj.inferred_target
        saved_obj.save()

    return Response(result)

# ─── SIGNUP / WHOAMI ──────────────────────────────────────────────────────────

@api_view(['POST'])
def signup_view(request):
    serializer = SignUpSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def whoami_view(request):
    return Response(UserSerializer(request.user).data)
# ─── GOOGLE SOCIAL LOGIN ───────────────────────────────────────────────────────

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import os
from dotenv import load_dotenv
load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID") 

class GoogleLoginView(APIView):
    def post(self, request):
        token = request.data.get("access_token")
        if not token:
            return Response({"detail": "No access token provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)

            email = idinfo['email']
            name = idinfo.get('name', '')
            User = get_user_model()

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email.split("@")[0],
                    "first_name": name,
                }
            )

            refresh = RefreshToken.for_user(user)
            return Response({
                "access_token": str(refresh.access_token),
                "refresh_token": str(refresh)
            })

        except Exception as e:
            return Response({
                "detail": "Invalid Google token.",
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)