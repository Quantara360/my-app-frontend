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
  openingBalance: number,
  // Bank still computes New Balance = Previous + Credit - Debit, the
  // opposite of standard accounting for a cash/asset account (where Debit
  // increases the balance) - so its stored debit/credit fields are
  // effectively swapped relative to the real-world terms, and this export
  // has always corrected that by swapping the column labels back. Cash in
  // Hand's own formula was changed to New Balance = Previous + Debit -
  // Credit (see cash-in-hand.tsx), which already matches standard
  // accounting directly - swapping its labels here would now un-fix it.
  // Defaults to true so Bank's existing call site needs no change.
  swapDebitCreditLabels: boolean = true
) {
  // Loaded lazily - xlsx is a large library and every other screen was
  // paying its bundle-eval cost at startup for a feature only this export
  // path uses.
  const XLSX = await import('xlsx');

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
    // See swapDebitCreditLabels comment above the function signature.
    const debitCol = swapDebitCreditLabels ? (entry.credit || 0) : (entry.debit || 0);
    const creditCol = swapDebitCreditLabels ? (entry.debit || 0) : (entry.credit || 0);
    totalDebit += debitCol;
    totalCredit += creditCol;
    const currentBalance = entry.runningBalance !== undefined ? entry.runningBalance : entry.balance;
    finalBalance = currentBalance;

    const debitVal = swapDebitCreditLabels ? entry.credit : entry.debit;
    const creditVal = swapDebitCreditLabels ? entry.debit : entry.credit;
    data.push([
      entry.date || '',
      entry.chequeNo || '',
      entry.description || '',
      debitVal !== null && debitVal !== undefined ? debitVal : '',
      creditVal !== null && creditVal !== undefined ? creditVal : '',
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
