/**
 * Business details used by the Terms of Service and Privacy Policy pages.
 * Values wrapped in [brackets] are placeholders that render highlighted on the
 * page until they are replaced with real information.
 */
export const LEGAL = {
  brand: 'Amplyfy',
  /** Registered legal name of the business operating the site. */
  legalEntity: 'Amplyfy Consulting',
  contactEmail: '[privacy contact email]',
  mailingAddress: '[business mailing address]',
  /** State whose law governs the Terms (area codes in the UI suggest Connecticut). */
  governingState: 'Connecticut',
  smsProgramName: 'Amplyfy Rewards Texts',
  effectiveDate: 'October 12, 2026',
} as const

/**
 * Stored with every coupon alongside the SMS consent flag so we can prove which
 * consent wording a guest agreed to. Bump this whenever the consent text changes.
 * v1: original checkbox text. v2: checkbox text + links to Terms and Privacy Policy.
 */
export const CONSENT_WORDING_VERSION = 'v2'
