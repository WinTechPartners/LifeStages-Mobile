/** The image provider receives visual descriptions only, never the source passage. */
export function cleanVisualScene(value: string): string {
  return value.replace(/NO\s+(?:TEXT|WORDS|LETTERS|WRITING|CAPTIONS|LABELS)\b/gi, '')
    .replace(/^(?:IMAGE|PROMPT|SCENE)\s*:\s*/i, '').trim()
}
export function visualImageRequest(scene: string, model: string, width: number, height: number) {
  return { model, positivePrompt: `${cleanVisualScene(scene)}, visual-only composition, cinematic lighting`, width, height, numberResults: 1, outputType: 'dataURI' as const, outputFormat: 'JPG' as const }
}
