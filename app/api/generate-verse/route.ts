import { scheduledFallback, webPassage } from '@/lib/web-scripture'
const THEME_VERSES: Record<string, string> = {
  // MONDAY - Mission Mode (The Launch)
  "Diligence": "Colossians 3:23-24",      // Work as for the Lord
  "Focus": "Philippians 3:13-14",         // Forgetting what's behind, pressing on
  "Integrity": "Proverbs 11:3",           // Integrity guides the upright
  "Wisdom": "James 1:5",                  // If any lacks wisdom, ask God
  "Obedience": "James 1:22",              // Be doers of the word
  
  // TUESDAY - Endurance Mode (The Grind)
  "Strength": "Isaiah 40:31",             // Renew their strength
  "Patience": "James 1:2-4",              // Testing produces perseverance
  "Perseverance": "Galatians 6:9",        // Don't grow weary doing good
  "Trust": "Proverbs 3:5-6",              // Trust with all your heart
  "Hope": "Romans 15:13",                 // God of hope fill you
  
  // WEDNESDAY - Battle Mode (The Hump)
  "Courage": "Joshua 1:9",                // Be strong and courageous
  "Boldness": "Acts 4:29-31",             // Speak your word with boldness
  "Identity": "Ephesians 2:10",           // We are God's handiwork
  "Discernment": "Hebrews 5:14",          // Trained to distinguish good from evil
  "Accountability": "Proverbs 27:17",     // Iron sharpens iron
  
  // THURSDAY - Community Mode (The People)
  "Compassion": "Colossians 3:12",        // Clothe yourselves with compassion
  "Service": "Galatians 5:13",            // Serve one another in love
  "Kindness": "Ephesians 4:32",           // Be kind to one another
  "Generosity": "2 Corinthians 9:7",      // God loves a cheerful giver
  "Unity": "Ephesians 4:2-3",             // Keep the unity of the Spirit
  
  // FRIDAY - Guardrails Mode (The Temptation)
  "Joy": "Nehemiah 8:10",                 // Joy of the Lord is strength
  "Self-Control": "Galatians 5:22-23",    // Fruit of the Spirit
  "Contentment": "Philippians 4:11-12",   // Learned to be content
  "Gratitude": "1 Thessalonians 5:18",    // Give thanks in all circumstances
  "Purity": "Psalm 51:10",                // Create in me a pure heart
  
  // SATURDAY - Recovery Mode (The Reset)
  "Rest": "Matthew 11:28-30",             // Come to me, I will give rest
  "Peace": "Philippians 4:6-7",           // Peace that transcends understanding
  "Humility": "Philippians 2:3-4",        // Value others above yourself
  "Forgiveness": "Colossians 3:13",       // Forgive as the Lord forgave
  "Silence": "Psalm 46:10",               // Be still and know
  
  // SUNDAY - Foundation Mode (The Core)
  "Faith": "Hebrews 11:1",                // Confidence in what we hope for
  "Love": "1 Corinthians 13:4-7",         // Love is patient, love is kind
  "Grace": "Ephesians 2:8-9",             // By grace you have been saved
  "Repentance": "2 Chronicles 7:14",      // If my people humble themselves
  "Worship": "Psalm 95:6-7",              // Come let us worship and bow down
}


export async function POST(request: Request) {
 try {
  const {source, verseQuery}=await request.json()
  const reference=verseQuery || (typeof source==='string' && source.startsWith('Theme:') ? THEME_VERSES[source.slice(6)] : null)
  if(reference) return Response.json(await webPassage(reference))
  if(typeof source==='string' && source.startsWith('Theme:')) return Response.json({error:'Unknown theme'},{status:400})
  return Response.json(scheduledFallback(new Date().toISOString().slice(0,10)))
 } catch { return Response.json({error:'Unable to retrieve WEB Scripture. Please try again.'},{status:503}) }
}
