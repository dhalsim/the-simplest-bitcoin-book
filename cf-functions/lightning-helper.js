export async function createLightningInvoice(milliSatsAmount, orderNumber) {
  const lnurl = "https://blink.sv/.well-known/lnurlp/dhalsim";
  const res = await fetch(lnurl);
  const body = await res.json();

  const url = `${body.callback}?amount=${milliSatsAmount}&comment=${orderNumber}`;
  const res2 = await fetch(url);
  const { pr: invoice } = await res2.json();

  return invoice;
}

export function calculateLightningAmount(totalAmountTL, btcToTryRate) {
  const hundredMillion = 100 * 1000 * 1000;
  const satsAmount = Math.round(totalAmountTL / btcToTryRate * hundredMillion);
  const milliSatsAmount = satsAmount * 1000;
  
  return {
    satsAmount,
    milliSatsAmount
  };
} 