from django.conf import settings
from django.db import models

class SavedResult(models.Model):
    owner           = models.ForeignKey(
                        settings.AUTH_USER_MODEL,
                        on_delete=models.CASCADE,
                        related_name='saved_results'
                      )
    file_name       = models.CharField(max_length=255)
    uploaded_at     = models.DateTimeField(auto_now_add=True)
    inferred_target = models.CharField(max_length=255, blank=True, null=True, default="")
    data_shape      = models.CharField(max_length=50)
    eda_result      = models.JSONField(default=dict, blank=True)
    model_result    = models.JSONField(default=dict, blank=True)
    model_name = models.CharField(max_length=100, blank=True, null=True, default="")
    notes           = models.TextField(blank=True)

    def __str__(self):
        return f"{self.file_name} ({self.owner.username}) – {self.uploaded_at:%Y‑%m‑%d}"

class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Message from {self.name} ({self.email})"