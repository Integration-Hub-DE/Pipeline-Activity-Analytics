import * as XLSX from 'xlsx';
import type { RawRow } from '@/types';

const EXPECTED_HEADERS = [
  'PreciseTimeStamp', 'pipelineRunId', 'activityRunId', 'activityType',
  'activityName', 'pipelineName', 'status', 'dataFactoryName',
  'errorCode', 'effectiveIntegrationRuntime', 'duration', 'category',
];

function cleanHeader(h: string): string {
  return h.trim().replace(/\s+/g, '');
}

export async function parseFile(file: File): Promise<{ rows: RawRow[]; headers: string[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawHeaders: string[] = [];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    rawHeaders.push(cell ? cleanHeader(String(cell.v)) : '');
  }

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true, defval: '' });

  const rows: RawRow[] = json.map(row => {
    const obj: Record<string, unknown> = {};
    for (const h of EXPECTED_HEADERS) {
      // Try exact match first, then trimmed/cleaned match
      if (row[h] !== undefined) {
        obj[h] = row[h];
      } else {
        const cleanedKey = Object.keys(row).find(k => cleanHeader(k) === h);
        obj[h] = cleanedKey ? row[cleanedKey] : '';
      }
    }
    return {
      PreciseTimeStamp: String(obj.PreciseTimeStamp ?? ''),
      pipelineRunId: String(obj.pipelineRunId ?? ''),
      activityRunId: String(obj.activityRunId ?? ''),
      activityType: String(obj.activityType ?? ''),
      activityName: String(obj.activityName ?? ''),
      pipelineName: String(obj.pipelineName ?? ''),
      status: String(obj.status ?? ''),
      dataFactoryName: String(obj.dataFactoryName ?? ''),
      errorCode: String(obj.errorCode ?? ''),
      effectiveIntegrationRuntime: String(obj.effectiveIntegrationRuntime ?? ''),
      duration: String(obj.duration ?? ''),
      category: String(obj.category ?? ''),
    };
  });

  return { rows, headers: rawHeaders };
}
