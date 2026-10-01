'use client'
import {useState} from 'react'
import ArcadeExperience from './ArcadeExperience'

// Deliberately isolated from Supabase, GHL and pass signing. No network writes.
export default function Preview({textureUrl,assetBase,art}: {textureUrl?:string;assetBase?:string;art?:Record<string,string>}) {
  const [prize,setPrize]=useState<number|null>(null),[wallet,setWallet]=useState(false),[name,setName]=useState(''),[run,setRun]=useState(0)
  return <div className="arc-preview-frame" id="amplyfy-preview">
    {prize===null&&<ArcadeExperience key={run} textureUrl={textureUrl} assetBase={assetBase} art={art} onPrizeStart={async()=>{const random=new Uint32Array(1);crypto.getRandomValues(random);return [5,10,15][random[0]%3]}} onPrizeComplete={setPrize}/>}
    {prize!==null&&<div className="arc-reward-page"><div className="arc-demo-dialog" aria-label={wallet?'Wallet preview':'Reward form preview'}>
      <h2>{wallet?`It’s yours${name?`, ${name}`:''}!`:'Your reward'}</h2><div className="arc-demo-prize">{prize}% <span style={{fontSize:28}}>OFF</span></div>
      {wallet?<><p>Take your reward with you.</p><button className="arc-demo-wallet" disabled>Add to Apple Wallet</button><p>Preview only. No live pass is issued.</p><button className="arc-main-button" onClick={()=>{setPrize(null);setWallet(false);setRun(v=>v+1)}}>TRY ANOTHER GAME</button></>:
      <><form onSubmit={e=>{e.preventDefault();setWallet(true)}}>
        <label htmlFor="preview-name">Your name</label><input id="preview-name" type="text" autoComplete="given-name" placeholder="First name" value={name} onChange={e=>setName(e.target.value)} required/>
        <label htmlFor="preview-phone">Phone number</label><input id="preview-phone" type="tel" autoComplete="tel" placeholder="(555) 123-4567" required/>
        <label className="arc-demo-consent"><input type="checkbox"/><span>I agree to receive promotional texts from Amplyfy. Consent is optional.</span></label>
        <button type="submit" className="arc-main-button">CONTINUE TO WALLET</button>
      </form><p>Preview only. Your details stay on this screen.</p><button className="arc-text-button" onClick={()=>{setPrize(null);setWallet(false);setRun(v=>v+1)}}>Try another game</button></>}
    </div></div>}
  </div>
}
