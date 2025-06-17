from django.urls import path
from .views import (
    PredictAPIView, eda_view, train_model_view,
    signup_view, whoami_view, GoogleLoginView 
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView, TokenRefreshView
)
from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from database.views import save_result_view, get_saved_results, delete_result_view, edit_saved_result, download_saved_result, contact_form_view
from allauth.socialaccount.providers.oauth2.views import OAuth2CallbackView

urlpatterns = [
    # APP 
    path('predict/', PredictAPIView.as_view(), name='predict'),
    path('predict/eda/', eda_view, name='eda'),
    path('predict/train/', train_model_view, name='train'),
    # Database
    path('save-result/', save_result_view, name='save-result'),
    path('saved-results/', get_saved_results, name='get-saved-results'),
    path('saved-results/delete/<int:result_id>/', delete_result_view, name='delete-result'),
    path('saved-results/edit/<int:pk>/', edit_saved_result),
    path('saved-results/download/<int:pk>/', download_saved_result),
    # Contact Us
    path('contact/', contact_form_view, name='contact-form'),
    # auth
    path('auth/signup/',   signup_view,               name='signup'),
    path('auth/login/',    TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/',  TokenRefreshView.as_view(),    name='token_refresh'),
    path('auth/me/',       whoami_view,               name='whoami'),
    # Google social-login:
    path('auth/google-login/', GoogleLoginView.as_view(), name='google-login'),

    path('auth/social/google/callback/', OAuth2CallbackView.adapter_view(GoogleOAuth2Adapter)),
]

