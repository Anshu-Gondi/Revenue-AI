from django.shortcuts import render
from django.core.paginator import Paginator
from django.http import JsonResponse, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SavedResult, ContactMessage
import json
import csv

# Create your views here.

""" Predication Page views """


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_saved_results(request):
    page_size = int(request.GET.get('page_size', 10))
    page      = int(request.GET.get('page', 1))

    qs = SavedResult.objects.filter(owner=request.user).order_by('-uploaded_at')
    paginator = Paginator(qs, page_size)
    page_obj  = paginator.page(page)

    data = []
    for r in page_obj.object_list:
        data.append({
            "id":             r.id,
            "file_name":      r.file_name,
            "inferred_target":r.inferred_target,
            "data_shape":     r.data_shape,
            "result_json": {
                "eda_result":   r.eda_result or {},
                "model_result": r.model_result or {},
            },
            "model_name": r.model_name,
            "notes":      r.notes,
            "created_at": r.uploaded_at.isoformat(),
        })

    return JsonResponse({
        "results":      data,
        "total_pages":  paginator.num_pages,
        "current_page": page
    }, safe=False)


@api_view(['POST'])
def save_result_view(request):
    try:
        file_name = request.data.get("file_name", "unknown_file.csv")
        inferred_target = request.data.get("inferred_target")
        data_shape = request.data.get("data_shape")
        result_json = request.data.get("result_json")
        model_name = request.data.get("model_name")
        notes = request.data.get("notes", "")

        if isinstance(result_json, str):
            result_json = json.loads(result_json)

        # Decide whether it’s an EDA payload or a model payload
        # If it has "graphs" or "columns", treat as EDA; otherwise treat as model
        eda_payload = {}
        model_payload = {}
        if isinstance(result_json, dict):
            if "graphs" in result_json or "columns" in result_json:
                eda_payload = result_json
            elif "target_column" in result_json or "rmse" in result_json:
                model_payload = result_json
            else:
                # If unsure, just store the entire thing as "eda_result"
                eda_payload = result_json
        else:
            # If somehow it’s not a dict, put it under EDA by default
            eda_payload = {}

        saved = SavedResult.objects.create(
            owner=request.user,
            file_name=file_name,
            inferred_target=inferred_target,
            data_shape=data_shape,
            eda_result=eda_payload,
            model_result=model_payload,
            model_name=model_name,
            notes=notes,
        )

        return Response({"message": "Result saved successfully.", "id": saved.id})

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def edit_saved_result(request, pk):
    obj = SavedResult.objects.filter(pk=pk, owner=request.user).first()
    if not obj:
        return Response({'error': 'Not found or not yours'}, status=404)

    obj.notes = request.data.get('notes', obj.notes)
    obj.save()
    return Response({'message': 'Updated successfully'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_result_view(request, result_id):
    obj = SavedResult.objects.filter(id=result_id, owner=request.user).first()
    if not obj:
        return Response({'error': 'Not found or not yours'}, status=404)
    obj.delete()
    return Response({"message": "Deleted"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_saved_result(request, pk):
    obj = SavedResult.objects.filter(pk=pk, owner=request.user).first()
    if not obj:
        return Response({'error': 'Not found or not yours'}, status=404)
    # JSON‑only download
    return JsonResponse({
        "id":              obj.id,
        "file_name":       obj.file_name,
        "notes":           obj.notes,
        "uploaded_at":     obj.uploaded_at.isoformat(),
        "inferred_target": obj.inferred_target,
        "model_name":      obj.model_name,
        "data_shape":      obj.data_shape,
        "eda_result":      obj.eda_result or {},
        "model_result":    obj.model_result or {},
    }, safe=False)

""" Contact Page views """


@api_view(['POST'])
def contact_form_view(request):
    try:
        name = request.data.get('name')
        email = request.data.get('email')
        message = request.data.get('message')

        # save to DB
        ContactMessage.objects.create(
            name=name,
            email=email,
            message=message
        )

        return Response({"message": "Message received successfully!"})
    except Exception as e:
        return Response({"error": str(e)}, status=500)
