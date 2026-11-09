/** Reject generated lettering before an illustration can be stored or displayed. */
export async function isTextFree(dataUri: string): Promise<boolean> {
  const content = dataUri.split(',')[1]
  if (!content) return false
  const googleKey = process.env.GOOGLE_CLOUD_API_KEY
  if (googleKey) {
    try {
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(googleKey)}`, {
        method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),
        body:JSON.stringify({requests:[{image:{content},features:[{type:'TEXT_DETECTION'}]}]})
      })
      const data = await response.json()
      if (response.ok && data.responses?.[0] && !data.responses[0].error) return !data.responses[0].textAnnotations?.length
    } catch { /* Fall back to the configured vision model. */ }
  }
  if (!process.env.OPENROUTER_API_KEY) return false
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`},
      signal:AbortSignal.timeout(45000),body:JSON.stringify({model:process.env.OPENROUTER_VISION_MODEL_ID || 'google/gemini-2.5-flash-lite',temperature:0,max_tokens:8,
        messages:[{role:'user',content:[{type:'text',text:'Inspect actual readable lettering in this image. Reply TEXT only when text, letters, captions, numbers, writing or a watermark are clearly visible. Do not mistake natural textures, folds, branches, wool or shapes for lettering; do not imagine or infer writing. If no actual lettering is visible, reply CLEAR. Only one word.'},{type:'image_url',image_url:{url:dataUri}}]}]})
    })
    const data = await response.json()
    const answer=data.choices?.[0]?.message?.content?.trim().toUpperCase()
    if(answer==='TEXT') console.warn('[Image verification] Lettering detected')
    if(!response.ok) console.warn('[Image verification] OpenRouter unavailable; status',response.status)
    else if(answer!=='CLEAR' && answer!=='TEXT') console.warn('[Image verification] Unrecognized result')
    return response.ok && answer === 'CLEAR'
  } catch { return false }
}
