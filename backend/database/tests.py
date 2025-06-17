from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from .models import SavedResult, ContactMessage
import json

# Create your tests here.
class SavedResultTests(APITestCase):
    def setUp(self):
        # create & authenticate
        self.user = User.objects.create_user(username="tester", password="pw")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_save_result_view_model_payload(self):
        url = reverse('save-result')  # -> /api/save-result/
        data = {
            "file_name": "sample.csv",
            "inferred_target": "target",
            "data_shape": "(100,5)",
            "model_name": "random_forest",
            "result_json": {"target_column": "target", "rmse": 0.5, "r2_score": 0.9},
            "notes": "foo"
        }
        resp = self.client.post(url, json.dumps(data), content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('id', resp.data)

    def test_get_saved_results_pagination(self):
        # seed 15 objects
        for i in range(15):
            SavedResult.objects.create(
                owner=self.user,
                file_name=f"file_{i}.csv",
                inferred_target="t",
                data_shape="(1,1)"
            )
        url = reverse('get-saved-results')  # -> /api/saved-results/
        resp = self.client.get(url + "?page=1&page_size=10")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()['results']), 10)
        self.assertEqual(resp.json()['current_page'], 1)

    def test_edit_saved_result(self):
        obj = SavedResult.objects.create(
            owner=self.user,
            file_name="f.csv",
            inferred_target="t",
            data_shape="(1,1)",
            notes="old"
        )
        url = reverse('delete-result', args=[obj.id]).replace('delete','edit')  # or use reverse('edit-saved-result', args=[obj.id])
        # better if you name your URL: path('saved-results/edit/<int:pk>/', edit_saved_result, name='edit-result')
        url = f"/api/saved-results/edit/{obj.id}/"
        resp = self.client.put(url, {"notes": "new"}, format='json')
        self.assertEqual(resp.status_code, 200)
        obj.refresh_from_db()
        self.assertEqual(obj.notes, "new")

    def test_delete_saved_result(self):
        obj = SavedResult.objects.create(
            owner=self.user,
            file_name="f.csv",
            inferred_target="t",
            data_shape="(1,1)"
        )
        url = f"/api/saved-results/delete/{obj.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(SavedResult.objects.filter(id=obj.id).exists())

    def test_download_saved_result(self):
        obj = SavedResult.objects.create(
            owner=self.user,
            file_name="f.csv",
            inferred_target="t",
            data_shape="(2,2)",
            eda_result={"a":1},
            model_result={"b":2}
        )
        url = f"/api/saved-results/download/{obj.id}/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['file_name'], "f.csv")
        self.assertIn('eda_result', resp.json())
        self.assertIn('model_result', resp.json())


class ContactMessageTests(APITestCase):
    def test_save_contact_form(self):
        url = reverse('contact-form')  # -> /api/contact/
        data = {"name": "Jane", "email": "j@example.com", "message": "Hi"}
        resp = self.client.post(url, data, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(ContactMessage.objects.filter(email="j@example.com").exists())