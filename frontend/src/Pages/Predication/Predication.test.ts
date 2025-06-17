/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/dom';
import { renderPredictionPage } from './Predication';
import { AuthService } from '../../Services/AuthService';

declare const global: any;

declare global {
  interface Window {
    lastEDAResult: any;
    lastModelResult: any;
    editResult?: (id: number) => Promise<void>;
    deleteResult?: (id: number) => Promise<void>;
    downloadResult?: (id: number) => Promise<void>;
  }
}

// Utility delay
const delay = (ms = 0) => new Promise(res => setTimeout(res, ms));

// Polyfill for jsdom
class FakeFileList {
  private files: File[];
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
(global as any).DataTransfer = class {
  private _files: File[] = [];
  get items() {
    return { add: (file: File) => this._files.push(file) };
  }
  get files() {
    return new FakeFileList(this._files);
  }
};
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');

// Mocks
vi.mock('./Predication.css', () => ({}));
vi.mock('../../Components/Loader/Loader.css', () => ({}));
vi.mock('../../Components/Toast/Toast', () => ({ showToast: vi.fn() }));
vi.mock('../../Components/Tour/Tour', () => ({ defineTour: () => {}, startTour: () => Promise.resolve() }));
vi.mock('../../Services/AuthService', () => ({ AuthService: { fetchWithAuth: vi.fn() } }));

const setupDOM = () => {
  document.body.innerHTML = renderPredictionPage();
};

describe('Prediction Page', () => {
  let alertMock: any;

  beforeEach(async () => {
    setupDOM();
    alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    window.lastEDAResult = null;
    window.lastModelResult = null;
    await delay(); // allow DOM listeners to attach
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('renders key sections correctly', () => {
    expect(document.querySelector('.prediction-title')?.textContent).toContain('Smart Sales Prediction');
    expect(document.getElementById('edaBtn')).toBeTruthy();
    expect(document.getElementById('trainBtn')).toBeTruthy();
    expect(document.getElementById('saveBtn')).toBeTruthy();
    expect(document.getElementById('loadResultsBtn')).toBeTruthy();
  });

  it('EDA handler shows alert if file not uploaded', () => {
    document.getElementById('edaBtn')!.click();
    expect(alertMock).toHaveBeenCalledWith('Upload a CSV file first.');
  });

  it('EDA handler fetches and displays output', async () => {
    const file = new File(['col1,col2\n1,2'], 'sales.csv', { type: 'text/csv' });
    const input = document.getElementById('fileInput') as HTMLInputElement;
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files });

    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({ json: async () => ({ shape: [10, 2], columns: ['col1', 'col2'] }) });

    document.getElementById('edaBtn')!.click();
    await delay();

    const output = document.getElementById('edaOutput')!;
    expect(output.innerHTML).toContain('col1');
  });

  it('Train model handler fetches and displays output', async () => {
    const file = new File(['col1,col2\n1,2'], 'sales.csv', { type: 'text/csv' });
    const input = document.getElementById('fileInput') as HTMLInputElement;
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files });

    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({
      json: async () => ({
        model_name: 'LinearRegression',
        accuracy: 0.92,
        sample_predictions: [100, 120],
        forecast_plot_base64: 'mock_base64',
        inferred_target: 'revenue',
        features: ['month', 'sales'],
        rmse: 3.2,
        r2_score: 0.89,
      }),
    });

    document.getElementById('trainBtn')!.click();

    await waitFor(() => {
    const output = document.getElementById('trainOutput')!;
    expect(output.innerHTML).toContain('LinearRegression');
    });
  });

  it('Save result without EDA or Train shows alert', async () => {
    window.lastEDAResult = { some: 'value' };
    window.lastModelResult = null;
    document.getElementById('saveBtn')!.click();
    expect(alertMock).toHaveBeenCalledWith('Upload a CSV file first.');
  });

  it('Displays saved results after loading', async () => {
    const resData = [{ id: 1, file_name: 'sales.csv', created_at: '2024-01-01', model_name: '', inferred_target: '', data_shape: '', notes: '' }];
    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({ json: async () => ({ results: resData }) });

    document.getElementById('loadResultsBtn')!.click();
    await delay();

    const container = document.getElementById('savedResultsContainer')!;
    expect(container.innerHTML).toContain('sales.csv');
  });

  it('Edits a result note', async () => {
    const resData = [{ id: 1, file_name: 'sales.csv', created_at: '2024-01-01', model_name: '', inferred_target: '', data_shape: '', notes: 'initial' }];
    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({ json: async () => ({ results: resData }) });

    document.getElementById('loadResultsBtn')!.click();
    await delay();

    const textarea = document.getElementById('editNote-1') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    textarea.value = 'updated';

    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({ json: async () => ({}) });
    await window.editResult?.(1);
    expect(alertMock).toHaveBeenCalledWith('Notes updated.');
  });

  it('Deletes a result', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    // Mock DELETE response
    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({
      json: async () => ({}),
    });

    // Mock reload after delete
    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({
      json: async () => ({
        results: [],
      }),
    });

    await window.deleteResult?.(1);
    expect(alertMock).toHaveBeenCalledWith('Result deleted.');
  });


  it('Triggers download of JSON file', async () => {
    const clickSpy = vi.fn();
    const anchor = document.createElement('a');
    anchor.click = clickSpy;

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
    vi.spyOn(document, 'createElement').mockReturnValue(anchor as any);

    // Mock download fetch
    (AuthService.fetchWithAuth as any).mockResolvedValueOnce({
      json: async () => ({
        eda_report: '<p>EDA</p>',
        model_report: '<p>Model</p>',
        notes: 'test',
      }),
    });

    await window.downloadResult?.(1);
    expect(clickSpy).toHaveBeenCalled();
  });

});
