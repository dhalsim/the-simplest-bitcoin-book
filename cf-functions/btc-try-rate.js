export async function getBtcTryRate() {
  const response = await fetch('https://api.btcturk.com/api/v2/ticker?pairSymbol=BTCTRY');
  const body = await response.json();
  
  return body.data[0].last;
}

export async function handleBtcTryRate() {
  try {
    const rate = await getBtcTryRate();
    
    return new Response(rate, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
