import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { numberToWords } from './numberToWords';

export type VoucherData = {
  id: string | number;
  date: string;
  payee: string;
  particulars: string;
  accountHead: string;
  grossAmount: number;
  vatRegNo?: string;
  vatPaid?: number;
};

export function generateVoucherHtml(data: VoucherData): string {
  const vatPaidVal = data.vatPaid || 0;
  const netTotal = data.grossAmount + vatPaidVal;
  
  const amountStr = data.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const vatPaidStr = vatPaidVal > 0 ? vatPaidVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
  const netTotalStr = netTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const amountWords = numberToWords(netTotal);

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @page { margin: 20px; size: A5 landscape; }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px;
            color: #000;
            font-size: 12px;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 5px;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            margin: 0;
          }
          .sr-box {
            border: 1px solid #000;
            padding: 5px 10px;
            text-align: right;
            width: 150px;
          }
          .sr-box .sr-label {
            float: left;
            font-weight: bold;
            font-size: 12px;
          }
          .sr-box .sr-value {
            font-size: 18px;
            font-weight: bold;
          }
          .top-row {
            display: flex;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            margin-bottom: 0px;
          }
          .payee-box {
            flex: 1;
            padding: 5px;
            border-right: 1px solid #000;
            border-left: 1px solid #000;
          }
          .date-box {
            width: 200px;
            padding: 5px;
            border-right: 1px solid #000;
          }
          .dotted-line {
            border-bottom: 1px dotted #000;
            display: inline-block;
            min-width: 150px;
            height: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-top: 0;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
          }
          th {
            font-weight: bold;
            text-align: center;
          }
          .particulars-col { width: 50%; }
          .account-col { width: 25%; text-align: center; }
          .amount-col { width: 25%; text-align: right; }
          
          .main-row td {
            height: 100px;
            vertical-align: top;
          }
          .dotted-bg {
            background-image: linear-gradient(to right, #000 10%, rgba(255, 255, 255, 0) 0%);
            background-position: bottom;
            background-size: 5px 1px;
            background-repeat: repeat-x;
            line-height: 25px;
            display: inline-block;
            width: 100%;
          }
          .amount-text {
            border-bottom: 1px dotted #000;
            padding-bottom: 2px;
            width: 100%;
            display: inline-block;
            text-align: right;
          }
          .footer-section {
            display: flex;
            border: 1px solid #000;
            border-top: none;
          }
          .rupees-box {
            flex: 1;
            padding: 10px;
            border-right: 1px solid #000;
            line-height: 25px;
          }
          .signatures-container {
            width: 350px;
            display: flex;
            flex-direction: column;
          }
          .sign-row-1 {
            display: flex;
            border-bottom: 1px solid #000;
          }
          .sign-box {
            flex: 1;
            padding: 5px;
            text-align: center;
            border-right: 1px solid #000;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 60px;
          }
          .sign-box:last-child {
            border-right: none;
          }
          .sign-label {
            font-size: 10px;
          }
          .sign-bottom {
            font-size: 10px;
          }
          .received-box {
            padding: 5px;
            height: 60px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .received-text {
            font-size: 10px;
          }
          .full-sign-text {
            font-size: 10px;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div style="text-align: right; font-size: 10px; margin-bottom: 2px;">Form No. ............</div>
        <div class="header-container">
          <div class="title">AMIL JANITORIAL SERVICE - PETTY CASH VOUCHER</div>
          <div class="sr-box">
            <span class="sr-label">SR No.</span>
            <span class="sr-value">${data.id.toString().padStart(4, '0')}</span>
          </div>
        </div>

        <div class="top-row">
          <div class="payee-box">
            <strong>Name of payee:</strong> <span class="dotted-line" style="width: 80%;">${data.payee}</span>
          </div>
          <div class="date-box">
            <strong>Date paid:</strong> <span class="dotted-line" style="width: 100px; text-align: center;">${data.date}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="particulars-col">P A R T I C U L A R S</th>
              <th class="account-col">ACCOUNT HEAD</th>
              <th class="amount-col">GROSS AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr class="main-row">
              <td>
                <span class="dotted-bg" style="font-size: 14px; margin-top: 5px;">${data.particulars}</span>
                <span class="dotted-bg">&nbsp;</span>
                <span class="dotted-bg">&nbsp;</span>
                <span class="dotted-bg">&nbsp;</span>
              </td>
              <td style="text-align: center; vertical-align: top; padding-top: 15px;">
                <span class="dotted-bg">${data.accountHead || '&nbsp;'}</span>
              </td>
              <td style="text-align: right; vertical-align: top; padding-top: 15px;">
                <span class="amount-text">${amountStr}</span>
                <br><br>
                <span class="amount-text">&nbsp;</span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="border-right: none;">
                Supplier's VAT Registration No. <span class="dotted-line" style="width: 200px; text-align: center;">${data.vatRegNo || ''}</span>
                <span style="float: right;">ADD: &nbsp;&nbsp;&nbsp;VAT PAID</span>
              </td>
              <td style="border-left: 1px solid #000; text-align: right;">
                ${vatPaidStr}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="border-right: none; text-align: right; font-weight: bold;">
                NET TOTAL
              </td>
              <td style="border-left: 1px solid #000; text-align: right; font-weight: bold;">
                ${netTotalStr}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="footer-section">
          <div class="rupees-box">
            Rupees <span class="dotted-bg" style="width: 90%; font-size: 13px;">${amountWords}</span><br>
            <span class="dotted-bg">&nbsp;</span><br>
            <span class="dotted-bg">&nbsp;</span><br>
            <span class="dotted-bg">&nbsp;</span>
          </div>
          
          <div class="signatures-container">
            <div class="sign-row-1">
              <div class="sign-box">
                <div class="sign-label">Prepared by</div>
                <div class="sign-bottom">Signature & Date</div>
              </div>
              <div class="sign-box">
                <div class="sign-label">Approval of MD</div>
                <div class="sign-bottom">Signature of MD & Date</div>
              </div>
            </div>
            <div class="received-box">
              <div class="received-text">
                Received with thanks the sum<br>
                of Rs. .........................
              </div>
              <div class="full-sign-text">
                Full sign. of payee / rep & date
              </div>
            </div>
          </div>
        </div>

      </body>
    </html>
  `;
}

export async function generateAndShareVoucher(data: VoucherData) {
  const html = generateVoucherHtml(data);
  try {
    if (Platform.OS === 'web') {
      const html2pdf = require('html2pdf.js');
      html2pdf().from(html).set({
        margin: 0,
        filename: `PettyCash_Voucher_${data.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'pt', format: [794, 559], orientation: 'landscape' }
      }).save();
    } else {
      // Native mobile (iOS / Android): generate PDF file, then open native share sheet
      const { uri } = await Print.printToFileAsync({
        html,
        width: 794,  // A5 landscape in points (595 x 420 → but 794x559 for A4, A5 is ~559×397)
        height: 559
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Petty Cash Voucher – ${data.id}`,
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (err) {
    console.error('Error generating PDF', err);
  }
}
