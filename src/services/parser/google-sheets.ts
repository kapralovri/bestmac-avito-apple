import axios from 'axios';
import * as XLSX from 'xlsx';

export interface SheetConfig {
  model: string;
  config: string;
  searchUrl: string;
}

export async function fetchSheetData(sheetUrl: string): Promise<SheetConfig[]> {
  try {
    // Convert regular Google Sheets URL to export URL
    const exportUrl = sheetUrl.replace(/\/edit.*$/, '/export?format=xlsx');
    const response = await axios.get(exportUrl, { responseType: 'arraybuffer' });
    const workbook = XLSX.read(response.data);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    return data.map(row => ({
      model: row['Модель'] || row['Model'],
      config: row['Конфигурация'] || row['Config'],
      searchUrl: row['Ссылка'] || row['URL'] || row['Link']
    })).filter(item => item.searchUrl);
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return [];
  }
}
