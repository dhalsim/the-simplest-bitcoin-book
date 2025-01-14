export async function verifyTurnstileToken(token, env) {
  if (!token) {
    console.error('Missing Turnstile token');
    
    throw new Error("Verification required");
  }

  const formData = new URLSearchParams();
  
  formData.append('secret', env.TURNSTILE_SECRET);
  formData.append('response', token);

  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  const outcome = await result.json();
  
  console.log('Turnstile verification result:', outcome);

  if (!outcome.success) {
    console.error('Turnstile verification failed:', outcome);
    
    throw new Error("Verification failed");
  }

  return outcome;
} 
