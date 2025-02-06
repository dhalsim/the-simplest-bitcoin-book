export async function getBalance(nwcClient) {
  const response = await nwcClient.getBalance();
    
  return response;
}
