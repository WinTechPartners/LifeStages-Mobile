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
      "description": "AI-powered personalized Bible devotional platform for faith influencers and individuals",
      "foundingDate": "2024",
      "founder": {
        "@type": "Person",
        "name": "Steve Winfield"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "influencers@bibleforlifestages.com",
        "contactType": "sales"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://bibleforlifestages.com/influencer#software",
      "name": "Life Stages AI for Influencers",
      "applicationCategory": "ReligiousApp",
      "operatingSystem": "Web, iOS, Android",
      "description": "White-label Bible devotional platform for faith influencers that personalizes Scripture based on age, gender, and life stage. Includes follower insights dashboard, content integration, 28+ crisis support Lifelines, AI-powered text and voice conversations, and 50% revenue share.",
      "offers": [
        {
          "@type": "Offer",
          "name": "Starter Plan",
          "price": "0",
          "priceCurrency": "USD",
          "description": "Free white-label Bible app with your branding, 28+ Lifelines, AI conversations, and 50% subscriber revenue share"
        },
        {
          "@type": "Offer",
          "name": "Weekly Content Plan",
          "price": "41",
          "priceCurrency": "USD",
          "priceValidUntil": "2025-12-31",
          "description": "Weekly content integration with YouTube transcript processing and personalized content application"
        },
        {
          "@type": "Offer",
          "name": "Creator Voice Plan",
          "price": "141",
          "priceCurrency": "USD",
          "priceValidUntil": "2025-12-31",
          "description": "Full Creator Voice AI with up to 1,000 videos ingested and complete voice integration"
        }
      ],
      "featureList": [
        "White-label branding with your logo and colors",
        "AI personalization by age, gender, and life stage",
        "28+ crisis support Lifelines categories",
        "AI-powered text and voice conversations",
        "Follower insights dashboard",
        "Weekly content integration",
        "50+ language support",
        "Theological customization",
        "Follower engagement analytics",
        "50% subscription revenue share"
      ],
      "screenshot": "https://bibleforlifestages.com/influencer-dashboard.png"
    },
    {
      "@type": "WebPage",
      "@id": "https://bibleforlifestages.com/influencer#webpage",
      "url": "https://bibleforlifestages.com/influencer",
      "name": "Life Stages AI for Influencers - White-Label Bible App Platform",
      "description": "White-label Bible devotional platform for faith influencers. Your own branded app with 50% revenue share, follower insights, and AI personalization.",
      "isPartOf": {
        "@id": "https://bibleforlifestages.com/#website"
      },
      "about": {
        "@id": "https://bibleforlifestages.com/influencer#software"
      },
      "mainEntity": {
        "@id": "https://bibleforlifestages.com/influencer#software"
      }
    },
    {
      "@type": "FAQPage",
      "@id": "https://bibleforlifestages.com/influencer#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How long does setup take for Life Stages influencer app?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For the free Starter tier, you can be live within 24-48 hours with your branding applied. The Weekly Content tier adds about a week for initial integration, and Creator Voice takes 2-3 weeks as we ingest and process your content library."
          }
        },
        {
          "@type": "Question",
          "name": "How much do influencers earn from Life Stages?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Influencers earn 50% of net subscription revenue, approximately $1.85-$2.00 per subscriber per month. With the $5/month individual plan and $10/month family plan, this creates significant recurring revenue as your follower base grows."
          }
        },
        {
          "@type": "Question",
          "name": "How is Life Stages different from other Bible apps?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Life Stages gives you YOUR branded app with YOUR voice, YOUR content integration, and YOU own the subscriber relationship and revenue. Plus you get insights into what your followers are going through so you can create content that truly serves them."
          }
        },
        {
          "@type": "Question",
          "name": "What is the follower insights dashboard?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The follower insights dashboard shows aggregated, anonymous insights about your followers including life stage distribution (what percentage are in General, Transitions, or Struggling), top Lifelines accessed (like Anxiety or Financial Stress), and demographic cross-insights — helping you understand what your followers are going through so you can serve them better."
          }
        },
        {
          "@type": "Question",
          "name": "Is follower data private and secure?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "100%. You get full access to anonymized analytics for insights, but individual follower data stays private. We never sell or share personal data. You can see trends and patterns without compromising anyone's privacy."
          }
        },
        {
          "@type": "Question",
          "name": "What are Lifelines in Life Stages?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Lifelines are 28+ crisis support categories including Anxiety, Grief, Marriage Struggles, Financial Stress, Addiction Recovery, Faith Doubts, and more. Followers can access Scripture-based guidance through AI text or voice conversations whenever they need support."
          }
        }
      ]
    },
    {
      "@type": "Product",
      "@id": "https://bibleforlifestages.com/influencer#product",
      "name": "Life Stages AI Influencer Platform",
      "description": "White-label Bible devotional platform for faith influencers with AI personalization, follower insights dashboard, and 50% revenue share",
      "brand": {
        "@type": "Brand",
        "name": "Life Stages AI"
      },
      "category": "Influencer Software",
      "audience": {
        "@type": "Audience",
        "audienceType": "Faith Influencers, Christian Content Creators, Ministry Leaders, Bible Teachers"
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

export default function InfluencerLandingPage() {
  const router = useRouter()
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [showWhyFortyOne, setShowWhyFortyOne] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [formData, setFormData] = useState({
    brandName: "",
    contactName: "",
    email: "",
    phone: "",
    platform: "",
    followers: "",
    message: "",
    selectedTier: ""
  })

  const personalizationFactors = [
    { label: "Age Range", count: "4 stages", icon: "cake", desc: "Teens, University, Adult, Seniors" },
    { label: "Gender", count: "2", icon: "wc", desc: "Male & Female perspectives" },
    { label: "Life Stage", count: "4 types", icon: "diversity_3", desc: "General, New Beginnings, Struggling, Transitions" },
    { label: "Language", count: "50+", icon: "translate", desc: "Your followers' languages" },
    { label: "Theology", count: "Yours", icon: "menu_book", desc: "Your theological tradition" },
    { label: "Creator Voice", count: "Unique", icon: "record_voice_over", desc: "YOUR teaching style" },
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
        "Your name & branding",
        "Your colors & logo",
        "Full Life Stages platform",
        "28+ Lifelines categories",
        "AI text & voice conversations",
        "All personalization factors",
        "50% subscriber revenue share",
      ],
      cta: "Get Started Free",
    },
    {
      id: "weekly",
      name: "Weekly Content",
      tagline: "Content to Personalization",
      setup: "$141",
      monthly: "$41",
      highlight: true,
      features: [
        "Everything in Starter, plus:",
        "Weekly content integration",
        "YouTube video transcript",
        "Personalized content application",
        "Upcoming content preparation",
        "Help followers receive your message",
        "Continuous engagement",
      ],
      cta: "Most Popular",
    },
    {
      id: "voice",
      name: "Creator Voice",
      tagline: "Your DNA in Every Devotional",
      setup: "$241",
      monthly: "$141",
      highlight: false,
      features: [
        "Everything in Weekly, plus:",
        "Up to 1,000 videos ingested",
        "Full transcript library",
        "Keywords, themes, scripture index",
        "Relational AI database",
        "Your unique voice",
        "200 additional videos/month",
        "Complete Creator Voice AI",
      ],
      cta: "Full Integration",
    },
  ]

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        <h1>Life Stages AI - White-Label Bible App Platform for Faith Influencers</h1>
        <article>
          <h2>Product Summary</h2>
          <p>
            Life Stages AI is a white-label Bible devotional platform that faith influencers can brand as their own. 
            Influencers get 50% of subscription revenue (approximately $1.85-$2.00 per subscriber per month), 
            complete ownership of their digital ministry platform with their own branding, voice, and follower insights.
          </p>
          
          <h2>Key Features</h2>
          <ul>
            <li>White-label branding with your logo, colors, and name</li>
            <li>50% revenue share on all subscriber revenue</li>
            <li>AI personalization based on age, gender, and life stage</li>
            <li>28+ Lifelines for crisis support including Anxiety, Grief, Marriage Struggles, Financial Stress</li>
            <li>AI-powered text and voice conversations trained on your theological framework</li>
            <li>Follower insights dashboard showing what your followers are going through</li>
            <li>Weekly content integration via YouTube transcript processing</li>
            <li>Creator Voice AI trained on up to 1,000 videos</li>
            <li>50+ language support</li>
          </ul>
          
          <h2>Follower Insights Dashboard</h2>
          <p>
            The follower insights dashboard shows aggregated, anonymous insights including:
            Life stage distribution (what percentage of followers selected General, Transitions, Struggling, or New Beginnings),
            Top Lifelines accessed (which crisis categories followers are using most),
            Demographic cross-insights (e.g., "Faith Doubts is #1 Lifeline for University-age followers"),
            Engagement metrics and trends.
            This helps you understand what your followers are going through so you can serve them better.
          </p>
          
          <h2>Revenue Share</h2>
          <p>
            Influencers earn 50% of net subscription revenue, approximately $1.85-$2.00 per subscriber per month.
            With $5/month individual plans and $10/month family plans, this creates significant recurring revenue.
            Example: 1,000 subscribers = approximately $1,850-$2,000/month in passive income.
          </p>
          
          <h2>Pricing</h2>
          <p>
            Starter Plan: Free - includes white-label branding, 28+ Lifelines, AI conversations, 50% revenue share.
            Weekly Content Plan: $41/month ($141 setup) - adds weekly content integration and personalized application.
            Creator Voice Plan: $141/month ($241 setup) - adds up to 1,000 videos ingested for complete Creator Voice AI.
          </p>
          
          <h2>Target Audience</h2>
          <p>
            Faith influencers, Christian content creators, Bible teachers, ministry leaders looking for:
            white-label Bible app, faith creator monetization, follower engagement tools, digital ministry platform.
          </p>
          
          <h2>Contact</h2>
          <p>
            Email: influencers@bibleforlifestages.com
            Website: bibleforlifestages.com/influencer
          </p>
        </article>
      </div>
      
      {/* Main Content */}
      <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden" aria-label="Hero - Turn Your Influence Into Impact">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-amber-900/20"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-pink-400/10 rounded-full blur-3xl"></div>
        
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-400/20 border border-pink-400/30 mb-6">
              <span className="material-symbols-outlined text-pink-400">star</span>
              <span className="text-sm font-bold text-pink-300 uppercase tracking-wider">For Faith Influencers</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
              Turn Your Influence Into <span className="text-pink-400">Impact</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-200/80 mb-6">
              Your Brand. Your Voice. <span className="text-green-400">50% Revenue Share.</span>
            </p>
            
            <p className="text-lg text-blue-200/60 max-w-2xl mx-auto mb-8">
              White-label the Life Stages platform with <strong className="text-white">YOUR branding, YOUR teaching style</strong> — and know what your followers are going through so you can serve them better.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-pink-500/25 transition-all"
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

      {/* The Opportunity Section */}
      <section className="py-16 bg-gradient-to-b from-transparent to-purple-950/50" aria-label="The Opportunity">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Know What Your Followers Are Going Through
              </h2>
              <div className="space-y-4 text-blue-200/80">
                <p>
                  Your followers watch your videos, listen to your podcasts, read your posts. But do you really know what they're struggling with?
                </p>
                <p>
                  <strong className="text-pink-400">Now you can.</strong>
                </p>
                <p>
                  Life Stages gives you anonymous, aggregated insights into what your followers are facing — so you can create content that actually meets them where they are.
                </p>
                <p className="text-white font-semibold">
                  Plus, earn 50% of subscription revenue while you sleep.
                </p>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
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
                      <span className="material-symbols-outlined text-pink-400 text-lg">{factor.icon}</span>
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

      {/* Revenue Section */}
      <section className="py-16 bg-gradient-to-b from-transparent to-green-950/30">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-400/20 border border-green-400/30 mb-6">
            <span className="material-symbols-outlined text-green-400">attach_money</span>
            <span className="text-sm font-bold text-green-300 uppercase tracking-wider">Revenue Share</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-6">
            Earn <span className="text-green-400">50%</span> of Subscription Revenue
          </h2>
          
          <p className="text-lg text-blue-200/70 mb-8 max-w-2xl mx-auto">
            That's approximately <strong className="text-green-400">$1.85–$2.00 per subscriber per month</strong> in your pocket. Passive income that grows with your influence.
          </p>
          
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <p className="text-3xl font-bold text-green-400 mb-2">500</p>
              <p className="text-blue-200/70 text-sm">subscribers</p>
              <p className="text-white font-bold mt-2">~$925-1,000/mo</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-6 border border-green-400/30">
              <p className="text-3xl font-bold text-green-400 mb-2">1,000</p>
              <p className="text-blue-200/70 text-sm">subscribers</p>
              <p className="text-white font-bold mt-2">~$1,850-2,000/mo</p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <p className="text-3xl font-bold text-green-400 mb-2">5,000</p>
              <p className="text-blue-200/70 text-sm">subscribers</p>
              <p className="text-white font-bold mt-2">~$9,250-10,000/mo</p>
            </div>
          </div>
          
          <p className="text-blue-200/50 text-sm">
            Revenue calculated on net subscription income after payment processing fees.
          </p>
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
              { step: "1", title: "You Brand It", desc: "Your logo, colors, and name throughout the entire experience", icon: "palette" },
              { step: "2", title: "We Train It", desc: "Feed your content to create your unique Creator Voice AI", icon: "model_training" },
              { step: "3", title: "Followers Join", desc: "Your audience downloads YOUR app and creates their profile", icon: "group_add" },
              { step: "4", title: "Daily Impact", desc: "Every devotional speaks with YOUR voice to THEIR life stage", icon: "auto_awesome" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="material-symbols-outlined text-white text-2xl">{item.icon}</span>
                </div>
                <div className="size-8 rounded-full bg-pink-400/20 border border-pink-400/40 flex items-center justify-center mx-auto -mt-10 mb-4 text-pink-400 font-bold text-sm">
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
              Meet Your Followers in Their Moment of Need
            </h2>
            <p className="text-blue-200/70 max-w-2xl mx-auto">
              When your followers are struggling — at 2am, in the parking lot before work, in the hospital waiting room — they can access Scripture and guidance for exactly what they're facing.
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
              <p className="text-sm text-blue-200/60">Speak directly with AI that provides caring support</p>
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
                    If you or someone you know is in crisis, <strong className="text-white">call or text 988</strong> (Suicide &amp; Crisis Lifeline).
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
      <section id="pricing" className="py-16" aria-label="Pricing Plans - Free Starter to Creator Voice">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-blue-200/70 mb-4">Choose the level of integration that fits your ministry</p>
            
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
                    ? 'bg-gradient-to-br from-pink-400/20 to-purple-500/20 border-2 border-pink-400/50' 
                    : 'bg-white/5 border border-white/10'
                } relative`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-pink-500 rounded-full text-xs font-bold text-white">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className={`text-xl font-bold ${tier.highlight ? 'text-pink-400' : 'text-white'}`}>
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
                      <span className={`material-symbols-outlined text-base mt-0.5 ${tier.highlight ? 'text-pink-400' : 'text-green-400'}`}>
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
                      ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white hover:shadow-lg hover:shadow-pink-500/25'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Subscriber Pricing */}
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-6 border border-white/10 max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Subscriber Pricing</h3>
              <p className="text-blue-200/70 text-sm">What your followers pay (you keep 50%)</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <span className="material-symbols-outlined text-blue-400 text-2xl mb-2">person</span>
                <p className="text-2xl font-bold text-white">$5<span className="text-sm text-blue-200/50">/month</span></p>
                <p className="text-sm text-blue-200/60">Individual</p>
                <p className="text-xs text-green-400 mt-1">You earn ~$1.85-2.00</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <span className="material-symbols-outlined text-green-400 text-2xl mb-2">family_restroom</span>
                <p className="text-2xl font-bold text-white">$10<span className="text-sm text-blue-200/50">/month</span></p>
                <p className="text-sm text-blue-200/60">Family Plan</p>
                <p className="text-xs text-green-400 mt-1">You earn ~$3.70-4.00</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Follower Insights Section */}
      <section className="py-16" aria-label="Follower Insights Dashboard - Know What Your Followers Are Going Through">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/20 border border-cyan-400/30 mb-4">
              <span className="material-symbols-outlined text-cyan-400 text-sm">psychology</span>
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Follower Insights</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Know What Your Followers Are Going Through
            </h2>
            <p className="text-blue-200/70 max-w-2xl mx-auto">
              Create content that actually meets people where they are. See what your followers are struggling with — anonymously, aggregated, actionable.
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
                  💡 <strong className="text-rose-400">58% of your followers</strong> self-identified as going through something right now.
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
                        <span className="text-blue-200/70">{item.count} followers</span>
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
                  💡 <strong className="text-amber-400">Anxiety up 34%</strong> since September. Time for a content series?
                </p>
              </div>
            </div>
          </div>

          {/* Cross-Insights */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h3 className="text-white font-bold text-lg mb-6 text-center">Demographic + Lifeline Cross-Insights</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { insight: "University-age followers", lifeline: "Faith Doubts", stat: "#1 Lifeline", icon: "school", color: "cyan" },
                { insight: "Followers in 'Struggling'", lifeline: "Anxiety", stat: "83% accessing", icon: "psychology", color: "rose" },
                { insight: "Men vs Women", lifeline: "Anger", stat: "3x more men", icon: "wc", color: "amber" },
                { insight: "Teens this week", lifeline: "Loneliness", stat: "12 followers", icon: "person_off", color: "purple" },
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
                  <li>"Are my followers okay?"</li>
                  <li>"Is anyone struggling financially?"</li>
                  <li>"What content should I create?"</li>
                  <li>"Who's actually engaging?"</li>
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
                  <li>"47 followers hit Financial Stress"</li>
                  <li>"89% weekly engagement, up 12%"</li>
                  <li>"Avg 4.2 min/day, 67% have streaks"</li>
                </ul>
              </div>
            </div>
            <p className="text-center text-xl text-white font-semibold mt-8">
              This isn&apos;t surveillance. It&apos;s <span className="text-cyan-400">serving better</span>.
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
                Social Sharing with Your Hashtag
              </h3>
              
              <p className="text-blue-200/80 mb-6 max-w-2xl">
                Followers will be able to share verses, devotionals, and insights directly to their favorite social media platforms — 
                <strong className="text-white">automatically tagged with your hashtag</strong>.
              </p>
              
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <span className="material-symbols-outlined text-pink-400 text-2xl mb-2">favorite</span>
                  <p className="text-white font-semibold text-sm">Instagram</p>
                  <p className="text-xs text-blue-200/50">#YourBrand</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <span className="material-symbols-outlined text-blue-400 text-2xl mb-2">tag</span>
                  <p className="text-white font-semibold text-sm">Facebook</p>
                  <p className="text-xs text-blue-200/50">#YourBrand</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <span className="material-symbols-outlined text-cyan-400 text-2xl mb-2">chat_bubble</span>
                  <p className="text-white font-semibold text-sm">Twitter/X</p>
                  <p className="text-xs text-blue-200/50">#YourBrand</p>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-pink-400 font-semibold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">trending_up</span>
                  Why This Matters
                </h4>
                <ul className="space-y-2 text-sm text-blue-200/80">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-400 text-base mt-0.5">check</span>
                    <span><strong className="text-white">Organic reach</strong> — Your followers become ambassadors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-400 text-base mt-0.5">check</span>
                    <span><strong className="text-white">Grow your audience</strong> — Every share expands your reach</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-400 text-base mt-0.5">check</span>
                    <span><strong className="text-white">Unified presence</strong> — Every share builds your brand</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-gradient-to-b from-transparent to-indigo-950/30" aria-label="Frequently Asked Questions">
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
                a: "For the free Starter tier, you can be live within 24-48 hours. We'll apply your branding (logo, colors, name) and you're ready to go. The Weekly Content tier adds about a week for initial integration, and Creator Voice takes 2-3 weeks as we ingest and process your content library."
              },
              {
                q: "How much can I earn?",
                a: "You earn 50% of net subscription revenue — approximately $1.85-$2.00 per subscriber per month for individual plans, and $3.70-$4.00 for family plans. With 1,000 subscribers, that's roughly $1,850-$2,000/month in passive recurring income."
              },
              {
                q: "How much work do I need to do?",
                a: "Life Stages requires zero change to how you normally create content. Once it's set up, it just runs. You keep creating videos, podcasts, posts — we handle everything else automatically. If you want to get more involved, we can arrange custom content reviews or direct engagement features. But it's completely optional."
              },
              {
                q: "Can I upgrade tiers later?",
                a: "Absolutely. Many creators start with the free Starter tier to test engagement, then upgrade to Weekly Content once they see the value. You can upgrade anytime, and we'll prorate your setup fees if you move up within the first 90 days."
              },
              {
                q: "How does the AI handle my theological views?",
                a: "During onboarding, we configure the AI with your theological distinctives and teaching style. The AI is trained to interpret Scripture and generate content consistent with your framework. No surprises, no theological drift."
              },
              {
                q: "Is follower data private and secure?",
                a: "100%. You get full access to anonymized analytics for insights, but individual follower data stays private. We never sell or share personal data. You can see trends and patterns without compromising anyone's privacy."
              },
              {
                q: "What if a follower asks the AI something controversial?",
                a: "The AI is trained to handle sensitive topics with wisdom, always pointing back to Scripture and encouraging connection with trusted advisors for complex situations. It won't give medical, legal, or financial advice — and for crisis situations, it provides appropriate resources and encourages professional help."
              },
              {
                q: "Can I customize beyond just branding?",
                a: "Yes! With the Creator Voice tier, you can customize welcome messages, default Lifeline responses, and even create custom categories specific to your audience. Want a Lifeline for 'College Students' or 'New Parents'? We can build it."
              },
              {
                q: "What's the commitment period?",
                a: "Month-to-month for Starter (free) and Weekly Content tiers. Creator Voice has a 6-month minimum to justify the initial ingestion investment, then goes month-to-month. You can cancel anytime with 30 days notice."
              },
            ].map((faq, idx) => (
              <details key={idx} className="group bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors">
                  <span className="text-white font-semibold pr-4">{faq.q}</span>
                  <span className="material-symbols-outlined text-pink-400 group-open:rotate-180 transition-transform shrink-0">
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
      <section className="py-16 bg-gradient-to-t from-pink-900/20 to-transparent">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Turn Influence Into Impact?
          </h2>
          <p className="text-lg text-blue-200/70 mb-8 max-w-2xl mx-auto">
            Your followers trust you. Give them a platform that speaks with <em>your</em> voice — and earn 50% while you sleep.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowContactForm(true)}
              className="px-10 py-4 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-pink-500/25 transition-all"
            >
              Schedule Your Demo
            </button>
            <a 
              href="mailto:influencers@bibleforlifestages.com"
              className="px-8 py-4 border-2 border-white/30 text-white rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">mail</span>
              influencers@bibleforlifestages.com
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
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#0f2137] px-6 py-4 border-t border-white/10">
              <button
                onClick={() => setShowWhyFortyOne(false)}
                className="w-full py-3 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
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
                <label className="block text-sm font-medium text-blue-200/70 mb-1">Your Brand / Ministry Name *</label>
                <input
                  type="text"
                  required
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-pink-400"
                  placeholder="Your Brand Name"
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
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-pink-400"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/70 mb-1">Main Platform</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-pink-400"
                  >
                    <option value="">Select platform</option>
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="podcast">Podcast</option>
                    <option value="facebook">Facebook</option>
                    <option value="other">Other</option>
                  </select>
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
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-pink-400"
                    placeholder="you@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/70 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-pink-400"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1">Total Followers (all platforms)</label>
                <select
                  value={formData.followers}
                  onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-pink-400"
                >
                  <option value="">Select range</option>
                  <option value="under-10k">Under 10,000</option>
                  <option value="10k-50k">10,000-50,000</option>
                  <option value="50k-100k">50,000-100,000</option>
                  <option value="100k-500k">100,000-500,000</option>
                  <option value="500k+">500,000+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1">Interested Plan</label>
                <select
                  value={formData.selectedTier}
                  onChange={(e) => setFormData({ ...formData, selectedTier: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-pink-400"
                >
                  <option value="">Select a plan</option>
                  <option value="Starter">Starter (Free)</option>
                  <option value="Weekly Content">Weekly Content ($41/mo)</option>
                  <option value="Creator Voice">Creator Voice ($141/mo)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1">Anything else?</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-pink-400 resize-none"
                  placeholder="Tell us about your ministry and audience..."
                />
              </div>
              
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
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
