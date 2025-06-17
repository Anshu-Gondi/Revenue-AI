import './Predication.css';
import { defineTour, startTour } from '../../Components/Tour/Tour';
import { AuthService } from '../../Services/AuthService';
import { renderLoader } from '../../Components/Loader/Loader';

let lastEDAResult: any = null;
let lastModelResult: any = null;

export function renderPredictionPage() {
  const html = `
    <section class="prediction-section">
      <h1 class="prediction-title">Smart Sales Prediction</h1>

      <h2>Upload Dataset</h2>
      <input type="file" id="fileInput" />
      <button id="edaBtn">Generate EDA</button>
      <div class="eda-output" id="edaOutput"></div>

      <h2>Select Model</h2>
      <select id="modelSelect">
        <option value="random_forest">Random Forest</option>
        <option value="linear_regression">Linear Regression</option>
        <option value="decision_tree">Decision Tree</option>
        <option value="xgboost">XGBoost</option>
        <option value="lightgbm">LightGBM</option>
        <option value="pytorch_nn">PyTorch NN</option>
      </select>
      <button id="trainBtn">Train Model</button>
      <div class="train-output" id="trainOutput"></div>

      <h2>Save Results</h2>
      <input type="text" id="noteInput" placeholder="Optional notes..." />
      <button id="saveBtn">Save Result</button>
      <div class="save-output" id="saveOutput"></div>

      <h2>Saved Results</h2>
      <input type="text" id="filterInput" placeholder="Filter by filename or date..." />
      <button id="loadResultsBtn">Load Saved Results</button>
      <div id="savedResultsContainer"></div>
    </section>
  `;

  setTimeout(() => {
    document.getElementById('edaBtn')?.addEventListener('click', handleEDA);
    document.getElementById('trainBtn')?.addEventListener('click', handleTrain);
    document.getElementById('saveBtn')?.addEventListener('click', handleSaveResult);
    document.getElementById('loadResultsBtn')?.addEventListener('click', loadSavedResults);
    document.getElementById('filterInput')?.addEventListener('input', loadSavedResults);

    defineTour([
      { el: document.querySelector('.prediction-title') as HTMLElement, message: 'Welcome! …' },
      { el: document.getElementById('edaBtn') as HTMLElement, message: '1) … Generate EDA.' },
      { el: document.getElementById('trainBtn') as HTMLElement, message: '2) … train it here.' },
      { el: document.getElementById('saveBtn') as HTMLElement, message: '3) … Save Result.' },
      { el: document.getElementById('filterInput') as HTMLElement, message: '4) … filter your saved results.' }
    ]);
    if (!localStorage.getItem('predTourCompleted')) {
      startTour().then(() => localStorage.setItem('predTourCompleted','true'));
    }
  }, 0);

  return html;
}

async function handleEDA() {
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const output = document.getElementById("edaOutput")!; // Move this here

  if (!fileInput.files?.length) {
    return alert("Upload a CSV file first.");
  }

  output.innerHTML = renderLoader();

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  const res = await AuthService.fetchWithAuth("http://127.0.0.1:8000/api/predict/eda/", {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  lastEDAResult = data;

  if (data.error) {
    output.innerHTML = `<p style="color:red;">${data.error}</p>`;
  } else {
    output.innerHTML = renderEDAOutput(data);
  }
}

async function handleTrain() {
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
  const output = document.getElementById("trainOutput")!; // Move this here

  if (!fileInput.files?.length) {
    return alert("Upload a CSV file first.");
  }

  output.innerHTML = renderLoader();

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("model", modelSelect.value);

  const res = await AuthService.fetchWithAuth("http://127.0.0.1:8000/api/predict/train/", {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  lastModelResult = data;

  if (data.error) {
    output.innerHTML = `<p style="color:red;">${data.error}</p>`;
  } else {
    output.innerHTML = renderTrainOutput(data);
  }
}

async function handleSaveResult() {
  if (!lastEDAResult && !lastModelResult) {
    return alert("Generate EDA or train a model first before saving.");
  }

  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const output = document.getElementById("saveOutput")!; // Declare here
  const container = document.getElementById("savedResultsContainer")!;

  if (!fileInput.files?.length) {
    return alert("Upload a CSV file first.");
  }

  output.innerHTML = renderLoader(); // Show loader in save output
  container.innerHTML = ""; // Clear old results until load completes

  const payload = {
    file_name: fileInput.files[0].name,
    inferred_target: lastModelResult?.target_column || lastEDAResult?.inferred_target || '',
    data_shape: (lastEDAResult?.shape || ''),
    result_json: lastModelResult || lastEDAResult,
    model_name: lastModelResult ? lastModelResult.model : '',
    notes: (document.getElementById('noteInput') as HTMLInputElement).value.trim()
  };

  const res = await AuthService.fetchWithAuth("http://127.0.0.1:8000/api/save-result/", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (data.error) {
    output.innerHTML = `<p style="color:red;">${data.error}</p>`;
  } else {
    output.innerHTML = `<p style="color:green;">Result saved successfully.</p>`;
    loadSavedResults(); // Refresh saved results
  }
}

async function loadSavedResults() {
  const container = document.getElementById("savedResultsContainer")!;
  const filterText = (document.getElementById("filterInput") as HTMLInputElement).value.toLowerCase();

  const response = await AuthService.fetchWithAuth("http://127.0.0.1:8000/api/saved-results/?page=1&page_size=100");
  if (!response || typeof response.json !== 'function') {
    container.innerHTML = `<p style="color:red;">Failed to fetch results</p>`;
    return;
  }
  
  const data = await response.json();
  if (data.error) {
    container.innerHTML = `<p style="color:red;">${data.error}</p>`;
    return;
  }

  const results = (data?.results || []).filter((r: any) =>
    r.file_name.toLowerCase().includes(filterText) ||
    r.created_at.toLowerCase().includes(filterText)
  );

  container.innerHTML = results.map(renderResultCard).join('');
}

async function editResult(id: number) {
  const notes = (document.getElementById(`editNote-${id}`) as HTMLTextAreaElement).value.trim();
  await AuthService.fetchWithAuth(`http://127.0.0.1:8000/api/saved-results/edit/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  });
  alert('Notes updated.');
  loadSavedResults();
}

async function deleteResult(id: number) {
  if (!confirm('Are you sure you want to delete this result?')) return;
  await AuthService.fetchWithAuth(`http://127.0.0.1:8000/api/saved-results/delete/${id}/`, {
    method: 'DELETE'
  });
  alert('Result deleted.');
  loadSavedResults();
}

async function downloadResult(id: number) {
  const response = await AuthService.fetchWithAuth(
    `http://127.0.0.1:8000/api/saved-results/download/${id}/`
  );
  const data = await response.json();
  // Offer the JSON blob for download:
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `result_${id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Expose inline handlers
;(window as any).editResult = editResult;
;(window as any).deleteResult = deleteResult;
;(window as any).downloadResult = downloadResult;

// ——————————————————————————————————————————————————————————————————————————
// (You can pull out these render helpers to reduce duplication.)

function renderEDAOutput(data: any) {
  return `
    <h3>EDA Report</h3>
    <p><strong>Shape:</strong> ${data.shape}</p>
    <p><strong>Columns:</strong> ${data.columns.join(', ')}</p>
    <p><strong>Inferred Target Column:</strong> ${data.inferred_target || 'None'}</p>
    <p><strong>Date Column Detected:</strong> ${data.date_column_used || 'None'}</p>
    <p><strong>Month Feature Added:</strong> ${data.month_feature_added ? 'Yes' : 'No'}</p>
    <h4>Missing Values</h4>
    <pre>${JSON.stringify(data.missing_values, null, 2)}</pre>
    <h4>Unique Values</h4>
    <pre>${JSON.stringify(data.unique_values, null, 2)}</pre>
    <h4>Data Types</h4>
    <pre>${JSON.stringify(data.dtypes, null, 2)}</pre>
    <h4>Correlation Matrix</h4>
    <pre>${JSON.stringify(data.correlation_matrix, null, 2)}</pre>
    <h4>Descriptive Statistics</h4>
    <pre>${JSON.stringify(data.descriptive_stats, null, 2)}</pre>
    <h4>Example Rows</h4>
    <pre>${JSON.stringify(data.example_rows, null, 2)}</pre>
    <h4>Graphs</h4>
    ${
      data.graphs && typeof data.graphs === 'object'
        ? Object.entries(data.graphs).map(([title, b64]) =>
            `<p><strong>${title}</strong></p>
             <img src="data:image/png;base64,${b64}" style="max-width:100%; margin-top:1rem;" />`
          ).join('')
        : '<p>No graphs available</p>'
    }
  `;
}

function renderTrainOutput(data: any) {
  return `
    <h3>Model Report</h3>
    <p><strong>Model Name:</strong> ${data.model_name}</p>
    <p><strong>Target Column:</strong> ${data.target_column}</p>
    <p><strong>Features Used:</strong> ${(data.features_used || []).join(', ')}</p>
    <p><strong>RMSE:</strong> ${data.rmse}</p>
    <p><strong>R² Score:</strong> ${data.r2_score}</p>
    <p><strong>Sample Predictions:</strong> ${Array.isArray(data.sample_predictions) ? data.sample_predictions.join(', ') : 'N/A'}</p>
    ${
      data.forecast_plot_base64
        ? `<h4>Forecast Plot</h4>
           <img src="data:image/png;base64,${data.forecast_plot_base64}" style="max-width:100%; margin-top:1rem;" />`
        : ''
    }
  `;
}

function renderResultCard(r: any) {
  return `
    <div class="result-card">
      <details>
        <summary><strong>${r.file_name}</strong> — ${new Date(r.created_at).toLocaleString()}</summary>
        <p><strong>Model:</strong> ${r.model_name || '—'}</p>
        <p><strong>Target:</strong> ${r.inferred_target || '—'}</p>
        <p><strong>Shape:</strong> ${r.data_shape || '—'}</p>
        <p><strong>Notes:</strong> <span id="note-${r.id}">${r.notes || '—'}</span></p>
        <textarea id="editNote-${r.id}" rows="2">${r.notes || ''}</textarea><br>
        <button onclick="editResult(${r.id})">Edit</button>
        <button onclick="deleteResult(${r.id})">Delete</button>
        <button onclick="downloadResult(${r.id})">Download JSON</button>
      </details>
    </div>
  `;
}
