import { google, sheets_v4 } from 'googleapis';

let sheetsClient: sheets_v4.Sheets | null = null;

export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) {
    return sheetsClient;
  }

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  try {
    const credentials = JSON.parse(serviceAccountKey);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (error) {
    console.error('Failed to initialize Google Sheets client:', error);
    throw new Error('Failed to authenticate with Google Sheets API');
  }
}

export async function getSheetNames(spreadsheetId: string): Promise<string[]> {
  const sheets = await getSheetsClient();
  
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  return response.data.sheets?.map(sheet => sheet.properties?.title || '') || [];
}

export async function getSheetData(
  spreadsheetId: string,
  sheetName: string,
  range?: string
): Promise<string[][]> {
  const sheets = await getSheetsClient();
  
  const fullRange = range ? `'${sheetName}'!${range}` : `'${sheetName}'`;
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: fullRange,
  });

  return (response.data.values as string[][]) || [];
}

export async function getAllSheetsData(
  spreadsheetId: string
): Promise<{ sheetName: string; data: string[][] }[]> {
  const sheetNames = await getSheetNames(spreadsheetId);
  
  const results = await Promise.all(
    sheetNames.map(async (sheetName) => {
      try {
        const data = await getSheetData(spreadsheetId, sheetName);
        return { sheetName, data };
      } catch (error) {
        console.error(`Failed to fetch sheet "${sheetName}":`, error);
        return { sheetName, data: [] };
      }
    })
  );

  return results;
}

// Utility to parse currency strings like "£1,234.56" or "1234.56"
export function parseCurrency(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const cleaned = String(value).replace(/[£$€,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Utility to parse time strings like "02:30:00" to hours
export function parseTimeToHours(timeStr: string | undefined): number {
  if (!timeStr) return 0;
  
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseInt(parts[2], 10) || 0;
  
  return hours + minutes / 60 + seconds / 3600;
}
