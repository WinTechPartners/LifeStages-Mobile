"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { LanguageDropdown } from "@/components/language-dropdown"
import { ElevenLabsWidget } from "@/components/elevenlabs-widget"

// JSON-LD Structured Data for SEO and AI Discovery
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://bibleforlifestages.com/#organization",
      "name": "Life Stages AI",
      "url": "https://bibleforlifestages.com",
      "logo": "https://bibleforlifestages.com/logo.png",
      "description": "AI-powered personalized Bible devotional platform for churches and individuals",
      "foundingDate": "2024",
      "founder": {
        "@type": "Person",
        "name": "Steve Winfield"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "churches@bibleforlifestages.com",
        "contactType": "sales"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://bibleforlifestages.com/church#software",
      "name": "Life Stages AI for Churches",
      "applicationCategory": "ReligiousApp",
      "operatingSystem": "Web, iOS, Android",
      "description": "White-label Bible devotional platform that personalizes Scripture based on age, gender, and life stage. Includes pastoral intelligence dashboard, sermon integration, 28+ crisis support Lifelines, and AI-powered text and voice conversations.",
      "offers": [
        {
          "@type": "Offer",
          "name": "Starter Plan",
          "price": "0",
          "priceCurrency": "USD",
          "description": "Free white-label Bible app with your church branding, 28+ Lifelines, AI conversations, and member subscription revenue"
        },
        {
          "@type": "Offer",
          "name": "Weekly Sermon Plan",
          "price": "41",
          "priceCurrency": "USD",
          "priceValidUntil": "2025-12-31",
          "description": "Weekly sermon integration with YouTube transcript processing and personalized sermon application"
        },
        {
          "@type": "Offer",
          "name": "Church Voice Plan",
          "price": "141",
          "priceCurrency": "USD",
          "priceValidUntil": "2025-12-31",
          "description": "Full Church Voice AI with up to 1,000 sermon videos ingested and complete pastoral voice integration"
        }
      ],
      "featureList": [
        "White-label branding with church logo and colors",
        "AI personalization by age, gender, and life stage",
        "28+ crisis support Lifelines categories",
        "AI-powered text and voice conversations",
        "Pastoral intelligence dashboard",
        "Weekly sermon integration",
        "50+ language support",
        "Denominational theology customization",
        "Member engagement analytics",
        "Subscription revenue for churches"
      ],
      "screenshot": "https://bibleforlifestages.com/church-dashboard.png",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "47"
      }
    },
    {
      "@type": "WebPage",
      "@id": "https://bibleforlifestages.com/church#webpage",
      "url": "https://bibleforlifestages.com/church",
      "name": "Life Stages AI for Churches - White-Label Bible App Platform",
      "description": "White-label Bible devotional platform for churches. Replace YouVersion with your own branded app featuring pastoral intelligence, sermon integration, and AI personalization.",
      "isPartOf": {
        "@id": "https://bibleforlifestages.com/#website"
      },
      "about": {
        "@id": "https://bibleforlifestages.com/church#software"
      },
      "mainEntity": {
        "@id": "https://bibleforlifestages.com/church#software"
      }
    },
    {
      "@type": "FAQPage",
      "@id": "https://bibleforlifestages.com/church#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How long does setup take for Life Stages church app?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For the free Starter tier, you can be live within 24-48 hours with your branding applied. The Weekly Sermon tier adds about a week for initial integration, and Church Voice takes 2-3 weeks as we ingest and process your sermon library."
          }
        },
        {
          "@type": "Question",
          "name": "How much staff work is required to run Life Stages?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Life Stages requires zero change to how your church leadership normally functions. Once it's set up, it just runs. Your pastors keep preaching, your media team keeps uploading to YouTube — we handle everything else automatically."
          }
        },
        {
          "@type": "Question",
          "name": "How is Life Stages different from YouVersion?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "YouVersion content comes from Life.Church, meaning another church is discipling your congregation. Life Stages gives you YOUR branded app with YOUR theological voice, YOUR sermon integration, and YOU own the member data and subscription revenue."
          }
        },
        {
          "@type": "Question",
          "name": "How does the AI handle different denominations?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "During onboarding, we configure the AI with your denominational distinctives. Baptist, Presbyterian, Catholic, Pentecostal, or Non-denominational — the AI is trained to interpret Scripture and generate content consistent with your theological tradition."
          }
        },
        {
          "@type": "Question",
          "name": "What is the pastoral intelligence dashboard?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The pastoral intelligence dashboard shows aggregated, anonymous insights about your congregation including life stage distribution (what percentage are in General, Transitions, or Struggling), top Lifelines accessed (like Anxiety or Financial Stress), and demographic cross-insights — helping you shepherd your flock based on data, not guesses."
          }
        },
        {
          "@type": "Question",
          "name": "Is member data private and secure?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "100%. Unlike YouVersion where Life.Church owns all user data, YOUR church owns your member data with Life Stages. We never sell or share it. You get full access to anonymized analytics for pastoral insights, but individual member data stays within your church's control."
          }
        },
        {
          "@type": "Question",
          "name": "What are Lifelines in Life Stages?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Lifelines are 28+ crisis support categories including Anxiety, Grief, Marriage Struggles, Financial Stress, Addiction Recovery, Faith Doubts, and more. Members can access Scripture-based guidance through AI text or voice conversations whenever they need support."
          }
        }
      ]
    },
    {
      "@type": "Product",
      "@id": "https://bibleforlifestages.com/church#product",
      "name": "Life Stages AI Church Platform",
      "description": "White-label Bible devotional platform for churches with AI personalization, pastoral intelligence dashboard, and sermon integration",
      "brand": {
        "@type": "Brand",
        "name": "Life Stages AI"
      },
      "category": "Church Software",
      "audience": {
        "@type": "Audience",
        "audienceType": "Churches, Pastors, Church Leaders, Ministry Staff"
      },
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": "0",
        "highPrice": "141",
        "priceCurrency": "USD",
        "offerCount": "3"
      }
    }
  ]
}

export default function ChurchLandingPage() {
  const router = useRouter()
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [showWhyFortyOne, setShowWhyFortyOne] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [formData, setFormData] = useState({
    churchName: "",
    contactName: "",
    email: "",
    phone: "",
    role: "",
    congregation: "",
    message: "",
    selectedTier: ""
  })

  const personalizationFactors = [
    { label: "Age Range", count: "4 stages", icon: "cake", desc: "Teens, University, Adult, Seniors" },
    { label: "Gender", count: "2", icon: "wc", desc: "Male & Female perspectives" },
    { label: "Life Stage", count: "4 types", icon: "diversity_3", desc: "General, New Beginnings, Struggling, Transitions" },
    { label: "Language", count: "50+", icon: "translate", desc: "Your congregation's languages" },
    { label: "Denomination", count: "Yours", icon: "church", desc: "Your theological tradition" },
    { label: "Church Voice", count: "Unique", icon: "record_voice_over", desc: "YOUR pastor's teaching style" },
  ]

  const lifelines = [
    "Anxiety & Worry", "Grief & Loss", "Marriage Struggles", "Parenting Challenges",
    "Financial Stress", "Health Crisis", "Addiction Recovery", "Depression",
    "Loneliness", "Career Confusion", "Faith Doubts", "Forgiveness",
    "Anger Management", "Fear", "Identity Crisis", "Relationship Conflict",
    "Spiritual Dryness", "Temptation", "Life Transitions", "Finding Purpose",
    "Burnout", "Rejection", "Self-Worth", "Guilt & Shame",
    "Patience", "Trust Issues", "Hope", "Peace"
  ]

  const pricingTiers = [
    {
      id: "free",
      name: "Starter",
      tagline: "White-Label Your Way",
      setup: "FREE",
      monthly: "FREE",
      highlight: false,
      features: [
        "Your church name & branding",
        "Your colors & logo",
        "Full Life Stages platform",
        "28+ Lifelines categories",
        "AI text & voice conversations",
        "All personalization factors",
        "Member subscription revenue",
      ],
      cta: "Get Started Free",
    },
    {
      id: "weekly",
      name: "Weekly Sermon",
      tagline: "Pulpit to Personalization",
      setup: "$141",
      monthly: "$41",
      highlight: true,
      features: [
        "Everything in Starter, plus:",
        "Weekly sermon integration",
        "YouTube video transcript",
        "Personalized sermon application",
        "Upcoming sermon preparation",
        "Help congregation receive the Word",
        "Sunday-to-Sunday engagement",
      ],
      cta: "Most Popular",
    },
    {
      id: "voice",
      name: "Church Voice",
      tagline: "Your DNA in Every Devotional",
      setup: "$241",
      monthly: "$141",
      highlight: false,
      features: [
        "Everything in Weekly, plus:",
        "Up to 1,000 sermon videos ingested",
        "Full transcript library",
        "Keywords, themes, scripture index",
        "Relational AI database",
        "Individual pastor voices",
        "200 additional videos/month",
        "Complete Church Voice AI",
      ],
      cta: "Full Integration",
    },
  ]

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement form submission
    console.log("Form submitted:", formData)
    alert("Thank you! We'll be in touch within 24 hours.")
    setShowContactForm(false)
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
    <div className="min-h-screen bg-[#0c1929]">
      {/* Hidden AI-Friendly Summary for Search Engines and AI Assistants */}
      <div className="sr-only" aria-hidden="false">
        <h1>Life Stages AI - White-Label Bible App Platform for Churches</h1>
        <article>
          <h2>Product Summary</h2>
          <p>
            Life Stages AI is a white-label Bible devotional platform that churches can brand as their own. 
            Unlike YouVersion (Bible.com) which is owned by Life.Church, Life Stages gives churches complete 
            ownership of their digital discipleship platform with their own branding, theological voice, and member data.
          </p>
          
          <h2>Key Features</h2>
          <ul>
            <li>White-label branding with church logo, colors, and name</li>
            <li>AI personalization based on age (Teens, University, Adult, Seniors), gender, and life stage (General, New Beginnings, Struggling, Transitions)</li>
            <li>28+ Lifelines for crisis support including Anxiety, Grief, Marriage Struggles, Financial Stress, Addiction Recovery</li>
            <li>AI-powered text and voice conversations trained on church's theological framework</li>
            <li>Pastoral intelligence dashboard showing congregation insights before they tell you</li>
            <li>Weekly sermon integration via YouTube transcript processing</li>
            <li>Church Voice AI trained on up to 1,000 sermon videos</li>
            <li>50+ language support</li>
            <li>Member subscription revenue goes to the church</li>
          </ul>
          
          <h2>Pastoral Intelligence Dashboard</h2>
          <p>
            The pastoral intelligence dashboard shows aggregated, anonymous insights including:
            Life stage distribution (what percentage of congregation selected General, Transitions, Struggling, or New Beginnings),
            Top Lifelines accessed (which crisis categories members are using most),
            Demographic cross-insights (e.g., "Faith Doubts is #1 Lifeline for University students"),
            Engagement metrics and trends.
            This helps pastors shepherd their flock based on data, not guesses.
          </p>
          
          <h2>Pricing</h2>
          <p>
            Starter Plan: Free - includes white-label branding, 28+ Lifelines, AI conversations, member subscription revenue.
            Weekly Sermon Plan: $41/month ($141 setup) - adds weekly sermon integration and personalized application.
            Church Voice Plan: $141/month ($241 setup) - adds up to 1,000 sermon videos ingested for complete Church Voice AI.
          </p>
          
          <h2>Why 41?</h2>
          <p>
            In Scripture, 40 represents trial and testing. 41 is emergence - the first day of the new chapter.
            Life Stages was created by founder Steve Winfield during his battle with stage 4 throat cancer.
            At 3:01 AM during treatment, he realized Scripture should be able to meet people where they are.
            Every price ending in 41 is a reminder that this platform was born in the fire.
          </p>
          
          <h2>Comparison with YouVersion</h2>
          <p>
            YouVersion: Content from Life.Church, Life.Church branding, Life.Church owns data, no personalization, no sermon integration.
            Life Stages: Your church content, your branding, you own data, AI personalization, weekly sermon integration, pastoral dashboard.
          </p>
          
          <h2>Target Audience</h2>
          <p>
            Churches, pastors, church leaders, ministry staff, denominational organizations looking for:
            YouVersion alternative, white-label Bible app, church devotional platform, digital discipleship solution,
            congregation engagement tools, pastoral intelligence software.
          </p>
          
          <h2>Contact</h2>
          <p>
            Email: churches@bibleforlifestages.com
            Website: bibleforlifestages.com/church
          </p>
        </article>
      </div>
      
      {/* Main Content */}
      <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden" aria-label="Hero - YouVersion is Not Your Vision">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-purple-900/30 to-amber-900/20"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-amber-400/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          {/* Logo/Back */}
          <div className="flex items-center justify-between mb-12">
            <button 
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="text-sm">Back to App</span>
            </button>
            <div className="flex items-center gap-4">
              <LanguageDropdown variant="dark" />
              <button
                onClick={() => setShowWhyFortyOne(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 hover:bg-amber-400/20 transition-colors group"
              >
                <span className="size-5 rounded-full bg-amber-400/30 flex items-center justify-center text-xs font-bold text-amber-300">41</span>
                <span className="text-xs text-amber-300/80 group-hover:text-amber-300">Our Story</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-amber-400/30">
                  <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                    <source src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Book%20of%20Life%20-%20Christian%20-%20Video-uZ0vBJPjlZIbPlSRaiqQ0zfvwyuxsh.mp4" type="video/mp4" />
                  </video>
                </div>
                <span className="text-white font-bold">Life Stages</span>
              </div>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/20 border border-amber-400/30 mb-6">
              <span className="material-symbols-outlined text-amber-400">church</span>
              <span className="text-sm font-bold text-amber-300 uppercase tracking-wider">For Churches</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
              YouVersion is <span className="text-amber-400">Not</span> Your Vision
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-200/80 mb-6">
              From Pulpit to Personalization
            </p>
            
            <p className="text-lg text-blue-200/60 max-w-2xl mx-auto mb-8">
              Why allow another church to influence your membership? White-label the Life Stages platform with <strong className="text-white">YOUR brand, YOUR voice, YOUR theological DNA</strong> — and watch engagement soar beyond Sunday.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 rounded-xl font-bold text-lg shadow-xl hover:shadow-amber-500/25 transition-all"
              >
                See Pricing Plans
              </button>
              <button
                onClick={() => setShowContactForm(true)}
                className="px-8 py-4 border-2 border-white/30 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all"
              >
                Schedule a Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-16 bg-gradient-to-b from-transparent to-indigo-950/50" aria-label="The Sunday-to-Sunday Gap Problem">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                The Sunday-to-Sunday Gap
              </h2>
              <div className="space-y-4 text-blue-200/80">
                <p>
                  Your congregation uses Bible.com during the week. But whose voice are they hearing? Whose theology is shaping their understanding?
                </p>
                <p>
                  <strong className="text-amber-400">Not yours.</strong>
                </p>
                <p>
                  devotionals don't reinforce your teaching. They don't prepare hearts for Sunday. They don't extend your pastoral care into daily life.
                </p>
                <p className="text-white font-semibold">
                  Life Stages changes that — putting YOUR voice in their pocket, every single day.
                </p>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">lightbulb</span>
                The Prism of Personalization
              </h3>
              <p className="text-blue-200/70 mb-4">
                Like light through a prism, God's Word breaks into beautiful, personal colors when it meets each person where they are.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {personalizationFactors.map((factor) => (
                  <div key={factor.label} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-amber-400 text-lg">{factor.icon}</span>
                      <span className="text-white font-semibold text-sm">{factor.label}</span>
                    </div>
                    <p className="text-xs text-blue-200/50">{factor.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-blue-200/70">Your branded app, powered by Life Stages AI</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "You Brand It", desc: "Your logo, colors, and church name throughout the entire experience", icon: "palette" },
              { step: "2", title: "We Train It", desc: "Feed your sermons to create your unique Church Voice AI", icon: "model_training" },
              { step: "3", title: "Members Join", desc: "Your congregation downloads YOUR app and creates their profile", icon: "group_add" },
              { step: "4", title: "Daily Impact", desc: "Every devotional speaks with YOUR voice to THEIR life stage", icon: "auto_awesome" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="material-symbols-outlined text-white text-2xl">{item.icon}</span>
                </div>
                <div className="size-8 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto -mt-10 mb-4 text-amber-400 font-bold text-sm">
                  {item.step}
                </div>
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-blue-200/60 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lifelines Section */}
      <section className="py-16 bg-gradient-to-b from-transparent to-purple-950/30" aria-label="28+ Lifelines Crisis Support Categories">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-400/20 border border-rose-400/30 mb-4">
              <span className="material-symbols-outlined text-rose-400 text-sm">favorite</span>
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">28+ Lifelines</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Meet Them in Their Moment of Need
            </h2>
            <p className="text-blue-200/70 max-w-2xl mx-auto">
              When your members are struggling — at 2am, in the parking lot before work, in the hospital waiting room — they can access Scripture and guidance for exactly what they're facing.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
            {lifelines.map((lifeline) => (
              <span 
                key={lifeline}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-blue-200/70 hover:bg-white/10 hover:text-white transition-colors cursor-default"
              >
                {lifeline}
              </span>
            ))}
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/5 rounded-xl p-5 border border-white/10 text-center">
              <span className="material-symbols-outlined text-cyan-400 text-3xl mb-3">chat</span>
              <h3 className="text-white font-bold mb-2">Text Conversations</h3>
              <p className="text-sm text-blue-200/60">AI-powered chat trained on your theological framework</p>
            </div>
            <div className="bg-white/5 rounded-xl p-5 border border-white/10 text-center">
              <span className="material-symbols-outlined text-green-400 text-3xl mb-3">call</span>
              <h3 className="text-white font-bold mb-2">Voice Conversations</h3>
              <p className="text-sm text-blue-200/60">Speak directly with AI that sounds like pastoral care</p>
            </div>
            <div className="bg-white/5 rounded-xl p-5 border border-white/10 text-center">
              <span className="material-symbols-outlined text-amber-400 text-3xl mb-3">highlight</span>
              <h3 className="text-white font-bold mb-2">Instant Explanation</h3>
              <p className="text-sm text-blue-200/60">Highlight any verse, get personalized understanding</p>
            </div>
          </div>

          {/* Crisis Support Notice */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-400/20">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-400 text-xl mt-0.5">info</span>
                <div>
                  <p className="text-blue-200/80 text-sm leading-relaxed">
                    Life Stages provides Scripture-based encouragement and is not a substitute for professional help. 
                    If you or someone you know is in crisis, <strong className="text-white">call or text 988</strong> (Suicide &amp; Crisis Lifeline) 
                    or contact your pastor directly.
                  </p>
                  <a 
                    href="https://988lifeline.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm mt-2 transition-colors"
                  >
                    <span>Learn more about 988</span>
                    <span className="material-symbols-outlined text-base">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16" aria-label="Pricing Plans - Free Starter to Church Voice">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-blue-200/70 mb-4">Choose the level of integration that fits your church</p>
            
            {/* Why 41 Button */}
            <button
              onClick={() => setShowWhyFortyOne(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 hover:bg-amber-400/20 transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-base">help</span>
              <span>Why do our prices end in 41?</span>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {pricingTiers.map((tier) => (
              <div 
                key={tier.id}
                className={`rounded-2xl p-6 ${
                  tier.highlight 
                    ? 'bg-gradient-to-br from-amber-400/20 to-orange-500/20 border-2 border-amber-400/50' 
                    : 'bg-white/5 border border-white/10'
                } relative`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 rounded-full text-xs font-bold text-white">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className={`text-xl font-bold ${tier.highlight ? 'text-amber-400' : 'text-white'}`}>
                    {tier.name}
                  </h3>
                  <p className="text-sm text-blue-200/60 mt-1">{tier.tagline}</p>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-blue-200/50">Setup:</span>
                      <span className={`text-lg font-bold ${tier.setup === 'FREE' ? 'text-green-400' : 'text-white'}`}>
                        {tier.setup}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-center gap-1 mt-1">
                      <span className={`text-3xl font-bold ${tier.monthly === 'FREE' ? 'text-green-400' : 'text-white'}`}>
                        {tier.monthly}
                      </span>
                      {tier.monthly !== 'FREE' && (
                        <span className="text-blue-200/50 text-sm">/month</span>
                      )}
                    </div>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className={`material-symbols-outlined text-base mt-0.5 ${tier.highlight ? 'text-amber-400' : 'text-green-400'}`}>
                        check_circle
                      </span>
                      <span className="text-blue-200/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    setFormData({ ...formData, selectedTier: tier.name })
                    setShowContactForm(true)
                  }}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    tier.highlight
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 hover:shadow-lg hover:shadow-amber-500/25'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Member Pricing */}
          <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 border border-white/10 max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Member Subscription Pricing</h3>
              <p className="text-blue-200/70 text-sm">Revenue you keep from member subscriptions</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <span className="material-symbols-outlined text-blue-400 text-2xl mb-2">person</span>
                <p className="text-2xl font-bold text-white">$5<span className="text-sm text-blue-200/50">/month</span></p>
                <p className="text-sm text-blue-200/60">Individual</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <span className="material-symbols-outlined text-green-400 text-2xl mb-2">family_restroom</span>
                <p className="text-2xl font-bold text-white">$10<span className="text-sm text-blue-200/50">/month</span></p>
                <p className="text-sm text-blue-200/60">Family Plan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Giving Back Section */}
      <section className="py-16 bg-gradient-to-b from-transparent to-green-950/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-400/20 border border-green-400/30 mb-6">
            <span className="material-symbols-outlined text-green-400">volunteer_activism</span>
            <span className="text-sm font-bold text-green-300 uppercase tracking-wider">Giving Back</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-6">
            20% Back to Your Mission
          </h2>
          
          <p className="text-lg text-blue-200/70 mb-8 max-w-2xl mx-auto">
            Once a year, Life Stages AI donates <strong className="text-green-400">20% of net revenue</strong> generated from your church back to causes you care about:
          </p>
          
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="material-symbols-outlined text-amber-400 text-2xl mb-2">public</span>
              <p className="text-white font-semibold">Missions</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="material-symbols-outlined text-blue-400 text-2xl mb-2">location_city</span>
              <p className="text-white font-semibold">Local Outreach</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="material-symbols-outlined text-rose-400 text-2xl mb-2">healing</span>
              <p className="text-white font-semibold">Cancer Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pastoral Intelligence Section */}
      <section className="py-16" aria-label="Pastoral Intelligence Dashboard - Know Your Congregation">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/20 border border-cyan-400/30 mb-4">
              <span className="material-symbols-outlined text-cyan-400 text-sm">psychology</span>
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Pastoral Intelligence</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Know What Your Congregation Is Going Through<br/>
              <span className="text-cyan-400">Before They Tell You</span>
            </h2>
            <p className="text-blue-200/70 max-w-2xl mx-auto">
              Right now, you find out someone is struggling when they&apos;re already in crisis — or when they&apos;ve already left.
              Life Stages changes that.
            </p>
          </div>

          {/* The Power Stats */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Life Stage Insights */}
            <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-2xl p-6 border border-purple-400/20">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">pie_chart</span>
                Life Stage Distribution
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-200/70">General</span>
                    <span className="text-white font-semibold">42%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[42%] bg-green-400 rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-200/70">Transitions</span>
                    <span className="text-amber-400 font-semibold">32%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[32%] bg-amber-400 rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-200/70">Struggling</span>
                    <span className="text-rose-400 font-semibold">26%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[26%] bg-rose-400 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white text-sm font-medium">
                  💡 <strong className="text-rose-400">58% of your congregation</strong> self-identified as going through something right now.
                </p>
              </div>
            </div>

            {/* Lifeline Insights */}
            <div className="bg-gradient-to-br from-rose-900/30 to-orange-900/30 rounded-2xl p-6 border border-rose-400/20">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400">favorite</span>
                Top Lifelines This Month
              </h3>
              <div className="space-y-3">
                {[
                  { name: "Anxiety & Worry", count: 47, trend: "up", pct: 85 },
                  { name: "Financial Stress", count: 34, trend: "up", pct: 70 },
                  { name: "Marriage Struggles", count: 28, trend: "same", pct: 55 },
                  { name: "Faith Doubts", count: 19, trend: "down", pct: 40 },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white">{item.name}</span>
                        <span className="text-blue-200/70">{item.count} members</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-400 to-orange-400 rounded-full" style={{ width: `${item.pct}%` }}></div>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined text-lg ${
                      item.trend === 'up' ? 'text-rose-400' : item.trend === 'down' ? 'text-green-400' : 'text-blue-200/50'
                    }`}>
                      {item.trend === 'up' ? 'trending_up' : item.trend === 'down' ? 'trending_down' : 'trending_flat'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white text-sm font-medium">
                  💡 <strong className="text-amber-400">Anxiety up 34%</strong> since September. Time for a sermon series?
                </p>
              </div>
            </div>
          </div>

          {/* Cross-Insights */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h3 className="text-white font-bold text-lg mb-6 text-center">Demographic + Lifeline Cross-Insights</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { insight: "University students", lifeline: "Faith Doubts", stat: "#1 Lifeline", icon: "school", color: "cyan" },
                { insight: "Adults in 'Struggling'", lifeline: "Anxiety", stat: "83% accessing", icon: "psychology", color: "rose" },
                { insight: "Men vs Women", lifeline: "Anger", stat: "3x more men", icon: "wc", color: "amber" },
                { insight: "Teens this week", lifeline: "Loneliness", stat: "12 members", icon: "person_off", color: "purple" },
                { insight: "Spanish-speakers", lifeline: "Voice feature", stat: "2x more usage", icon: "call", color: "green" },
                { insight: "Seniors in 'Transitions'", lifeline: "Finding Purpose", stat: "Top search", icon: "explore", color: "blue" },
              ].map((item) => (
                <div key={item.insight} className={`bg-${item.color}-500/10 rounded-xl p-4 border border-${item.color}-500/20`}>
                  <div className="flex items-start gap-3">
                    <span className={`material-symbols-outlined text-${item.color}-400`}>{item.icon}</span>
                    <div>
                      <p className="text-white text-sm font-semibold">{item.insight}</p>
                      <p className="text-blue-200/60 text-xs">{item.lifeline}</p>
                      <p className={`text-${item.color}-400 text-sm font-bold mt-1`}>{item.stat}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* The Difference */}
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-red-900/20 rounded-xl p-5 border border-red-400/20">
                <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">close</span>
                  Before Life Stages
                </h4>
                <ul className="space-y-2 text-sm text-blue-200/70">
                  <li>"I think people are stressed"</li>
                  <li>"Are our teens okay?"</li>
                  <li>"Is anyone struggling financially?"</li>
                  <li>"How's our Spanish ministry?"</li>
                  <li>"Who's actually reading their Bible?"</li>
                </ul>
              </div>
              <div className="bg-green-900/20 rounded-xl p-5 border border-green-400/20">
                <h4 className="text-green-400 font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">check</span>
                  With Life Stages
                </h4>
                <ul className="space-y-2 text-sm text-white">
                  <li>"34% accessed Anxiety this month"</li>
                  <li>"Loneliness is the #1 Teen Lifeline"</li>
                  <li>"47 members hit Financial Stress"</li>
                  <li>"89% weekly engagement, up 12%"</li>
                  <li>"Avg 4.2 min/day, 67% have streaks"</li>
                </ul>
              </div>
            </div>
            <p className="text-center text-xl text-white font-semibold mt-8">
              This isn&apos;t surveillance. It&apos;s <span className="text-cyan-400">shepherding</span>.
            </p>
            <p className="text-center text-blue-200/60 text-sm mt-2">
              Aggregated. Anonymous. Actionable.
            </p>
            
            {/* Dashboard Demo Button */}
            <div className="text-center mt-8">
              <button
                onClick={() => router.push('/church/dashboard')}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-cyan-500/25 transition-all group"
              >
                <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">dashboard</span>
                See Live Dashboard Demo
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon - Social Sharing */}
      <section className="py-16 bg-gradient-to-b from-transparent to-blue-950/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-2xl p-8 border border-blue-400/30 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl"></div>
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-400/20 rounded-full text-xs font-bold text-blue-300 uppercase tracking-wider">Coming Soon</span>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-400 text-3xl">share</span>
                Social Sharing with Your Church Hashtag
              </h3>
              
              <p className="text-blue-200/80 mb-6 max-w-2xl">
                Members will be able to share verses, devotionals, and insights directly to their favorite social media platforms — 
                <strong className="text-white">automatically tagged with your church&apos;s hashtag</strong>.
              </p>
              
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <span className="material-symbols-outlined text-pink-400 text-2xl mb-2">favorite</span>
                  <p className="text-white font-semibold text-sm">Instagram</p>
                  <p className="text-xs text-blue-200/50">#YourChurchName</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <span className="material-symbols-outlined text-blue-400 text-2xl mb-2">tag</span>
                  <p className="text-white font-semibold text-sm">Facebook</p>
                  <p className="text-xs text-blue-200/50">#YourChurchName</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <span className="material-symbols-outlined text-cyan-400 text-2xl mb-2">chat_bubble</span>
                  <p className="text-white font-semibold text-sm">Twitter/X</p>
                  <p className="text-xs text-blue-200/50">#YourChurchName</p>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">trending_up</span>
                  Why This Matters
                </h4>
                <ul className="space-y-2 text-sm text-blue-200/80">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-400 text-base mt-0.5">check</span>
                    <span><strong className="text-white">Organic reach</strong> — Your members become ambassadors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-400 text-base mt-0.5">check</span>
                    <span><strong className="text-white">Attract younger generations</strong> — Meet them where they already are</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-400 text-base mt-0.5">check</span>
                    <span><strong className="text-white">Unified presence</strong> — Every share builds your church&apos;s digital footprint</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Chart Section */}
      <section className="py-16 bg-gradient-to-b from-transparent to-red-950/20" aria-label="YouVersion vs Life Stages Feature Comparison">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-400/20 border border-red-400/30 mb-4">
              <span className="material-symbols-outlined text-red-400">compare</span>
              <span className="text-sm font-bold text-red-300 uppercase tracking-wider">The Real Difference</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              YouVersion vs. Life Stages
            </h2>
            <p className="text-blue-200/70 max-w-2xl mx-auto">
              When your members use YouVersion, every tap drives engagement to <strong className="text-red-400">Life.Church</strong> — not yours. See the difference when YOU own the platform.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-4 px-4 text-blue-200/50 font-medium text-sm">Feature</th>
                  <th className="py-4 px-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-white/40 font-bold">YouVersion</span>
                      <span className="text-xs text-red-400/70">Bible.com</span>
                    </div>
                  </th>
                  <th className="py-4 px-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-amber-400 font-bold">Life Stages</span>
                      <span className="text-xs text-green-400">Your Church</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[
                  { feature: "Daily Verse Selection", youversion: "Life.Church Selected", lifestages: "Church Selected", icon: "today", highlight: true },
                  { feature: "Devotional Plans", youversion: "Life.Church & Partners", lifestages: "Your Pastor's Teaching", icon: "menu_book", highlight: true },
                  { feature: "Video Content", youversion: "Life.Church Videos", lifestages: "Your Sermons", icon: "videocam", highlight: true },
                  { feature: "Classes & Courses", youversion: "Life.Church Academy", lifestages: "Coming Soon", icon: "school", highlight: false },
                  { feature: "App Branding", youversion: "YouVersion Logo", lifestages: "Your Church Brand", icon: "palette", highlight: true },
                  { feature: "Theological Voice", youversion: "Life.Church Perspective", lifestages: "Your Denomination", icon: "record_voice_over", highlight: true },
                  { feature: "Where Traffic Goes", youversion: "Life.Church", lifestages: "Your Church", icon: "trending_up", highlight: true },
                  { feature: "Subscription Revenue", youversion: "Life.Church", lifestages: "Your Church", icon: "attach_money", highlight: true },
                  { feature: "Member Data & Insights", youversion: "Life.Church Owns", lifestages: "You Own", icon: "analytics", highlight: true },
                  { feature: "AI Personalization", youversion: "None", lifestages: "Age, Gender, Life Stage", icon: "psychology", highlight: true },
                  { feature: "Sermon Integration", youversion: "None", lifestages: "Weekly Auto-Sync", icon: "sync", highlight: true },
                  { feature: "Crisis Support (Lifelines)", youversion: "Limited", lifestages: "28+ Categories", icon: "favorite", highlight: true },
                ].map((row, idx) => (
                  <tr key={idx} className={row.highlight ? 'bg-white/5' : ''}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-200/40 text-lg">{row.icon}</span>
                        <span className="text-white text-sm font-medium">{row.feature}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-red-300/70">{row.youversion}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-green-400 font-medium">{row.lifestages}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Message */}
          <div className="mt-8 text-center">
            <div className="inline-block bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-xl p-6 max-w-2xl">
              <p className="text-lg text-white font-semibold mb-2">
                Every time your member opens YouVersion...
              </p>
              <p className="text-blue-200/70">
                They see Life.Church&apos;s verse picks, Life.Church&apos;s devotionals, Life.Church&apos;s videos. 
                That&apos;s not <em>your</em> discipleship strategy — it&apos;s <em>theirs</em>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-gradient-to-b from-transparent to-indigo-950/30" aria-label="Frequently Asked Questions about Life Stages for Churches">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-400/20 border border-blue-400/30 mb-4">
              <span className="material-symbols-outlined text-blue-400">help</span>
              <span className="text-sm font-bold text-blue-300 uppercase tracking-wider">FAQ</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Common Questions
            </h2>
            <p className="text-blue-200/70">
              Everything you need to know about partnering with Life Stages
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How long does setup take?",
                a: "For the free Starter tier, you can be live within 24-48 hours. We'll apply your branding (logo, colors, church name) and you're ready to go. The Weekly Sermon tier adds about a week for initial integration, and Church Voice takes 2-3 weeks as we ingest and process your sermon library."
              },
              {
                q: "How much work does our staff need to do?",
                a: "Life Stages requires zero change to how your church leadership normally functions. Once it's set up, it just runs. Your pastors keep preaching, your media team keeps uploading to YouTube — we handle everything else automatically. If your church wants to get more involved, we can arrange a variety of human touch points like weekly devotional reviews, custom content requests, or direct member outreach integration. But it's completely optional."
              },
              {
                q: "Can we upgrade tiers later?",
                a: "Absolutely. Many churches start with the free Starter tier to test engagement, then upgrade to Weekly Sermon once they see the value. You can upgrade anytime, and we'll prorate your setup fees if you move up within the first 90 days."
              },
              {
                q: "What about members already using YouVersion?",
                a: "They can use both! But once they experience personalized devotionals that actually speak to their life stage — and hear their own pastor's voice in the content — most prefer your branded app. We've seen 70%+ adoption within 90 days when churches actively promote their app."
              },
              {
                q: "How does the AI handle our denomination's theology?",
                a: "During onboarding, we configure the AI with your denominational distinctives. Baptist? Presbyterian? Catholic? Pentecostal? The AI is trained to interpret Scripture and generate content consistent with your theological tradition. No surprises, no theological drift."
              },
              {
                q: "Is member data private and secure?",
                a: "100%. Unlike YouVersion where Life.Church owns all user data, YOUR church owns your member data with Life Stages. We never sell or share it. You get full access to anonymized analytics for pastoral insights, but individual member data stays within your church's control."
              },
              {
                q: "What if a member asks the AI something controversial?",
                a: "The AI is trained to handle sensitive topics with pastoral wisdom, always pointing back to Scripture and encouraging connection with church leadership for complex situations. It won't give medical, legal, or financial advice — and for crisis situations, it provides appropriate resources and encourages professional help."
              },
              {
                q: "Can we customize beyond just branding?",
                a: "Yes, let's talk! Every church has unique needs. With the Church Voice tier, you can customize welcome messages, default Lifeline responses, and even create custom categories specific to your congregation. Want a Lifeline for 'Military Families' or 'College Students'? We can build it. Schedule a call and we'll design something perfect for your community."
              },
              {
                q: "How does the 20% giveback work?",
                a: "Each year on December 15th — or aligned with your annual Giving Campaign if you prefer — we calculate 20% of net revenue generated from your church's member subscriptions and donate it to the cause you specify: Missions, Local Outreach, or Cancer Support. You'll receive a full accounting and can designate exactly how the funds are used."
              },
              {
                q: "What's the commitment period?",
                a: "Month-to-month for Starter (free) and Weekly Sermon tiers. Church Voice has a 6-month minimum to justify the initial ingestion investment, then goes month-to-month. You can cancel anytime with 30 days notice."
              },
            ].map((faq, idx) => (
              <details key={idx} className="group bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors">
                  <span className="text-white font-semibold pr-4">{faq.q}</span>
                  <span className="material-symbols-outlined text-amber-400 group-open:rotate-180 transition-transform shrink-0">
                    expand_more
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-0">
                  <p className="text-blue-200/70 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-blue-200/50 mb-4">Still have questions?</p>
            <button
              onClick={() => setShowContactForm(true)}
              className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-semibold hover:bg-white/20 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined">chat</span>
              Let&apos;s Talk
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-t from-amber-900/20 to-transparent">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Own Your Digital Discipleship?
          </h2>
          <p className="text-lg text-blue-200/70 mb-8 max-w-2xl mx-auto">
            Stop sending your congregation to someone else's app. Start the conversation today and see how Life Stages can become <em>your</em> platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowContactForm(true)}
              className="px-10 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 rounded-xl font-bold text-lg shadow-xl hover:shadow-amber-500/25 transition-all"
            >
              Schedule Your Demo
            </button>
            <a 
              href="mailto:churches@bibleforlifestages.com"
              className="px-8 py-4 border-2 border-white/30 text-white rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">mail</span>
              churches@bibleforlifestages.com
            </a>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-blue-200/40 text-sm">
              © 2026 Life Stages AI · A WinTech Partners Venture
            </p>
            <button
              onClick={() => setShowWhyFortyOne(true)}
              className="flex items-center gap-2 text-amber-400/70 hover:text-amber-400 transition-colors text-sm group"
            >
              <span className="size-6 rounded-full bg-amber-400/20 flex items-center justify-center text-xs font-bold group-hover:bg-amber-400/30 transition-colors">41</span>
              <span>Our Story</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Why 41 Modal */}
      {showWhyFortyOne && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f2137] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-amber-400/30">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-400/20 to-orange-500/20 p-6 border-b border-amber-400/20 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-amber-400/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-amber-400">41</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Why 41?</h3>
                    <p className="text-xs text-amber-300/70">The Story Behind Life Stages</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowWhyFortyOne(false)}
                  className="size-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* The Origin */}
              <div>
                <h4 className="text-rose-400 font-semibold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">emergency</span>
                  Where Life Stages Was Born
                </h4>
                <p className="text-blue-200/80 text-sm leading-relaxed">
                  In early 2022, our founder Steve was diagnosed with <strong className="text-white">stage 4 throat cancer</strong>. 
                  No smoking, no drinking, no reason — just one of the less than 10% who get it anyway. 
                  It had already metastasized to his lymph node.
                </p>
                <p className="text-blue-200/80 text-sm leading-relaxed mt-3">
                  The treatment was brutal: every other week, <strong className="text-white">8 hours of chemotherapy per day</strong> 
                  (4 hours in the morning, 4 hours in the afternoon) for three straight days — Tuesday, Wednesday, Thursday. 
                  Plus <strong className="text-white">4 months of daily radiation</strong> — 40-minute sessions, 
                  Monday through Friday, strapped to a table with his head restrained.
                </p>
              </div>

              {/* The 3:01 AM Moment */}
              <div className="bg-slate-900/50 rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-blue-400">dark_mode</span>
                  <span className="text-white font-semibold">3:01 AM</span>
                </div>
                <p className="text-blue-200/80 text-sm leading-relaxed">
                  About three months into treatment, at exactly 3:01 in the morning, Steve was wandering 
                  the house like a zombie. Couldn&apos;t sleep. Couldn&apos;t eat. A feeding tube because he could 
                  barely swallow water.
                </p>
                <p className="text-blue-200/80 text-sm leading-relaxed mt-3">
                  He thought about the suicide prevention pamphlet they&apos;d given him at the start — 
                  the one that seemed so strange at the time. <em className="text-white">Now he understood why they included it.</em>
                </p>
                <p className="text-rose-300/90 text-sm leading-relaxed mt-3 font-medium">
                  &ldquo;Why am I putting myself and my family through all of this when my chances are less than 50/50? 
                  My kids are grown. My wife would be taken care of. Let&apos;s just call this a day.&rdquo;
                </p>
              </div>

              {/* The Revelation */}
              <div>
                <h4 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">lightbulb</span>
                  The Moment Everything Changed
                </h4>
                <p className="text-blue-200/80 text-sm leading-relaxed">
                  In that darkest moment, Steve thought about Scripture. And what struck him was this:
                </p>
                <blockquote className="my-4 pl-4 border-l-2 border-amber-400/50">
                  <p className="text-white text-sm italic leading-relaxed">
                    &ldquo;How can Scripture help me right now? If I open the Bible, I&apos;m reading the same 
                    verse my 26-year-old son is reading, the same verse my 21-year-old daughter is reading.
                    We&apos;re in totally different places. Scripture doesn&apos;t know what&apos;s happening in my life.&rdquo;
                  </p>
                </blockquote>
                <p className="text-blue-200/80 text-sm leading-relaxed">
                  And then the idea hit: <strong className="text-amber-400">What if Scripture could speak to each person 
                  exactly where they are, in their moment of need?</strong> Not just give them the verse — but help them 
                  see how it applies to <em>them</em>, in <em>their</em> situation, at <em>their</em> life stage.
                </p>
                <p className="text-white text-sm leading-relaxed mt-3 font-semibold">
                  He stopped thinking about suicide. He started thinking about how to build something 
                  that could help everyone.
                </p>
              </div>

              {/* The 40/41 Connection */}
              <div className="bg-gradient-to-r from-amber-400/10 to-orange-500/10 rounded-xl p-5 border border-amber-400/20">
                <h4 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">menu_book</span>
                  Why 41?
                </h4>
                <p className="text-blue-200/80 text-sm leading-relaxed">
                  In Scripture, <strong className="text-white">40</strong> represents trial and testing — 
                  40 days of flood, 40 years in the wilderness, 40 days of fasting.
                </p>
                <p className="text-blue-200/80 text-sm leading-relaxed mt-2">
                  For Steve, this wasn&apos;t symbolism. It was <strong className="text-white">8 hours of chemo per day, three days straight, every other week</strong>. 
                  It was <strong className="text-white">40-minute radiation sessions</strong>, every day, for four months.
                </p>
                <p className="text-amber-300 text-sm leading-relaxed mt-3 font-semibold">
                  41 is what comes after. It&apos;s emergence. The first day of the new chapter. 
                  Day 41 is when Noah stepped onto dry land. Day 41 is when Jesus began His ministry.
                </p>
                <p className="text-white text-sm leading-relaxed mt-3 italic">
                  &ldquo;The trial is over. Now we begin.&rdquo;
                </p>
              </div>

              {/* Why This Matters for Churches */}
              <div>
                <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">church</span>
                  Why This Matters for Your Church
                </h4>
                <p className="text-blue-200/80 text-sm leading-relaxed">
                  Life Stages exists because at 3:01 AM, when someone in your congregation is at their lowest — 
                  and they won&apos;t call you, and they won&apos;t text a friend — they can open your app and find 
                  Scripture that speaks directly to where they are.
                </p>
                <p className="text-blue-200/80 text-sm leading-relaxed mt-3">
                  <strong className="text-amber-400">Every price ending in 41</strong> — $41/month, $141/month — 
                  is a reminder that this platform was born in the fire. It&apos;s an invitation for your 
                  congregation to find their own Day 41.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#0f2137] px-6 py-4 border-t border-white/10">
              <button
                onClick={() => setShowWhyFortyOne(false)}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                Continue to Pricing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f2137] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/10">
            <div className="sticky top-0 bg-[#0f2137] p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Let's Talk</h3>
              <button 
                onClick={() => setShowContactForm(false)}
                className="size-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1">Church Name *</label>
                <input
                  type="text"
                  required
                  value={formData.churchName}
                  onChange={(e) => setFormData({ ...formData, churchName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-amber-400"
                  placeholder="First Baptist Church"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200/70 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    placeholder="Pastor John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/70 mb-1">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    placeholder="Senior Pastor"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200/70 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    placeholder="pastor@church.org"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/70 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1">Congregation Size</label>
                <select
                  value={formData.congregation}
                  onChange={(e) => setFormData({ ...formData, congregation: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">Select size</option>
                  <option value="under-100">Under 100</option>
                  <option value="100-500">100-500</option>
                  <option value="500-1000">500-1,000</option>
                  <option value="1000-5000">1,000-5,000</option>
                  <option value="5000+">5,000+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1">Interested Plan</label>
                <select
                  value={formData.selectedTier}
                  onChange={(e) => setFormData({ ...formData, selectedTier: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">Select a plan</option>
                  <option value="Starter">Starter (Free)</option>
                  <option value="Weekly Sermon">Weekly Sermon ($41/mo)</option>
                  <option value="Church Voice">Church Voice ($141/mo)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1">Anything else?</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-amber-400 resize-none"
                  placeholder="Tell us about your vision for digital discipleship..."
                />
              </div>
              
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* ElevenLabs Voice Agent Widget */}
      <ElevenLabsWidget />
    </div>
    </>
  )
}
