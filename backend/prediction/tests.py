from django.test import TestCase
from unittest.mock import patch
from django.urls import reverse
from google.oauth2 import id_token as google_id_token
from rest_framework.test import APITestCase
from rest_framework import status
import pandas as pd
from io import StringIO, BytesIO
from django.contrib.auth.models import User
import json

# Create your tests here.
class PredictAPIViewTest(APITestCase):

    def setUp(self):
        self.predict_url = reverse('predict')

    def test_predict_without_file(self):
        response = self.client.post(self.predict_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_predict_with_valid_file(self):
        # Create a simple DataFrame
        df = pd.DataFrame({
            'feature1': [1, 2, 3],
            'feature2': [4, 5, 6],
            'target': [7, 8, 9]
        })

        csv_buffer = StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)

        response = self.client.post(
            self.predict_url,
            {'file': BytesIO(csv_buffer.getvalue().encode())},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('predictions', response.data)

class EDAAPIViewTest(APITestCase):

    def setUp(self):
        self.eda_url = reverse('eda')

        # Create and authenticate user
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)

    def test_eda_without_file(self):
        response = self.client.post(self.eda_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_eda_with_valid_file(self):
        df = pd.DataFrame({
            'feature1': [1, 2, 3],
            'feature2': [4, 5, 6],
            'target': [7, 8, 9]
        })

        csv_buffer = StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)

        response = self.client.post(
            self.eda_url,
            {'file': BytesIO(csv_buffer.getvalue().encode())},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertIn('shape', response.data, msg="'shape' key missing in response")
        self.assertIn('columns', response.data, msg="'columns' key missing in response")
        self.assertIn('missing_values', response.data, msg="'missing_values' key missing in response")
        self.assertIn('correlation_matrix', response.data, msg="'correlation_matrix' key missing in response")
        self.assertIn('descriptive_stats', response.data, msg="'descriptive_stats' key missing in response")
        self.assertIn('unique_values', response.data, msg="'unique_values' key missing in response")
        self.assertIn('example_rows', response.data, msg="'example_rows' key missing in response")

        if response.status_code != 200 or 'correlations' not in response.data:
            print("🔍 Full Response:", response.data)

from io import BytesIO
from rest_framework import status
from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth.models import User
import pandas as pd

class TrainModelAPIViewTest(APITestCase):
    def setUp(self):
        self.train_url = reverse('train')  # make sure your URL name is 'train'
        # create & authenticate a user
        self.user = User.objects.create_user(username='tester', password='testpass')
        self.client.force_authenticate(user=self.user)

    def test_train_without_file(self):
        """POST without a file should return 400 and an 'error' key."""
        resp = self.client.post(self.train_url, {}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', resp.data, msg="'error' key missing in 400 response")

    def test_train_with_valid_file_default_model(self):
        """
        POST a small CSV → 200 OK,
        and response contains all expected fields.
        """
        # build a tiny training DataFrame
        df = pd.DataFrame({
            'feature1': [1, 2, 3, 4, 5],
            'feature2': [2, 3, 4, 5, 6],
            'target':   [3, 5, 7, 9, 11]
        })
        csv_buf = df.to_csv(index=False).encode()
        file_obj = BytesIO(csv_buf)

        resp = self.client.post(
            self.train_url,
            {'file': file_obj},      # no explicit `model`, so uses default 'random_forest'
            format='multipart'
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # top‐level keys we expect from train_model_pipeline
        expected_keys = {
            'target_column',
            'features_used',
            'rmse',
            'r2_score',
            'sample_predictions',
            'forecast_plot_base64',
        }

        for key in expected_keys:
            self.assertIn(key, resp.data, msg=f"'{key}' key missing in response")

        # spot‐check some types
        self.assertIsInstance(resp.data['target_column'], str)
        self.assertIsInstance(resp.data['features_used'], list)
        self.assertIsInstance(resp.data['rmse'], (float, int))
        self.assertIsInstance(resp.data['r2_score'], (float, int))
        self.assertIsInstance(resp.data['sample_predictions'], list)
        # forecast_plot_base64 may be None if no 'month' column was present;
        # but since we dropped 'date', it's None here.  Just allow str or None:
        self.assertTrue(
            resp.data['forecast_plot_base64'] is None
            or isinstance(resp.data['forecast_plot_base64'], str),
            msg="'forecast_plot_base64' must be str or None"
        )

        if 'diagnostic_graphs' in resp.data:
            self.assertIsInstance(resp.data['diagnostic_graphs'], dict)
            # Optionally check specific graphs like:
            self.assertIn('residuals_plot', resp.data['diagnostic_graphs'])

class AuthViewsTest(APITestCase):
    def setUp(self):
        self.signup_url       = reverse('signup')       # /api/auth/signup/
        self.login_url        = reverse('token_obtain_pair')  # /api/auth/login/
        self.whoami_url       = reverse('whoami')       # /api/auth/me/
        self.google_login_url = reverse('google-login') # /api/auth/google-login/

    def test_signup_valid(self):
        payload = {
            "username": "alice",
            "email":    "alice@example.com",
            "password": "complexpass123"
        }
        resp = self.client.post(self.signup_url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # returned object has id, username & email
        self.assertIn("id",       resp.data)
        self.assertEqual(resp.data["username"], "alice")
        self.assertEqual(resp.data["email"],    "alice@example.com")

    def test_signup_invalid(self):
        # missing password
        resp = self.client.post(self.signup_url, {"username":"bob"}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", resp.data)

    def test_whoami_unauthenticated(self):
        resp = self.client.get(self.whoami_url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_whoami_authenticated(self):
        # create a user & login to get JWT
        User.objects.create_user(username="carol", email="c@e.com", password="pw123456")
        login_resp = self.client.post(self.login_url, {
            "username": "carol",
            "password": "pw123456"
        }, format='json')

        self.assertEqual(login_resp.status_code, 200)

        tokens = json.loads(login_resp.content)  # instead of login_resp.data
        access = tokens["access"]

        # include Bearer token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        who_resp = self.client.get(self.whoami_url)
        self.assertEqual(who_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(who_resp.data["username"], "carol")
        self.assertEqual(who_resp.data["email"],    "c@e.com")

    @patch.object(google_id_token, 'verify_oauth2_token')
    def test_google_login_success(self, mock_verify):
        """
        Simulate a valid Google ID token.
        """
        # mock Google library to return an "idinfo" dict
        mock_verify.return_value = {
            "email": "dan@example.com",
            "name":  "Dan"
        }
        resp = self.client.post(self.google_login_url, {
            "access_token": "fake-id-token"
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # should return new JWT tokens
        self.assertIn("access_token",  resp.data)
        self.assertIn("refresh_token", resp.data)
        # and user should now exist
        user = User.objects.get(email="dan@example.com")
        self.assertEqual(user.username, "dan")

    @patch.object(google_id_token, 'verify_oauth2_token', side_effect=Exception("bad token"))
    def test_google_login_failure(self, mock_verify):
        """
        If Google verification fails, we should get a 400 with a detail.
        """
        resp = self.client.post(self.google_login_url, {
            "access_token": "invalid-token"
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", resp.data)
        self.assertEqual(resp.data["detail"], "Invalid Google token.")