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

function formatExcelDuration(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'number' && Number.isFinite(value)) {
    const totalSeconds = Math.round(value * 86400);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const dayStart = Date.UTC(1899, 11, 30);
    const elapsedDays = Math.max(0, Math.floor((value.getTime() - dayStart) / 86400000));
    const totalSeconds = elapsedDays * 86400 + value.getUTCHours() * 3600 + value.getUTCMinutes() * 60 + value.getUTCSeconds();
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return String(value);
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
      if (row[h] !== undefined) {
        obj[h] = row[h];
      } else {
        const cleanedKey = Object.keys(row).find(k => cleanHeader(k) === h);
        obj[h] = cleanedKey ? row[cleanedKey] : '';
      }
    }

    const durationStr = formatExcelDuration(obj.duration);

    let timestampStr = String(obj.PreciseTimeStamp ?? '');
    const tsRaw = obj.PreciseTimeStamp;
    if (tsRaw instanceof Date) {
      timestampStr = tsRaw.toISOString();
    }

    return {
      PreciseTimeStamp: timestampStr,
      pipelineRunId: String(obj.pipelineRunId ?? ''),
      activityRunId: String(obj.activityRunId ?? ''),
      activityType: String(obj.activityType ?? ''),
      activityName: String(obj.activityName ?? ''),
      pipelineName: String(obj.pipelineName ?? ''),
      status: String(obj.status ?? ''),
      dataFactoryName: String(obj.dataFactoryName ?? ''),
      errorCode: String(obj.errorCode ?? ''),
      effectiveIntegrationRuntime: String(obj.effectiveIntegrationRuntime ?? ''),
      duration: durationStr,
      category: String(obj.category ?? ''),
    };
  });

  return { rows, headers: rawHeaders };
}
