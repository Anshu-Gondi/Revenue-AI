/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/dom';
import { renderPredictionPage } from './Predication';
import { AuthService } from '../../Services/AuthService';

// Utils
const delay = (ms = 0) => new Promise(res => setTimeout(res, ms));

// Mocks
vi.mock('./Predication.css', () => ({}));
vi.mock('../../Components/Loader/Loader.css', () => ({}));
vi.mock('../../Components/Toast/Toast', () => ({ showToast: vi.fn() }));
vi.mock('../../Components/Tour/Tour', () => ({ defineTour: () => {}, startTour: () => Promise.resolve() }));
vi.mock('../../Services/AuthService', () => ({ AuthService: { fetchWithAuth: vi.fn() } }));

// Polyfills for jsdom
class FakeFileList {
  files: File[];
  length: number;

  constructor(files: File[]) {
    this.files = files;
    this.length = files.length;
  }

  item(index: number): File | null {
    return this.files[index] || null;
  }

  [Symbol.iterator]() {
    return this.files[Symbol.iterator]();
  }
}


(globalThis as any).DataTransfer = class {
  private _files: File[] = [];
  get items() {
    return {
      add: (file: File) => this._files.push(file),
    };
  }
  get files() {
    return new FakeFileList(this._files);
  }
};

(globalThis.URL.createObjectURL as any) = vi.fn().mockReturnValue('blob:mock-url');

const setupDOM = () => {
  document.body.innerHTML = renderPredictionPage();
};

describe('Prediction Page - Updated Tests', () => {
  let alertMock: any;

  beforeEach(async () => {
    setupDOM();
    alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    (window as any).lastEDAResult = null;
    (window as any).lastModelResult = null;
    await delay(); // Let events bind
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('renders prediction UI', () => {
    expect(document.querySelector('.prediction-title')?.textContent).toContain('Smart Sales Prediction');
  });

  it('EDA handler shows alert if no file selected', () => {
    document.getElementById('edaBtn')!.click();
    expect(alertMock).toHaveBeenCalledWith('Upload a CSV file first.');
  });

  it('handles EDA response with full updated fields', async () => {
    const file = new File(['col1,col2\n1,2'], 'data.csv', { type: 'text/csv' });
    const input = document.getElementById('fileInput') as HTMLInputElement;
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files });

    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({
      json: async () => ({
        shape: [10, 3],
        columns: ['col1', 'col2', 'target'],
        inferred_target: 'target',
        date_column_used: 'date',
        month_feature_added: true,
        missing_values: { col1: 0 },
        unique_values: { col1: 10 },
        dtypes: { col1: 'int' },
        correlation_matrix: { col1: { col1: 1.0 } },
        descriptive_stats: { col1: { mean: 5 } },
        example_rows: [{ col1: 1 }],
        graphs: {
          'Target Distribution': 'fake_base64_1',
          'Feature Correlation': 'fake_base64_2',
        },
      }),
    });

    document.getElementById('edaBtn')!.click();
    await delay();

    const output = document.getElementById('edaOutput')!;
    expect(output.innerHTML).toContain('Target Distribution');
    expect(output.innerHTML).toContain('col1');
  });

  it('trains model and renders full response', async () => {
    const file = new File(['col1,col2,target\n1,2,3'], 'train.csv', { type: 'text/csv' });
    const input = document.getElementById('fileInput') as HTMLInputElement;
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files });

    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({
      json: async () => ({
        model_name: 'random_forest',
        target_column: 'target',
        features_used: ['col1', 'col2'],
        rmse: 2.4,
        r2_score: 0.91,
        sample_predictions: [10, 12, 14],
        forecast_plot_base64: 'fake_img_string',
        diagnostic_graphs: {
          residuals_plot: 'fake_base64_residuals',
          pred_vs_actual: 'fake_base64_pred_actual',
          feature_importance: 'fake_base64_importance',
          learning_curve: 'fake_base64_curve',
          error_histogram: 'fake_base64_hist',
          shap_summary: 'fake_base64_shap',
        },
      }),
    });

    document.getElementById('trainBtn')!.click();
    await waitFor(() => {
      const out = document.getElementById('trainOutput')!;
      expect(out.innerHTML).toContain('random_forest');
      expect(out.innerHTML).toContain('target');
      expect(out.innerHTML).toContain('Residuals vs Predicted');
      expect(out.innerHTML).toContain('Predicted vs Actual');
      expect(out.innerHTML).toContain('Feature Importances');
      expect(out.innerHTML).toContain('Learning Curve');
      expect(out.innerHTML).toContain('SHAP Summary');
    });
  });

  it('prevents saving if no CSV uploaded', () => {
    (window as any).lastEDAResult = { inferred_target: 'target' };
    (window as any).lastModelResult = null;
    document.getElementById('saveBtn')!.click();
    expect(alertMock).toHaveBeenCalledWith('Upload a CSV file first.');
  });

  it('loads and filters saved results correctly', async () => {
    const mockResult = [
      {
        id: 1,
        file_name: 'sales.csv',
        created_at: '2024-01-01T00:00:00Z',
        model_name: 'xgboost',
        inferred_target: 'revenue',
        data_shape: '[100,5]',
        notes: 'Mock result',
      },
    ];

    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({
      json: async () => ({ results: mockResult }),
    });

    document.getElementById('loadResultsBtn')!.click();
    await delay();

    const container = document.getElementById('savedResultsContainer')!;
    expect(container.innerHTML).toContain('sales.csv');
  });

  it('edits a saved result note', async () => {
    const mockResult = [
      {
        id: 1,
        file_name: 'sales.csv',
        created_at: '2024-01-01',
        notes: 'initial',
      },
    ];
    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({ json: async () => ({ results: mockResult }) });

    document.getElementById('loadResultsBtn')!.click();
    await delay();

    const textarea = document.getElementById('editNote-1') as HTMLTextAreaElement;
    textarea.value = 'updated note';

    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({ json: async () => ({}) });
    await (window as any).editResult?.(1);
    expect(alertMock).toHaveBeenCalledWith('Notes updated.');
  });

  it('deletes a result with confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({ json: async () => ({}) }); // delete
    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({ json: async () => ({ results: [] }) }); // reload

    await (window as any).deleteResult?.(1);
    expect(alertMock).toHaveBeenCalledWith('Result deleted.');
  });

  it('downloads a saved result as JSON', async () => {
    const clickSpy = vi.fn();
    const a = document.createElement('a');
    a.click = clickSpy;
    vi.spyOn(document, 'createElement').mockReturnValue(a as any);

    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({
      json: async () => ({
        eda_report: '<div>EDA</div>',
        model_report: '<div>Model</div>',
        notes: 'test notes',
      }),
    });

    await (window as any).downloadResult?.(1);
    expect(clickSpy).toHaveBeenCalled();
  });
});
