# Create your views here.
from rest_framework.views import APIView
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, permissions
import pandas as pd
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

class PredictAPIView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.data.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=400)

        try:
            df = pd.read_csv(file)
            results = process_and_predict(df)
            return Response(results)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

# Sanitize JSON-incompatible float values
# views.py (excerpt)
import pandas as pd
import numpy as np
import datetime

def sanitize_for_json(data):
    if isinstance(data, dict):
        return {k: sanitize_for_json(v) for k, v in data.items()}

    elif isinstance(data, list):
        return [sanitize_for_json(i) for i in data]

    # Convert pure Python datetime/date to ISO string
    elif isinstance(data, (datetime.date, datetime.datetime)):
        return data.isoformat()

    # Convert pandas.Timestamp (which subclasses datetime) as well
    elif isinstance(data, pd.Timestamp):
        return data.isoformat()

    # Convert NumPy scalar types into native Python types
    elif isinstance(data, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(data)
    elif isinstance(data, (np.floating, np.float64, np.float32)):
        # If it’s NaN or Inf, return None, else native float
        if np.isnan(data) or np.isinf(data):
            return None
        return float(data)

    # Tuples (e.g., df.shape) → turn into list
    elif isinstance(data, tuple):
        return [sanitize_for_json(i) for i in data]

    # For any other float (pure Python), handle NaN/Inf:
    elif isinstance(data, float):
        if np.isnan(data) or np.isinf(data):
            return None
        return data

    # For any other primitive (str, int, bool, etc.), just return
    return data


def inter_target_column(df):
    """Try to detect the most likely target column eg.,revenue,etc"""
    target_keywords = ["revenue", "target",
                       "sales", "income", "profit", "earning"]
    for col in df.columns:
        for keyword in target_keywords:
            if re.search(keyword, col.lower()):
                return col
    return None  # fallback if nothing matches

# ─── EDA ────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def eda_view(request):
    file = request.FILES.get('file')
    if not file:
        return Response({"error": "No file uploaded."}, status=400)

    df = pd.read_csv(file)

    # 1) date → month
    date_column = None
    for col in df.columns:
        if 'date' in col.lower():
            try:
                df[col] = pd.to_datetime(df[col])
                df['month'] = df[col].dt.month
                date_column = col
                break
            except:
                continue

    # 2) infer target & product columns
    target_col = inter_target_column(df)
    product_name_col = next((c for c in df.columns if 'product' in c.lower() and 'name' in c.lower()), None)
    product_type_col = next((c for c in df.columns if 'product' in c.lower() and ('type' in c.lower() or 'category' in c.lower())), None)

    # 3) build payload
    eda_payload = {
        'shape': df.shape,
        'columns': list(df.columns),
        'dtypes': df.dtypes.astype(str).to_dict(),
        'missing_values': df.isnull().sum().to_dict(),
        'descriptive_stats': df.describe(include='all').fillna('').to_dict(),
        'correlation_matrix': df.corr(numeric_only=True).round(2).to_dict(),
        'unique_values': df.nunique().to_dict(),
        'example_rows': df.head(5).to_dict(orient='records'),
        'inferred_target': target_col,
        'date_column_used': date_column,
        'month_feature_added': 'month' in df.columns,
        'graphs': generate_graphs(df, product_name_col, product_type_col)
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


# ─── TRAIN ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def train_model_view(request):
    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'No file uploaded'}, status=400)

    df = pd.read_csv(file)
    model_name = request.data.get('model', 'random_forest')

    result = train_model_pipeline(df, model_name)

    # 2) scrub out any NaN/Inf/etc so JSONB accepts it
    result = sanitize_for_json(result)

    # save/update with owner=request.user
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