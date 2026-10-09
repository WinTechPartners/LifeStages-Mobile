import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Bible.com Companion App | Personalize Your YouVersion Experience | Bible for Life Stages",
  description: "Make Bible.com's Verse of the Day personal. AI-powered companion that takes YouVersion's daily scripture and tailors it to YOUR age, gender, and life stage. Free.",
  keywords: [
    "Bible.com companion",
    "YouVersion personalization", 
    "personalize Bible.com",
    "Bible.com for parents",
    "YouVersion companion app",
    "make Bible app personal",
    "Bible.com alternative",
    "enhance YouVersion",
    "AI Bible devotional"
  ],
  openGraph: {
    title: "Bible.com Companion | Make YouVersion Personal",
    description: "Love Bible.com? Make it personal. AI-powered devotionals that take YouVersion's Verse of the Day and tailor it to YOUR life stage.",
    url: "https://www.bibleforlifestages.com/bible-com-companion",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bible.com Companion | Personalize YouVersion",
    description: "AI companion that makes Bible.com's daily verse speak to YOUR life",
  },
  alternates: {
    canonical: "https://www.bibleforlifestages.com/bible-com-companion",
  },
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is Bible for Life Stages affiliated with Bible.com or YouVersion?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No, Bible for Life Stages is an independent app. We are not affiliated with, endorsed by, or partnered with Life.Church, YouVersion, or Bible.com. We built a companion tool that enhances the Bible.com experience with AI personalization."
      }
    },
    {
      "@type": "Question", 
      "name": "Do I need Bible.com to use Bible for Life Stages?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No, you don't need Bible.com installed. We pull the same Verse of the Day and add personalized context. However, we encourage using both apps together for the best experience."
      }
    },
    {
      "@type": "Question",
      "name": "How does Bible for Life Stages personalize my devotional?",
      "acceptedAnswer": {
        "@type": "Answer", 
        "text": "You set up a simple profile with your age, gender, and current life stage (new parent, empty nester, career change, etc.). Our AI then generates devotional context specifically for YOUR situation, making the daily verse speak directly to where you are in life."
      }
    },
    {
      "@type": "Question",
      "name": "Is Bible for Life Stages free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! The core personalized daily devotional is completely free. Premium features like audio devotionals, extended reflections, and verse search are available with an optional subscription."
      }
    }
  ]
}

export default function BibleComCompanionPage() {
  const lifeStages = [
    { emoji: "👶", label: "New Parents", href: "/life-stages/new-parents" },
    { emoji: "🏠", label: "Empty Nesters", href: "/life-stages/empty-nesters" },
    { emoji: "💼", label: "Career Change", href: "/life-stages/career-transition" },
    { emoji: "💔", label: "Grief & Loss", href: "/life-stages/grief-loss" },
    { emoji: "🌅", label: "Retirement", href: "/life-stages/retirement" },
    { emoji: "💍", label: "Newlyweds", href: "/life-stages/newlywed" },
    { emoji: "🎓", label: "New Graduates", href: "/life-stages/new-graduate" },
    { emoji: "🌱", label: "Healing Journey", href: "/life-stages/divorce-recovery" },
  ]

  const comparisonData = [
    { feature: "Daily Verse", biblecom: "✓ Trusted selection", us: "✓ Same verse", usHighlight: false },
    { feature: "Multiple Translations", biblecom: "✓ Extensive", us: "✓ Key translations", usHighlight: false },
    { feature: "Reading Plans", biblecom: "✓ Thousands", us: "— Focus on daily verse", usHighlight: false },
    { feature: "Community Features", biblecom: "✓ Robust", us: "— Individual focus", usHighlight: false },
    { feature: "Life-Stage Personalization", biblecom: "— plans", us: "✓ AI-powered", usHighlight: true },
    { feature: "Age-Appropriate Context", biblecom: "— Same for all", us: "✓ Dynamic", usHighlight: true },
    { feature: "Situation-Aware Reflection", biblecom: "— Manual selection", us: "✓ Automatic", usHighlight: true },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      <main className="min-h-screen bg-gradient-to-b from-[#0c1929] to-slate-900">
        {/* Hero Section */}
        <section className="px-6 py-16 max-w-4xl mx-auto text-center">
          <p className="text-amber-400 text-sm uppercase tracking-wider mb-4">
            The AI Companion for Bible.com Users
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Love Bible.com?<br />
            <span className="text-amber-400">Make It Personal.</span>
          </h1>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Take YouVersion&apos;s trusted Verse of the Day and get AI-powered context 
            tailored to YOUR age, gender, and life situation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/" 
              className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-8 rounded-xl transition"
            >
              Try Free Today
            </Link>
            <Link 
              href="#how-it-works" 
              className="inline-block border border-white/30 text-white hover:bg-white/10 font-bold py-4 px-8 rounded-xl transition"
            >
              See How It Works
            </Link>
          </div>
        </section>

        {/* Trust Statement */}
        <section className="px-6 py-8 bg-slate-800/50">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-gray-400">
              <span className="text-white font-semibold">Not a replacement.</span> We enhance your Bible.com experience with AI personalization. 
              Use both apps together for the best devotional experience.
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">
            The Challenge with Bible.com&apos;s Verse of the Day
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-red-500/20">
              <p className="text-red-400 text-sm uppercase tracking-wider mb-3">The Problem</p>
              <p className="text-gray-300">
                Bible.com serves <strong className="text-white">500+ million users</strong> the same 
                Verse of the Day. A 25-year-old new mom and a 65-year-old retiree get identical content. 
                Both verses are true and valuable, but neither speaks to their <em>specific moment</em>.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-green-500/20">
              <p className="text-green-400 text-sm uppercase tracking-wider mb-3">The Solution</p>
              <p className="text-gray-300">
                Bible for Life Stages adds a <strong className="text-white">personalization layer</strong>. 
                Same trusted scripture, but with AI-generated context that knows you&apos;re a new parent, 
                or going through career change, or processing grief. The verse becomes <em>yours</em>.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="px-6 py-16 bg-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              How Bible for Life Stages Enhances Bible.com
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📖</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">1. Bible.com&apos;s Verse</h3>
                <p className="text-gray-400">
                  We start with the same trusted Verse of the Day that millions read on YouVersion
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">👤</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">2. Your Profile</h3>
                <p className="text-gray-400">
                  You tell us your age, gender, and current life stage (takes 30 seconds)
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✨</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">3. Personal Devotional</h3>
                <p className="text-gray-400">
                  AI generates context, reflection, and prayer specific to YOUR situation
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Bible.com + Bible for Life Stages = Better Together
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="py-4 px-4 text-gray-400 font-medium">Feature</th>
                  <th className="py-4 px-4 text-gray-400 font-medium">Bible.com</th>
                  <th className="py-4 px-4 text-gray-400 font-medium">Bible for Life Stages</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {comparisonData.map((row, index) => (
                  <tr key={index} className="border-b border-slate-800">
                    <td className={`py-4 px-4 ${row.usHighlight ? 'font-semibold text-white' : ''}`}>
                      {row.feature}
                    </td>
                    <td className={`py-4 px-4 ${row.biblecom.startsWith('✓') ? 'text-green-400' : 'text-gray-500'}`}>
                      {row.biblecom}
                    </td>
                    <td className={`py-4 px-4 ${row.usHighlight ? 'text-amber-400' : row.us.startsWith('✓') ? 'text-green-400' : 'text-gray-500'}`}>
                      {row.us}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-gray-400 mt-6">
            <strong className="text-white">Best practice:</strong> Use Bible.com for reading plans and community. 
            Use Bible for Life Stages for your personalized daily devotional.
          </p>
        </section>

        {/* Life Stages */}
        <section className="px-6 py-16 bg-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              Personalization for Every Life Stage
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {lifeStages.map((stage) => (
                <div 
                  key={stage.href}
                  className="bg-slate-700/50 hover:bg-slate-700 rounded-xl p-4 text-center transition cursor-pointer"
                >
                  <span className="text-3xl block mb-2">{stage.emoji}</span>
                  <span className="text-white text-sm font-medium">{stage.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-amber-300 mb-2">
                Is Bible for Life Stages affiliated with Bible.com or YouVersion?
              </h3>
              <p className="text-gray-300">
                No, we&apos;re an independent app. We are not affiliated with, endorsed by, or 
                partnered with Life.Church, YouVersion, or Bible.com. We built a companion 
                tool that enhances the Bible.com experience with AI personalization. We&apos;re 
                fans who wanted more from our daily verse.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-amber-300 mb-2">
                Do I need Bible.com installed to use this?
              </h3>
              <p className="text-gray-300">
                No, you don&apos;t need Bible.com installed. We pull the same Verse of the Day 
                and add personalized context. However, we encourage using both apps together 
                for the best experience - Bible.com for reading plans and community, 
                Bible for Life Stages for personalized daily devotionals.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-amber-300 mb-2">
                How does the personalization actually work?
              </h3>
              <p className="text-gray-300">
                You set up a simple profile with your age, gender, and current life stage 
                (takes about 30 seconds). Our AI then generates devotional context specifically 
                for YOUR situation. A new mom gets different reflection than a retiree, even 
                for the same verse. The scripture stays the same - the application becomes personal.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-amber-300 mb-2">
                Is Bible for Life Stages free?
              </h3>
              <p className="text-gray-300">
                Yes! The core personalized daily devotional is completely free. Premium 
                features like audio devotionals, extended reflections, verse history, and 
                scripture search are available with an optional subscription.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-16 text-center bg-gradient-to-t from-amber-900/20 to-transparent">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Make Bible.com Personal?
          </h2>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Join thousands who&apos;ve added the personalization layer to their daily devotional.
          </p>
          <Link 
            href="/" 
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-8 rounded-xl transition text-lg"
          >
            Start Your Free Devotional
          </Link>
          <p className="text-gray-400 text-sm mt-4">
            No credit card required. Works on any device.
          </p>
        </section>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-slate-800">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <p className="text-sm text-gray-400 mb-3 font-medium">Life Stages</p>
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-amber-400">For New Parents</span>
                  <span className="text-sm text-amber-400">For Empty Nesters</span>
                  <span className="text-sm text-amber-400">For Career Change</span>
                  <span className="text-sm text-amber-400">For Retirement</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-3 font-medium">Resources</p>
                <div className="flex flex-col gap-2">
                  <Link href="/examples" className="text-sm text-amber-400 hover:text-amber-300">Sample Devotionals</Link>
                  <Link href="/subscription" className="text-sm text-amber-400 hover:text-amber-300">Premium Features</Link>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-3 font-medium">Legal</p>
                <div className="flex flex-col gap-2">
                  <Link href="/privacy" className="text-sm text-amber-400 hover:text-amber-300">Privacy Policy</Link>
                  <Link href="/terms" className="text-sm text-amber-400 hover:text-amber-300">Terms of Service</Link>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-8 text-center">
              Bible for Life Stages is not affiliated with Life.Church, YouVersion, or Bible.com. 
              We are an independent companion app that enhances your devotional experience.
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}
