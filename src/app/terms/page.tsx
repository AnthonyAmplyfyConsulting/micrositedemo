import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: `Terms of Service • ${LEGAL.brand}`,
  description: `Terms and conditions for ${LEGAL.brand} promotional reward experiences.`,
}

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-xs text-[#a39482] mt-2">
            Effective Date: {LEGAL.effectiveDate} • Version 2.0
          </p>
        </header>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">1. Acceptance of Terms</h2>
          <p className="text-sm text-[#c7b9a5]">
            By accessing or playing our promotional experience (&ldquo;Microsite&rdquo;), redeeming an
            offer, or downloading an Apple Wallet pass provided by {LEGAL.legalEntity} (&ldquo;{LEGAL.brand}&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you agree to be bound by these Terms
            of Service and our <Link href="/privacy" className="text-[#ff8623] underline underline-offset-4">Privacy Policy</Link>.
            If you do not agree, do not participate.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">2. Eligibility & Promotional Offers</h2>
          <p className="text-sm text-[#c7b9a5]">
            Our promotional mini-games are free-to-play marketing demonstrations and guest reward experiences.
            <strong> No purchase is necessary to play.</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[#c7b9a5]">
            <li>Participants must be at least 18 years of age or the age of legal majority in their jurisdiction.</li>
            <li>Limit one (1) reward claim per guest, per phone number during each campaign window unless otherwise indicated.</li>
            <li>Promotional discounts (e.g., 5%, 10%, or 15% off first month or dining offers) have no cash surrender value and cannot be exchanged for cash, gift cards, or credit.</li>
            <li>Discounts may not be stacked or combined with other promotional coupons, employee discounts, or third-party delivery services unless specifically authorized by the participating venue.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">3. Apple Wallet Passes & Redemption</h2>
          <p className="text-sm text-[#c7b9a5]">
            Reward passes saved to Apple Wallet are digitally authenticated for single-use verification.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[#c7b9a5]">
            <li>Each pass contains an expiration date and a unique cryptographic serial number. Expired passes cannot be redeemed.</li>
            <li>Redemption requires in-person presentation to authorized staff who verify and record the pass using a secure staff PIN or scanner.</li>
            <li>We reserve the right to void or refuse any pass obtained through automated scripts, bot abuse, fraudulent submissions, or multiple simultaneous session manipulation.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">4. SMS Messaging & Marketing Communications</h2>
          <p className="text-sm text-[#c7b9a5]">
            If you optionally check the box to receive promotional text messages from {LEGAL.brand} or participating partner restaurants:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[#c7b9a5]">
            <li>You consent to receive recurring marketing text messages (SMS and MMS) sent to the mobile phone number you provided, potentially using automated dialing systems.</li>
            <li><strong>Consent is not a condition of purchase or claiming your reward.</strong> Your game reward is valid whether you opt in or not.</li>
            <li><strong>Message and data rates may apply.</strong> Frequency of messages varies.</li>
            <li><strong>Opt-Out:</strong> You may cancel at any time by texting <strong>STOP</strong> to any message you receive. For assistance, reply <strong>HELP</strong>.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">5. Intellectual Property & Prohibited Conduct</h2>
          <p className="text-sm text-[#c7b9a5]">
            All games, 3D assets, logos, brand elements, audio, and underlying software are the proprietary intellectual property of {LEGAL.legalEntity} and protected by applicable copyright, trademark, and unfair competition laws.
          </p>
          <p className="text-sm text-[#c7b9a5]">
            You agree not to reverse engineer, decompile, spam, execute automated exploitation scripts, or tamper with the prize verification, session tokens, or API endpoints of this microsite.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">6. Disclaimers & Limitation of Liability</h2>
          <p className="text-sm text-[#c7b9a5]">
            THE MICROSITE AND PASS SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, {LEGAL.legalEntity.toUpperCase()} AND ITS AFFILIATES DISCLAIM ALL LIABILITY FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR PARTICIPATION.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">7. Governing Law</h2>
          <p className="text-sm text-[#c7b9a5]">
            These Terms shall be governed by and construed in accordance with the laws of the State of {LEGAL.governingState}, without giving effect to any conflict of law principles.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3 border-t border-[#2a221b] pt-6">
          <h2 className="text-xl font-bold text-white tracking-tight">8. Contact Us</h2>
          <p className="text-sm text-[#c7b9a5]">
            For questions regarding these Terms or promotional pass assistance, please contact:
          </p>
          <div className="bg-[#140e0a] border border-[#2c2016] p-4 rounded-xl text-xs space-y-1 text-[#d8c8b5]">
            <p><strong>{LEGAL.legalEntity}</strong></p>
            <p>Email: <a href={`mailto:${LEGAL.contactEmail}`} className="text-[#ff8623] hover:underline">{LEGAL.contactEmail}</a></p>
            <p>Mailing Address: {LEGAL.mailingAddress}</p>
          </div>
        </section>

        <footer className="border-t border-[#2a221b] pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-[#8c7d6c] gap-3">
          <div>© {new Date().getFullYear()} {LEGAL.legalEntity}. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-white transition-colors">Experience Home</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
