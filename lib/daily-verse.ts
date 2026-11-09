// Curated LifeStages fallback schedule, not a claim about YouVersion's schedule.
const FALLBACK_VERSES=[
  { reference: "Psalm 23:1", text: "The Lord is my shepherd, I lack nothing.", version: "NIV" },
  { reference: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", version: "NIV" },
  { reference: "Philippians 4:13", text: "I can do all this through him who gives me strength.", version: "NIV" },
  { reference: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", version: "NIV" },
  { reference: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", version: "NIV" },
  { reference: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", version: "NIV" },
  { reference: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", version: "NIV" },
]
export function scheduledFallback(date:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid date');const index=Math.floor(Date.parse(date+'T00:00:00Z')/86400000)%FALLBACK_VERSES.length;return {...FALLBACK_VERSES[index],source:'lifestages-curated'}}
