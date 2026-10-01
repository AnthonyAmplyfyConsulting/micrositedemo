'use client'
import { useState, use, useRef, useEffect } from 'react'
import ArcadeExperience from '@/components/arcade/ArcadeExperience'
import ClaimForm from './components/ClaimForm'
import WalletView from './components/WalletView'
import Confetti from './components/Confetti'

export default function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const {slug}=use(params)
  const [step,setStep]=useState<'play'|'claim'|'wallet'>('play')
  const [prize,setPrize]=useState<number|null>(null),[spinId,setSpinId]=useState('')
  const [couponId,setCouponId]=useState(''),[guestName,setGuestName]=useState('')
  const [confettiActive,setConfettiActive]=useState(false),[run,setRun]=useState(0)
  const session=useRef<string|null>(null),winningSpin=useRef<{id:string;prize:number}|null>(null)

  useEffect(()=>{
    const viewport=window.visualViewport
    const update=()=>{
      document.documentElement.style.setProperty('--reward-viewport-height',`${viewport?.height??window.innerHeight}px`)
      document.documentElement.style.setProperty('--reward-viewport-top',`${viewport?.offsetTop??0}px`)
    }
    update();viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update)
    return()=>{viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);document.documentElement.style.removeProperty('--reward-viewport-height');document.documentElement.style.removeProperty('--reward-viewport-top')}
  },[])

  const requestReward=async()=>{
    if(winningSpin.current)return winningSpin.current.prize
    session.current??=crypto.randomUUID()
    const res=await fetch('/api/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({restaurantSlug:slug||'amplyfy',sessionToken:session.current})})
    const data=await res.json()
    if(!res.ok||!data.spinId||![5,10,15].includes(data.prize))throw new Error('Your reward could not load. Please try again.')
    winningSpin.current={id:data.spinId,prize:data.prize};setSpinId(data.spinId);setPrize(data.prize)
    return data.prize as number
  }
  const reset=()=>{setStep('play');setConfettiActive(false);setRun(v=>v+1)}
  const restart=()=>{session.current=null;winningSpin.current=null;setPrize(null);setSpinId('');reset()}
  return <>
    {step==='play'&&<ArcadeExperience key={run} onPrizeStart={requestReward} onPrizeComplete={won=>{setPrize(won);setConfettiActive(true);setStep('claim')}}/>}
    {step!=='play'&&<div className="arc-reward-page" aria-hidden="true"/>}
    <Confetti active={confettiActive}/>
    {prize!==null&&<>
      {step==='claim'&&<ClaimForm isOpen onClose={reset} prize={prize} spinId={spinId} onClaimed={(id,name)=>{setCouponId(id);setGuestName(name);setStep('wallet')}} restaurantName="Amplyfy"/>}
      {step==='wallet'&&<WalletView isOpen onClose={restart} guestName={guestName} couponId={couponId} prize={prize}/>}
    </>}
  </>
}
