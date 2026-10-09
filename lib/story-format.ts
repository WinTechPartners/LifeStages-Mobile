export const STORY_FORMAT = 'modern-two-images-v2'
export function modernStoryVariant(value: unknown) {
  if (value === 'modern-1' || value === 'contemporary') return 'modern-1'
  if (value === 'modern-2' || value === 'historical') return 'modern-2'
  return null
}
export function validateModernStory(value: any) {
  for (const key of ['title', 'firstHalf', 'secondHalf', 'imagePrompt', 'midImagePrompt']) {
    if (typeof value?.[key] !== 'string' || !value[key].trim()) throw Error('Incomplete story')
  }
  return { title: value.title.trim(), firstHalf: value.firstHalf.trim(), secondHalf: value.secondHalf.trim(), text: value.firstHalf.trim() + '\n\n' + value.secondHalf.trim(), imagePrompt: value.imagePrompt.trim(), midImagePrompt: value.midImagePrompt.trim(), format: STORY_FORMAT }
}
