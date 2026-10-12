import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: `Privacy Policy • ${LEGAL.brand}`,
  description: `Privacy policy explaining data collection, CRM sync, and pass generation for ${LEGAL.brand}.`,
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#080706] text-[#e8ded1] py-12 px-5 sm:px-8">
      <div className="max-w-3xl mx-auto space-y-8 leading-relaxed">
        {/* Navigation & Header */}
        <header className="border-b border-[#2a221b] pb-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#ff8623] hover:text-[#ffaa55] transition-colors"
            >
              ← Back to Experience
            </Link>
            <div className="flex items-center gap-2">
              <Image
                src="/amplyfy-logo.jpg"
                alt={LEGAL.brand}
                width={28}
                height={28}
                className="rounded-full"
              />
              <span className="font-bold text-sm tracking-tight text-white">{LEGAL.brand}</span>
            </div>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-[#a39482] mt-2">
            Effective Date: {LEGAL.effectiveDate} • Version 2.0
          </p>
        </header>

        {/* Introduction */}
        <section className="space-y-3">
          <p className="text-sm text-[#c7b9a5]">
            At {LEGAL.legalEntity} (&ldquo;{LEGAL.brand}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;),
            we respect your privacy. This Privacy Policy describes how we collect, store, and process your personal
            information when you interact with our guest rewards microsite, claim promotional offers, and download
            authenticated Apple Wallet passes.
          </p>
        </section>

        {/* 1. Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">1. Information We Collect</h2>
          <div className="space-y-2 text-sm text-[#c7b9a5]">
            <p><strong>A. Information You Provide:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Contact Information:</strong> First name and mobile telephone number when claiming a promotional offer.</li>
              <li><strong>Consent Records:</strong> Your explicit opt-in choice, timestamp, and version of consent terms regarding promotional text messages.</li>
            </ul>
            <p className="pt-2"><strong>B. Information Collected Automatically:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Game & Reward Telemetry:</strong> Prize outcomes (e.g. 5%, 10%, 15%), generated pass serial identifiers, and redemption timestamps.</li>
              <li><strong>Technical & Security Data:</strong> IP address and client headers utilized temporarily for rate-limiting, bot prevention, and anti-fraud analysis. We do not track you across unrelated third-party websites.</li>
            </ul>
          </div>
        </section>

        {/* 2. How We Use Your Information */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[#c7b9a5]">
            <li>To personalize and deliver your digital Apple Wallet reward pass.</li>
            <li>To verify and securely record coupon redemption at participating venues.</li>
            <li>To synchronize contact profiles into customer relationship management (CRM) systems (e.g., GoHighLevel) on behalf of {LEGAL.brand} and participating locations.</li>
            <li>If you opted in: To send occasional promotional SMS offers, reminders, and exclusive club benefits.</li>
            <li>To prevent fraud, automated exploitation, duplicate claims, and security abuse.</li>
          </ul>
        </section>

        {/* 3. Sharing & Third-Party Service Providers */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">3. How We Share Information</h2>
          <p className="text-sm text-[#c7b9a5]">
            <strong>We do not sell, rent, or trade your personal information.</strong> We only share data with trusted infrastructure providers essential to delivering this service:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[#c7b9a5]">
            <li><strong>Database & Infrastructure Providers:</strong> Supabase (database storage and backend services) and Vercel (secure application hosting).</li>
            <li><strong>CRM & Messaging Providers:</strong> GoHighLevel (LeadConnector) for contact management and text communication if opted in.</li>
            <li><strong>Mobile Wallet Gateways:</strong> Apple Wallet PKPass signing infrastructure for pass distribution.</li>
            <li><strong>Legal & Compliance:</strong> When required by subpoena, search warrant, or applicable law to protect legal rights and safety.</li>
          </ul>
        </section>

        {/* 4. Data Security & Storage */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">4. Data Security & Protection</h2>
          <p className="text-sm text-[#c7b9a5]">
            We implement administrative, technical, and physical security measures to safeguard your data:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[#c7b9a5]">
            <li>All communication between your device and our servers is encrypted in transit using industry-standard TLS/HTTPS.</li>
            <li>Database tables enforce Row-Level Security (RLS) to prohibit unauthorized read/write access.</li>
            <li>Staff PINs used for pass validation are never stored in plain text; they are hashed with salted bcrypt algorithms.</li>
            <li>Server endpoints enforce strict rate limits to prevent brute-force attacks and abuse.</li>
          </ul>
        </section>

        {/* 5. Your Choices & Opt-Out Rights */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">5. Your Choices & Rights</h2>
          <div className="space-y-2 text-sm text-[#c7b9a5]">
            <p>
              <strong>SMS Opt-Out:</strong> You may revoke text marketing consent at any time by replying <strong>STOP</strong> to any SMS message received from us.
            </p>
            <p>
              <strong>Data Access & Deletion Requests:</strong> You may request access to, correction of, or permanent deletion of your contact records by emailing our privacy team.
            </p>
          </div>
        </section>

        {/* 6. Children's Privacy */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">6. Children&apos;s Privacy</h2>
          <p className="text-sm text-[#c7b9a5]">
            Our promotional services and microsites are directed exclusively toward adults and are not intended for children under 13. We do not knowingly collect personal information from minors.
          </p>
        </section>

        {/* 7. Contact Us */}
        <section className="space-y-3 border-t border-[#2a221b] pt-6">
          <h2 className="text-xl font-bold text-white tracking-tight">7. Privacy Inquiries</h2>
          <p className="text-sm text-[#c7b9a5]">
            If you have questions regarding this Privacy Policy or wish to exercise your rights, please reach out:
          </p>
          <div className="bg-[#140e0a] border border-[#2c2016] p-4 rounded-xl text-xs space-y-1 text-[#d8c8b5]">
            <p><strong>{LEGAL.legalEntity} — Privacy Officer</strong></p>
            <p>Email: <a href={`mailto:${LEGAL.contactEmail}`} className="text-[#ff8623] hover:underline">{LEGAL.contactEmail}</a></p>
            <p>Mailing Address: {LEGAL.mailingAddress}</p>
          </div>
        </section>

        <footer className="border-t border-[#2a221b] pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-[#8c7d6c] gap-3">
          <div>© {new Date().getFullYear()} {LEGAL.legalEntity}. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-white transition-colors">Experience Home</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
