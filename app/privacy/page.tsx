"use client"

import { useRouter } from "next/navigation"

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-[#0c1929] shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-background/95 backdrop-blur-md p-4 justify-between border-b border-border">
        <button
          onClick={() => router.back()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-base font-bold">Privacy Policy</h2>
        <div className="w-10"></div>
      </div>

      <main className="flex-1 px-6 py-8 prose prose-sm max-w-none">
        <p className="text-muted-foreground text-sm mb-6">Last updated: October 3, 2026</p>

        <h2 className="text-lg font-bold mt-6 mb-3">Overview</h2>
        <p>
          Bible for Life Stages ("we", "our", or "the app") respects your privacy. This policy explains 
          what information we collect and how we use it.
        </p>

        <h2 className="text-lg font-bold mt-6 mb-3">Information We Collect</h2>
        
        <h3 className="text-base font-semibold mt-4 mb-2">Profile Information</h3>
        <p>
          When you set up your profile, you may provide:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your email address</li>
          <li>Your name (optional)</li>
          <li>Age range (optional)</li>
          <li>Gender (optional)</li>
          <li>Self-reported country</li>
          <li>Life situation/season and the &quot;Lifeline&quot; topics you choose (for example money, family, grief)</li>
          <li>Church preference (optional)</li>
          <li>Content style and Bible translation preference</li>
        </ul>
        <p>
          Some of this is kept on your device to personalize your experience. Some of it is also
          transmitted to our servers and to the service providers listed below so we can deliver
          personalized content, process your subscription, send the daily verse email, and deliver
          push notifications. Because life situation and church preference can reveal religious
          beliefs, we treat this as sensitive information. Permission to connect you with church
          leadership is a separate choice; using personalization does not grant that permission.
        </p>

        <h3 className="text-base font-semibold mt-4 mb-2">Church Intelligence and Care</h3>
        <p>
          Church intelligence is intended to use anonymized aggregate patterns from LifeStages,
          including topic sequences across the wider ecosystem. Anonymous reporting must protect
          small groups and must not expose individual messages or identify a person to church leaders.
          It does not establish attendance, a diagnosis, or a prediction about a particular person.
          The production anonymous reporting connection is not enabled in this app version.
        </p>
        <p>
          Permission to connect you with your selected church&apos;s leadership when there are
          serious concerns about physical, spiritual, or mental safety is a separate choice in
          Profile. That choice is saved on this device for that church. This version does not
          implement automatic safety monitoring, alerts, referrals, or sharing your identity with
          leadership. It is not an emergency response service.
        </p>
        <p>
          A separate development pilot for minimized activity uses church-specific pseudonymous
          identifiers. It is disabled in the normal app and is not represented as anonymous data.
          Existing service requests and site performance analytics are separate from church reporting.
        </p>

        <h3 className="text-base font-semibold mt-4 mb-2">AI-Generated Content</h3>
        <p>
          When you request devotional content or chat with a verse, your profile details (which may
          include your name, age range, gender, country, and life situation) and the messages you type
          or speak are sent to our AI providers to generate a personalized response. Generated content
          may be cached on our servers, keyed to age, gender, and life stage, to speed up the app and
          reduce cost.
        </p>

        <h2 className="text-lg font-bold mt-6 mb-3">How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To personalize devotional content for your life stage</li>
          <li>To provide AI-powered features like chat and Deep Dive reflections</li>
          <li>To improve app performance and features</li>
          <li>To process subscriptions (handled by Apple/Google)</li>
        </ul>

        <h2 className="text-lg font-bold mt-6 mb-3">Data Storage</h2>
        <p>
          Your profile and preferences are stored on your device. Your email, subscription status,
          push notification token, usage events, and cached devotional content are also stored on our
          servers, which are hosted with our database provider listed below.
        </p>

        <h2 className="text-lg font-bold mt-6 mb-3">Third-Party Services</h2>
        <p>We share data with the following service providers so the app can function:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>OpenRouter</strong> (Anthropic Claude and Google Gemini models): generating personalized content and powering chat</li>
          <li><strong>ElevenLabs</strong>: the optional voice conversation feature</li>
          <li><strong>Supabase</strong>: our database and backend hosting</li>
          <li><strong>Resend</strong>: sending the daily verse email</li>
          <li><strong>RevenueCat, Apple App Store, and Google Play</strong>: in-app purchases and subscription management</li>
          <li><strong>Apple Push Notification service and Google Firebase Cloud Messaging</strong>: delivering push notifications</li>
          <li><strong>bolls.life and bible-api.com</strong>: providing Bible text (no personal data is sent to them)</li>
        </ul>

        <h2 className="text-lg font-bold mt-6 mb-3">Children's Privacy</h2>
        <p>
          The app includes content appropriate for teenagers (13+). We do not knowingly collect 
          personal information from children under 13.
        </p>

        <h2 className="text-lg font-bold mt-6 mb-3">Account Deletion</h2>
        <p>
          You can permanently delete your account and all associated data at any time.
          To delete your account:
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Open the app and go to <strong>Profile</strong></li>
          <li>Scroll to the bottom and tap <strong>Delete Account</strong></li>
          <li>Confirm by entering your email address</li>
        </ol>
        <p>
          This will permanently remove your email, profile data, push notification registration,
          verse history, and all personalization preferences from our systems. This action cannot be undone.
        </p>
        <p>
          If you have an active subscription, please cancel it through your device&apos;s subscription
          settings before deleting your account. Account deletion does not automatically cancel
          your subscription.
        </p>
        <p>
          You may also request account deletion by emailing{" "}
          <a href="mailto:support@bibleforlifestages.com" className="text-primary">support@bibleforlifestages.com</a>.
        </p>

        <h2 className="text-lg font-bold mt-6 mb-3">Your Rights</h2>
        <p>You can:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Delete your account and all data from within the app (Profile → Delete Account)</li>
          <li>Clear your local data at any time through your device settings</li>
          <li>Request data deletion by email</li>
          <li>Contact us with questions about your data</li>
        </ul>

        <h2 className="text-lg font-bold mt-6 mb-3">Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. We will notify you of significant changes 
          through the app.
        </p>

        <h2 className="text-lg font-bold mt-6 mb-3">Contact Us</h2>
        <p>
          Questions about this privacy policy? Contact us at:<br />
          <a href="mailto:support@bibleforlifestages.com" className="text-primary">support@bibleforlifestages.com</a>
        </p>
      </main>
    </div>
  )
}
