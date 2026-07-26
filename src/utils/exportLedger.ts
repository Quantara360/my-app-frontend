import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type LedgerEntry = {
  date: string;
  chequeNo: string | null;
  description: string | null;
  debit: number | null;
  credit: number | null;
  balance: number;
  runningBalance?: number;
};

export async function exportLedgerToExcel(
  filename: string,
  entries: LedgerEntry[],
  openingBalance: number
) {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let monthYearHeading = '';
  if (entries.length > 0 && entries[0].date) {
    const d = new Date(entries[0].date);
    monthYearHeading = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  } else {
    const d = new Date();
    monthYearHeading = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  }

  // We will build an array of arrays representing the sheet rows.
  // 1. Header row
  const data: any[][] = [
    [monthYearHeading, '', '', '', '', ''],
    ['Date', 'Cheque No', 'Description', 'Debit', 'Credit', 'Balance']
  ];

  // 2. Opening Balance Row
  // We place it in Debit if > 0, Credit if < 0.
  const obDebit = openingBalance >= 0 ? openingBalance : null;
  const obCredit = openingBalance < 0 ? Math.abs(openingBalance) : null;
  
  data.push([
    '', // Date empty or could be first day of month
    '', // Cheque No
    'Opening Balance Equity', // as requested/shown in image
    obDebit !== null ? obDebit : '',
    obCredit !== null ? obCredit : '',
    openingBalance
  ]);

  // 3. Entries
  let totalDebit = 0;
  let totalCredit = 0;
  let finalBalance = openingBalance;

  entries.forEach((entry) => {
    // entry.credit in DB corresponds to the user's "Debit" concept
    // entry.debit in DB corresponds to the user's "Credit" concept
    totalDebit += entry.credit || 0;
    totalCredit += entry.debit || 0;
    const currentBalance = entry.runningBalance !== undefined ? entry.runningBalance : entry.balance;
    finalBalance = currentBalance;

    data.push([
      entry.date || '',
      entry.chequeNo || '',
      entry.description || '',
      entry.credit !== null && entry.credit !== undefined ? entry.credit : '',
      entry.debit !== null && entry.debit !== undefined ? entry.debit : '',
      currentBalance
    ]);
  });

  // 4. Totals Row
  data.push([
    '',
    '',
    '',
    totalDebit,
    totalCredit,
    finalBalance
  ]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Merge A1:F1 for the month/year heading
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ledger');

  // Format as Excel file
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const safeFilename = `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`;

  if (Platform.OS === 'web') {
    // For web, use browser download
    const byteCharacters = atob(wbout);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    // For iOS/Android
    const fileUri = FileSystem.documentDirectory + safeFilename;
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64
    });
    await Sharing.shareAsync(fileUri);
  }
}
