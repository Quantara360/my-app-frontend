export function numberToWords(amount: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(num: number): string {
    let words = '';
    if (num > 99) {
      words += units[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num > 9 && num < 20) {
      words += teens[num - 10] + ' ';
    } else {
      if (num > 19) {
        words += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      }
      if (num > 0) {
        words += units[num] + ' ';
      }
    }
    return words;
  }

  if (amount === 0) return 'Zero Rupees Only';

  let words = '';
  const wholePart = Math.floor(amount);
  const decimalPart = Math.round((amount - wholePart) * 100);

  if (wholePart > 0) {
    let currentPart = wholePart;
    let chunkCount = 0;

    const chunks = [];
    while (currentPart > 0) {
      const chunk = chunkCount === 1 ? currentPart % 100 : currentPart % 1000;
      chunks.push(chunk);
      currentPart = Math.floor(currentPart / (chunkCount === 1 ? 100 : 1000));
      chunkCount++;
    }

    const scales = ['', 'Thousand', 'Lakh', 'Crore'];

    for (let i = chunks.length - 1; i >= 0; i--) {
      if (chunks[i] > 0) {
        words += convertChunk(chunks[i]) + scales[i] + ' ';
      }
    }
    words = words.trim() + ' Rupees';
  }

  if (decimalPart > 0) {
    if (words !== '') words += ' and ';
    words += convertChunk(decimalPart).trim() + ' Cents';
  }

  return words + ' Only';
}
