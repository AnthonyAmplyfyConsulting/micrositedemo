'use client'
/* eslint-disable @next/next/no-img-element -- Portable, pre-rendered WebP game thumbnails. */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Game, SceneController, SceneMode } from './scene'
import './arcade.css'

/* Native images keep the same component portable in the isolated preview.
   Thumbnails are small, pre-rendered WebP assets with fixed layout dimensions. */

const games: {id:Game; name:string; verb:string}[] = [
  {id:'wheel',name:'Spin the Wheel',verb:'Spin'},
  {id:'cards',name:'Pick Your Card',verb:'Pick a card'},
  {id:'dice',name:'Lucky Dice',verb:'Roll'},
  {id:'scratch',name:'Scratch & Reveal',verb:'Get card'},
]

function Scene({ mode, textureUrl, controller, onPick, onTick, onReady }: {
  mode:SceneMode; textureUrl:string;controller:React.RefObject<SceneController|null>
  onPick:(index:number)=>void;onTick:()=>void;onReady:()=>void
}) {
  const host=useRef<HTMLDivElement>(null), callbacks=useRef({onPick,onTick,onReady})
  const [failed,setFailed]=useState(false)
  useEffect(()=>{callbacks.current={onPick,onTick,onReady}},[onPick,onTick,onReady])
  useEffect(()=>{
    let cancelled=false,local:SceneController|null=null
    import('./scene').then(({createScene})=>{
      if(cancelled||!host.current)return
      try {
        local=createScene(host.current,mode,textureUrl,i=>callbacks.current.onPick(i),()=>callbacks.current.onTick(),matchMedia('(prefers-reduced-motion: reduce)').matches)
        controller.current=local
        const ready=()=>{if(!cancelled)callbacks.current.onReady()}
        if(mode==='cards')void local.shuffle().then(ready);else ready()
      }catch{setFailed(true);callbacks.current.onReady()}
    }).catch(()=>{if(!cancelled){setFailed(true);callbacks.current.onReady()}})
    return()=>{cancelled=true;local?.dispose();controller.current=null}
  },[mode,textureUrl,controller])
  return <div className="arc-scene" ref={host} role="img" aria-label={mode==='home'?'Gold reward wheel, illustrated cards and ivory dice':`Interactive 3D ${mode}`}>
    {failed&&<div className="arc-scene-fallback">Your reward is still ready to play.<br/>Use the button below.</div>}
  </div>
}

function Scratch({prize,onComplete,onStart,onTick}: {prize:number|null;onComplete:()=>void;onStart:()=>void;onTick:()=>void}) {
  const canvas=useRef<HTMLCanvasElement>(null),down=useRef(false),last=useRef<{x:number;y:number}|null>(null),complete=useRef(false),count=useRef(0)
  const [progress,setProgress]=useState(0)
  useEffect(()=>{
    const ctx=canvas.current!.getContext('2d',{willReadFrequently:true})!
    const g=ctx.createLinearGradient(0,0,620,260);g.addColorStop(0,'#bd7937');g.addColorStop(.28,'#fce4ad');g.addColorStop(.48,'#c39051');g.addColorStop(.7,'#ffecc0');g.addColorStop(1,'#b77a38')
    ctx.fillStyle=g;ctx.fillRect(0,0,620,260)
    let seed=71
    for(let i=0;i<22000;i++){seed=(seed*16807)%2147483647;const x=seed%620;seed=(seed*16807)%2147483647;const y=seed%260;ctx.fillStyle=i%2?'rgba(255,255,255,.12)':'rgba(56,26,5,.13)';ctx.fillRect(x,y,1,1)}
    ctx.strokeStyle='rgba(99,48,17,.14)';ctx.lineWidth=1
    for(let x=-260;x<880;x+=23){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+260,260);ctx.stroke()}
    ctx.fillStyle='#7c491b';ctx.textAlign='center';ctx.font='800 43px Arial';ctx.fillText('SCRATCH HERE',310,142)
  },[])
  const draw=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    if(!down.current||prize===null||complete.current)return
    const c=canvas.current!,rect=c.getBoundingClientRect(),ctx=c.getContext('2d')!
    const p={x:(e.clientX-rect.left)*620/rect.width,y:(e.clientY-rect.top)*260/rect.height}
    ctx.globalCompositeOperation='destination-out';ctx.strokeStyle='#000';ctx.fillStyle='#000';ctx.lineWidth=48;ctx.lineCap='round';ctx.lineJoin='round'
    ctx.beginPath();ctx.moveTo(last.current?.x??p.x,last.current?.y??p.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,24,0,Math.PI*2);ctx.fill();last.current=p
    if(++count.current%5===0){onTick();const pixels=ctx.getImageData(0,0,620,260).data;let erased=0,total=0;for(let i=3;i<pixels.length;i+=64){total++;if(pixels[i]<80)erased++}const amount=Math.round(erased/total*100);setProgress(amount);if(amount>=43){complete.current=true;ctx.clearRect(0,0,620,260);setProgress(100);onComplete()}}
  }
  return <div className="arc-scratch-stage">
    <div className="arc-ticket" style={prize!==null?{transform:'none'}:undefined}>
      <div className="arc-ticket-top"><span>amplyfy.</span><span>REWARDS</span></div>
      <div className="arc-scratch-zone"><div className="arc-scratch-prize"><strong>{prize??'?' }<small>%</small></strong><span>OFF YOUR NEXT ORDER</span></div>
        <canvas ref={canvas} width={620} height={260} aria-label="Scratch the metallic coating to reveal your discount" onPointerDown={e=>{onStart();if(prize===null)return;down.current=true;last.current=null;e.currentTarget.setPointerCapture(e.pointerId);draw(e)}} onPointerMove={draw} onPointerUp={()=>{down.current=false;last.current=null}} onPointerCancel={()=>{down.current=false;last.current=null}} />
      </div>
      <div className="arc-ticket-bottom"><span>GOOD FOOD. GREAT LUCK.</span></div>
    </div>
    <div className="arc-scratch-progress" aria-live="polite">{prize!==null&&progress<100?`${progress}% revealed`:''}</div>
    {prize!==null&&progress<100&&<button className="arc-text-button" onClick={()=>{complete.current=true;canvas.current!.getContext('2d')!.clearRect(0,0,620,260);setProgress(100);onComplete()}}>Reveal without scratching</button>}
  </div>
}

export default function ArcadeExperience({onPrizeStart,onPrizeComplete,textureUrl='/card-back.webp',assetBase='',art}: {
  onPrizeStart:()=>Promise<number>;onPrizeComplete:(prize:number)=>void;textureUrl?:string;assetBase?:string;art?:Record<string,string>
}) {
  const [screen,setScreen]=useState<'home'|'lobby'|'game'>('home'),[game,setGame]=useState<Game>('wheel')
  const [status,setStatus]=useState<'loading'|'ready'|'requesting'|'playing'|'won'>('loading'),[error,setError]=useState(''),[reward,setReward]=useState<number|null>(null)
  const [sound,setSound]=useState(false),[roll,setRoll]=useState('')
  const controller=useRef<SceneController|null>(null),lock=useRef(false),audio=useRef<AudioContext|null>(null),soundRef=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),dragStart=useRef<number|null>(null)
  const tick=useCallback(()=>{
    if(!soundRef.current||!audio.current)return
    const ctx=audio.current,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(650,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(180,ctx.currentTime+.035);gain.gain.setValueAtTime(.085,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.045);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.05)
  },[])
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);void audio.current?.close()},[])
  const toggleSound=()=>{const next=!sound;soundRef.current=next;setSound(next);if(next){audio.current??=new AudioContext();void audio.current.resume();tick()}}
  const choose=(id:Game)=>{if(lock.current)return;setGame(id);setScreen('game');setStatus(id==='scratch'?'ready':'loading');setError('');setReward(null);setRoll('')}
  const ready=useCallback(()=>setStatus('ready'),[])
  const finish=(prize:number)=>{setStatus('won');tick();timer.current=setTimeout(()=>onPrizeComplete(prize),1800)}
  const start=async(choice=1,strength=1)=>{
    if(lock.current||status!=='ready')return
    lock.current=true;setError('');setStatus('requesting')
    try {
      const prize=await onPrizeStart()
      if(![5,10,15].includes(prize))throw new Error('We could not load your reward. Please try again.')
      setReward(prize);setStatus('playing')
      if(game==='scratch')return
      const total=await controller.current?.play(prize,choice,strength)
      if(game==='dice'&&total)setRoll(`Rolled ${total}`)
      finish(prize)
    }catch(e){setError(e instanceof Error?e.message:'Connection interrupted. Please try again.');setStatus('ready');lock.current=false}
  }
  const pickRef=useRef(start);useEffect(()=>{pickRef.current=start})
  const pick=useCallback((i:number)=>{void pickRef.current(i)},[])
  const back=()=>{if(lock.current)return;setScreen('lobby');setStatus('loading');setError('');setReward(null)}
  const selected=games.find(g=>g.id===game)!
  const busy=status==='requesting'||status==='playing'||status==='won'
  return <main className="arc-app">
    <div className="arc-ambient" aria-hidden="true" />
    <div className="arc-shell">
      {screen!=='home'&&<header className="arc-header"><button className="arc-back" aria-label={screen==='lobby'?'Back to home':'All games'} disabled={busy} onClick={()=>{if(screen==='lobby'){setScreen('home');setStatus('loading')}else back()}}>‹</button><button className="arc-sound" onClick={toggleSound} aria-label={`Sound ${sound?'on':'off'}`} aria-pressed={sound}>{sound?'♪':'♫'}</button></header>}
      {screen==='home'&&<section className="arc-home arc-enter">
        <h1>Good Food<br/><em>Great Luck</em></h1>
        <div className="arc-home-scene"><Scene mode="home" textureUrl={textureUrl} controller={controller} onPick={pick} onTick={tick} onReady={ready}/></div>
        <button className="arc-main-button arc-play" aria-label="Play" onClick={()=>{setScreen('lobby');setStatus('ready');tick()}}>
          <svg className="arc-play-symbol" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86a1 1 0 00-1.5.86z" />
          </svg>
        </button>
      </section>}
      {screen==='lobby'&&<section className="arc-lobby arc-enter">
        <h1>Choose your game</h1>
        <div className="arc-game-grid">{games.map(g=><button key={g.id} className={`arc-game-tile arc-tile-${g.id}`} onClick={()=>choose(g.id)}>
          <div className="arc-game-art"><img src={art?.[g.id]??`${assetBase}/game-${g.id}.webp`} alt="" width={320} height={180}/></div>
          <h2>{g.name}</h2>
        </button>)}</div>
      </section>}
      {screen==='game'&&<section className="arc-game arc-enter">
        <h1>{selected.name}</h1>
        <div className={`arc-stage arc-stage-${game}`} onPointerDown={e=>{if(game==='dice'&&status==='ready'){dragStart.current=e.clientY;e.currentTarget.setPointerCapture(e.pointerId)}}} onPointerUp={e=>{if(game==='dice'&&dragStart.current!==null){const distance=Math.abs(e.clientY-dragStart.current);dragStart.current=null;void start(1,distance>15?Math.min(distance/90,2):1)}}} onPointerCancel={()=>{dragStart.current=null}}>
          {game==='scratch'?<Scratch prize={reward} onStart={()=>{}} onTick={tick} onComplete={()=>{if(reward!==null)finish(reward)}}/>:<Scene key={game} mode={game} textureUrl={textureUrl} controller={controller} onPick={pick} onTick={tick} onReady={ready}/>}
          {status==='loading'&&<div className="arc-stage-status" aria-live="polite">{game==='cards'?'Shuffling…':'Loading…'}</div>}
        </div>
        <div className="arc-action-area">
          {error&&<p className="arc-error" role="alert">{error}</p>}
          <div className="arc-result" aria-live="polite">{status==='won'?<><strong>{reward}% OFF</strong>{roll&&<span>{roll}</span>}</>:<span>{status==='requesting'?'Getting your reward…':status==='playing'?(game==='scratch'?'Scratch the foil':'Good luck…'):game==='cards'?'Pick a card':game==='dice'?'Tap or swipe to toss':game==='scratch'?'Reveal your reward':'Give it a spin'}</span>}</div>
          {game==='cards'?<div className="arc-card-choices" aria-label="Choose your card">{[0,1,2].map(i=><button key={i} disabled={status!=='ready'} onClick={()=>void start(i)} aria-label={`Pick card ${i+1}`}>{i+1}</button>)}</div>:
            <button className="arc-main-button" disabled={status!=='ready'} onClick={()=>void start()}>{selected.verb.toUpperCase()}</button>}

        </div>
      </section>}
    </div>
  </main>
}
