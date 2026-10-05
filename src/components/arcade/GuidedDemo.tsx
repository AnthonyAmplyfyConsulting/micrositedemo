'use client'
/* eslint-disable @next/next/no-img-element -- The same assets are embedded in the portable demo. */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import ArcadeExperience, { type ArcadeView } from './ArcadeExperience'
import type { Game } from './scene'
import './guided-demo.css'

type Phase = 'arcade' | 'reward' | 'details' | 'consent' | 'wallet' | 'saved' | 'redeem' | 'complete'
type Box = { x: number; y: number; width: number; height: number }
type Guide = { title: string; body: string; prompt: string; target: string; tap?: boolean }

const gameHelp: Record<Game, string> = {
  dice: 'Tap Roll, or swipe across the tabletop to toss the dice. The game reveals a 5%, 10% or 15% reward.',
  wheel: 'Tap Spin and watch the wheel slow to your reward. Every guest wins 5%, 10% or 15% off.',
  cards: 'Choose one of the three cards. It flips to reveal the same 5%, 10% or 15% rewards.',
  scratch: 'Tap Get Card, then rub the metallic coating to reveal the reward underneath.',
}

function TapHand() {
  return <svg className="tour-hand" viewBox="0 0 48 58" aria-hidden="true" focusable="false">
    <path d="M17 28V8a5 5 0 0 1 10 0v16c0-5 8-5 8 1 0-4 8-3 8 2v12c0 8-5 14-13 14h-5c-6 0-10-3-14-8L4 34c-3-5 3-9 7-5l6 6" fill="#fff0d6" stroke="#784b30" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M27 24v10m8-9v10" fill="none" stroke="#c8a27c" strokeWidth="2" strokeLinecap="round" />
  </svg>
}

/** Anchored to real controls, in the stage's coordinates, never over the explanation. */
function Spotlight({ stage, target, tap }: { stage: React.RefObject<HTMLDivElement | null>; target: string; tap?: boolean }) {
  const [box, setBox] = useState<Box | null>(null)
  const mask = 'tour-mask-' + useId().replace(/:/g, '')
  useEffect(() => {
    const root = stage.current
    if (!root || !target) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const element = root.querySelector<HTMLElement>('[data-guide="' + target + '"]')
        if (!element) { setBox(null); return }
        const a = root.getBoundingClientRect()
        let b = element.getBoundingClientRect()
        const content = root.querySelector<HTMLElement>('[data-demo-content]')
        if (content && b.height < a.height - 24) {
          const offset = b.bottom > a.bottom - 12 ? b.bottom - a.bottom + 12 : b.top < a.top + 12 ? b.top - a.top - 12 : 0
          if (offset) { content.scrollTop += offset; b = element.getBoundingClientRect() }
        }
        const next = { x: b.left - a.left - 6, y: b.top - a.top - 6, width: b.width + 12, height: b.height + 12 }
        setBox(previous => previous && Object.keys(next).every(key => Math.abs(previous[key as keyof Box] - next[key as keyof Box]) < .5) ? previous : next)
      })
    }
    const resize = new ResizeObserver(measure)
    resize.observe(root)
    const content = root.querySelector('[data-demo-content]')
    const changes = new MutationObserver(measure)
    if (content) changes.observe(content, { subtree: true, childList: true, attributes: true })
    root.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    measure()
    const settle = setTimeout(measure, 400)
    return () => { clearTimeout(settle); cancelAnimationFrame(frame); resize.disconnect(); changes.disconnect(); root.removeEventListener('scroll', measure, true); window.removeEventListener('resize', measure) }
  }, [stage, target])
  if (!target || !box) return null
  return <div className="tour-spotlight" aria-hidden="true">
    <svg className="tour-shade" width="100%" height="100%">
      <defs><mask id={mask}><rect width="100%" height="100%" fill="white" /><rect {...box} rx="20" fill="black" /></mask></defs>
      <rect width="100%" height="100%" fill="#120905" opacity=".48" mask={'url(#' + mask + ')'} />
    </svg>
    <div className="tour-ring" style={{ left: box.x, top: box.y, width: box.width, height: box.height }} />
    {tap && <div className="tour-tap" style={{ left: box.x + box.width * .67, top: box.y + box.height * .57 }}><span className="tour-tap-ripple" /><TapHand /></div>}
  </div>
}

function RewardPass({ prize, name, qrUrl, showCode = false }: { prize: number; name: string; qrUrl: string; showCode?: boolean }) {
  return <div className="tour-pass" data-guide={showCode ? 'redeem-pass' : 'saved-pass'}>
    <div className="tour-pass-head"><strong>amplyfy.</strong><span>GUEST REWARD</span></div>
    <div className="tour-pass-offer"><span>GOOD FOOD. GREAT LUCK.</span><strong>{prize}<small>% OFF</small></strong><p>Your next order</p></div>
    <div className="tour-pass-meta"><div><span>GUEST</span><strong>{name.trim() || 'Alex'}</strong></div><div><span>USE</span><strong>One visit</strong></div></div>
    {showCode && <div className="tour-pass-code" data-guide="redemption-code"><img src={qrUrl} alt="Non-redeemable example QR code" width="106" height="106" /><span>DEMO PASS • NOT REDEEMABLE</span></div>}
  </div>
}

export default function GuidedDemo({ textureUrl, assetBase, art, badgeUrl = '/add-to-apple-wallet.svg', qrUrl = '/demo-redemption.svg' }: {
  textureUrl?: string; assetBase?: string; art?: Record<string, string>; badgeUrl?: string; qrUrl?: string
}) {
  const [phase, setPhase] = useState<Phase>('arcade')
  const [view, setView] = useState<ArcadeView>({ screen: 'home', game: 'dice', status: 'loading' })
  const [startScreen, setStartScreen] = useState<ArcadeView['screen']>('home')
  const [run, setRun] = useState(0), [prize, setPrize] = useState(10)
  const [guided, setGuided] = useState(true), [walletSheet, setWalletSheet] = useState(false), [reminder, setReminder] = useState(false)
  const [name, setName] = useState('Alex'), [phone, setPhone] = useState('(203) 555-0142'), [consent, setConsent] = useState(false)
  const stage = useRef<HTMLDivElement>(null), form = useRef<HTMLFormElement>(null)
  const updateView = useCallback((next: ArcadeView) => setView(next), [])
  const playing = phase === 'arcade' && ['requesting', 'playing', 'won'].includes(view.status)
  const step = phase === 'arcade' ? view.screen === 'home' ? 0 : view.screen === 'lobby' ? 1 : 2 : ({ reward: 3, details: 4, consent: 5, wallet: 6, saved: 7, redeem: 8, complete: 8 } as const)[phase]

  const guides: Guide[] = [
    { title: 'One scan. A little excitement.', body: 'A guest scans your QR code and lands here. No download, no account. Just a quick tap to start.', prompt: 'Tap the highlighted play button', target: 'home-play', tap: true },
    { title: 'Let the guest choose.', body: 'Four games, one reward system. Try Lucky Dice for this walkthrough, or choose any game you like.', prompt: 'Tap Lucky Dice to continue', target: 'game-dice', tap: true },
    { title: 'Play a moment. Win a reward.', body: gameHelp[view.game], prompt: view.status === 'loading' ? 'Getting the game ready…' : view.game === 'cards' ? 'Pick a card on the table' : view.game === 'scratch' ? 'Get your card, then scratch to reveal' : view.game === 'dice' ? 'Tap Roll or swipe to toss' : 'Tap Spin to reveal the reward', target: view.game === 'cards' || view.game === 'scratch' && view.status === 'playing' ? 'game-surface' : 'game-action', tap: view.status === 'ready' },
    { title: 'The reward is already theirs.', body: 'The reveal flows straight into the reward screen. Every game leads to this same simple next step.', prompt: 'A real reason to come back', target: 'reward-value' },
    { title: 'Turn a visit into a connection.', body: 'Guests enter their name and phone number to receive their pass. These are fictional details for the demo; nothing is submitted.', prompt: 'Try editing the example details', target: 'guest-details' },
    { title: 'Follow up with permission.', body: 'The optional checkbox records whether the guest wants promotional texts. They can leave it off and still keep their reward.', prompt: 'Choose consent, then continue to Wallet', target: 'consent-action' },
    { title: walletSheet ? 'Confirm the pass.' : 'Put the reward in their pocket.', body: walletSheet ? 'On iPhone, the guest confirms Add in the Wallet sheet. This is an interactive preview, so no real pass is installed.' : 'The guest saves their offer to Apple Wallet. No extra app, and their reward stays easy to find when they return.', prompt: walletSheet ? 'Tap Add to preview the saved pass' : 'Tap Add to Apple Wallet', target: walletSheet ? 'wallet-confirm' : 'wallet-add', tap: true },
    { title: 'A timely reason to return.', body: reminder ? 'With location relevance configured, Wallet can surface a nearby pass on the lock screen. Availability depends on the guest’s device settings.' : 'The offer now travels with the guest. Here is how a location-enabled pass could remind them near the restaurant.', prompt: 'Illustrative location reminder', target: reminder ? 'nearby-reminder' : 'saved-pass' },
    { title: 'A return visit closes the loop.', body: 'Back at the restaurant, staff scan the pass’s unique QR code and validate it with their staff PIN. The offer can only be redeemed once.', prompt: 'From first scan to the next visit', target: 'redemption-code' },
  ]
  const guide = guides[step]

  const resetArcade = (screen: ArcadeView['screen'] = 'home') => {
    setPhase('arcade'); setStartScreen(screen); setView({ screen, game: view.game, status: 'loading' }); setRun(value => value + 1); setWalletSheet(false); setReminder(false)
  }
  const restart = () => { setGuided(true); setName('Alex'); setPhone('(203) 555-0142'); setConsent(false); resetArcade() }
  const previous = () => {
    if (step <= 2) resetArcade(step === 2 ? 'lobby' : 'home')
    else if (phase === 'reward') resetArcade('game')
    else if (phase === 'details') setPhase('reward')
    else if (phase === 'consent') setPhase('details')
    else if (phase === 'wallet') { setWalletSheet(false); setPhase('consent') }
    else if (phase === 'saved') { setReminder(false); setWalletSheet(false); setPhase('wallet') }
    else setPhase('saved')
  }
  const continueDetails = () => { if (form.current?.reportValidity()) setPhase('wallet') }
  const continueForm = (event: React.FormEvent) => { event.preventDefault(); continueDetails() }
  const next = () => {
    if (phase === 'reward') setPhase('details')
    else if (phase === 'details') setPhase('consent')
    else if (phase === 'consent') continueDetails()
    else if (phase === 'saved') { if (!reminder) setReminder(true); else setPhase('redeem') }
    else if (phase === 'redeem') setPhase('complete')
  }
  const nextLabel = phase === 'reward' ? 'See guest details' : phase === 'details' ? 'See the consent step' : phase === 'consent' ? 'Continue to Wallet' : phase === 'saved' ? reminder ? 'See redemption' : 'Preview nearby reminder' : 'Finish the tour'
  const canNext = ['reward', 'details', 'consent', 'saved', 'redeem'].includes(phase)

  return <div className="guided-demo" data-step={step + 1}>
    <div className="tour-toolbar"><div><strong>amplyfy.</strong><span>{guided ? 'THE GUEST JOURNEY' : 'FREE PLAY'}</span></div><button onClick={() => setGuided(value => !value)}>{guided ? 'Hide guide' : 'Show guide'}</button></div>
    <div className="tour-layout">
      <div ref={stage} className="tour-stage">
        <div className="tour-content" data-demo-content>
          {phase === 'arcade' && <ArcadeExperience key={run} initialScreen={startScreen} initialGame={view.game} onViewChange={updateView} textureUrl={textureUrl} assetBase={assetBase} art={art} onPrizeStart={async () => 10} onPrizeComplete={won => { setPrize(won); setPhase(guided ? 'reward' : 'details') }} />}
          {['reward', 'details', 'consent'].includes(phase) && <section className="tour-claim tour-screen">
            <div className="tour-win" data-guide="reward-value"><span>THAT’S A TASTY WIN!</span><h2>{prize}<small>% OFF</small></h2><p>Your next order</p></div>
            <form ref={form} onSubmit={continueForm} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); continueDetails() } }} className="tour-form">
              <h3>Keep your reward.</h3><p>Your pass is one step away.</p>
              <div className="tour-fields" data-guide="guest-details">
                <label htmlFor="tour-guest-name">First name<input id="tour-guest-name" autoComplete="off" value={name} onChange={event => setName(event.target.value)} required maxLength={60} /></label>
                <label htmlFor="tour-guest-phone">Phone number<input id="tour-guest-phone" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={event => setPhone(event.target.value)} required pattern={'[0-9 +.\\(\\)\\-]{10,20}'} /></label>
              </div>
              <div data-guide="consent-action" className="tour-consent-action"><label className="tour-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I’d like promotional texts from Amplyfy.<small>Optional. Your reward is yours either way. Msg & data rates may apply.</small></span></label><button className="arc-main-button" type="button" onClick={continueDetails}>CONTINUE TO WALLET</button></div>
              <p className="tour-example-note">Example details only. No messages are sent.</p>
            </form>
          </section>}
          {phase === 'wallet' && <section className="tour-wallet tour-screen">
            <div className="tour-small-kicker">YOUR REWARD IS READY</div><h2>Take it with you.</h2><p>Save it now. Enjoy it on your next visit.</p>
            <RewardPass prize={prize} name={name} qrUrl={qrUrl} />
            <button className="tour-wallet-badge" data-guide="wallet-add" aria-label="Add to Apple Wallet" onClick={() => setWalletSheet(true)}><img src={badgeUrl} alt="Add to Apple Wallet" width="210" height="68" /></button>
            <p className="tour-example-note">Demo only. No real pass is installed.</p>
            {walletSheet && <div className="tour-wallet-sheet" role="dialog" aria-label="Apple Wallet preview"><div className="tour-wallet-sheet-bar"><button onClick={() => setWalletSheet(false)}>Cancel</button><strong>Wallet preview</strong><button data-guide="wallet-confirm" onClick={() => { setWalletSheet(false); setReminder(false); setPhase('saved') }}>Add</button></div><RewardPass prize={prize} name={name} qrUrl={qrUrl} showCode /><p>Interactive preview of adding a pass.</p></div>}
          </section>}
          {(phase === 'saved' || phase === 'redeem' || phase === 'complete') && <section className={'tour-saved tour-screen' + (reminder && phase === 'saved' ? ' tour-lock-screen' : '')}>
            {reminder && phase === 'saved' ? <><div className="tour-lock-time" aria-hidden="true">12:30<span>YOUR NEXT VISIT</span></div><div className="tour-notification" data-guide="nearby-reminder"><div className="tour-notification-head"><span className="tour-wallet-icon" aria-hidden="true"><i /><i /><i /></span><strong>WALLET</strong><span>Nearby</span></div><h3>A little luck for your next bite.</h3><p>You’re near Amplyfy. Your {prize}% off reward is ready when you are.</p></div><p className="tour-reminder-note">Illustrative reminder. Location-enabled passes and device settings are required.</p><div className="tour-lock-pass"><RewardPass prize={prize} name={name} qrUrl={qrUrl} /></div></> : <><div className="tour-saved-check" aria-hidden="true">✓</div><div className="tour-small-kicker">{phase === 'saved' ? 'SAVED IN THIS DEMO' : phase === 'complete' ? 'FROM SCAN TO RETURN VISIT' : 'READY FOR THE NEXT VISIT'}</div><h2>{phase === 'saved' ? 'A reward worth keeping.' : 'Good food. Again.'}</h2><RewardPass prize={prize} name={name} qrUrl={qrUrl} showCode={phase !== 'saved'} /><p className="tour-example-note">{phase === 'saved' ? 'The guest’s reward stays easy to find.' : 'Example QR only. No live redemption is possible.'}</p></>}
          </section>}
        </div>
        {guided && !playing && phase !== 'complete' && <Spotlight key={guide.target + String(walletSheet) + String(reminder)} stage={stage} target={guide.target} tap={guide.tap} />}
      </div>
      <aside className="tour-coach" aria-label="Guided demo explanation">
        {phase === 'complete' ? <><div className="tour-kicker">THE FULL GUEST JOURNEY</div><h2>A first visit becomes<br />a reason to return.</h2><p>QR scan. A game. A reward. Optional SMS consent. A pass in their pocket.</p><button className="tour-next" onClick={restart}>Replay the walkthrough</button><button className="tour-secondary" onClick={() => { setGuided(false); resetArcade('lobby') }}>Explore all four games</button></> : guided ? <>
          <div className="tour-progress"><span>GUIDED DEMO</span><strong>{String(step + 1).padStart(2, '0')} <span>/ 09</span></strong></div>
          <div className="tour-progress-track" aria-hidden="true">{guides.map((_, index) => <span key={index} className={index <= step ? 'is-reached' : ''} />)}</div>
          <div className="tour-copy" aria-live="polite" aria-atomic="true"><h2>{playing ? 'A real moment of play.' : guide.title}</h2><p>{playing ? 'The guidance steps aside while the game runs. Watch the reward appear, then the journey continues.' : guide.body}</p></div>
          <div className="tour-prompt"><span className={playing ? 'tour-wait-dot' : 'tour-prompt-dot'} />{playing ? 'Revealing the reward…' : guide.prompt}</div>
          {canNext && <button className="tour-next" onClick={next}>{nextLabel}<span aria-hidden="true">→</span></button>}
          <div className="tour-coach-bottom"><button disabled={step === 0 || playing} onClick={previous}>← Previous</button><span>PLAYABLE WALKTHROUGH</span></div>
        </> : <><div className="tour-kicker">EXPLORE THE DEMO</div><h2>Your turn to play.</h2><p>Try any game and follow the reward through to Wallet. All contact details, passes and reminders here are simulated.</p><button className="tour-next" onClick={() => setGuided(true)}>Bring back the guide</button><button className="tour-secondary" onClick={() => resetArcade('lobby')}>Choose another game</button>{phase === 'saved' && <button className="tour-secondary" onClick={() => setPhase('redeem')}>Preview redemption</button>}</>}
        <p className="tour-demo-footer">Demo only · No contacts saved · No texts sent</p>
      </aside>
    </div>
  </div>
}
