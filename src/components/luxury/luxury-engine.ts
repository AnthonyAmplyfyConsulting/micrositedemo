import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { simulateRoll } from '../arcade/dice-physics'

export type LuxuryGame = 'dice' | 'roulette' | 'golf' | 'cards'
type Assets = Record<string,string>
type Result = {prize:number; detail:string}
type Controls = {aim:number;power:number}
type Scene = {play:(controls:Controls,choice?:number)=>Promise<Result>;shuffle?:()=>Promise<void>;aim?:(c:Controls)=>void;dispose:()=>void}
const TAU=Math.PI*2
const gameList:{id:LuxuryGame;name:string;tag:string;description:string}[]=[
 {id:'dice',name:'Roll Dice',tag:'ROLL & WIN',description:'Give the dice a toss. Let the table decide your reward.'},
 {id:'roulette',name:'Roulette',tag:'SPIN & WIN',description:'A little suspense. One spin. A reward in every pocket.'},
 {id:'golf',name:'Lucky Drive',tag:'AIM FOR PAR',description:'One shot on a 140-yard par 3. Get closer. Win bigger.'},
 {id:'cards',name:'3 Card Monty',tag:'FIND THE WINNER',description:'Remember the rewards. Follow the shuffle. Pick your card.'},
]
export const golfPrize=(distance:number)=>distance<=6?15:distance<=20?10:5
const rouletteRed=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])
export const roulettePrize=(pocket:number)=>pocket===0?5:rouletteRed.has(pocket)?15:10
const randomIndex=(n:number)=>{const v=new Uint32Array(1);crypto.getRandomValues(v);return v[0]%n}
const ease=(t:number)=>1-Math.pow(1-t,4)
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t
function mat(color:number,metalness=0,roughness=.5){return new THREE.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:metalness>.3?.7:0})}
function mesh(g:THREE.BufferGeometry,m:THREE.Material|THREE.Material[],parent:THREE.Object3D,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function tex(draw:(ctx:CanvasRenderingContext2D)=>void,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d')!);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function textTexture(text:string,color='#fff0c8',size=100){return tex(ctx=>{ctx.font=`bold ${size}px Georgia`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,128)},512,256)}
function decal(t:THREE.Texture,w:number,h:number,parent:THREE.Object3D,x=0,y=0,z=0){return mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide,toneMapped:false}),parent,x,y,z)}
function ring(r:number,t:number,m:THREE.Material,parent:THREE.Object3D,y=0){const o=mesh(new THREE.TorusGeometry(r,t,12,128),m,parent,0,y);o.rotation.x=-Math.PI/2;return o}
function horizontalCylinder(r:number,h:number,m:THREE.Material,parent:THREE.Object3D,y=0){return mesh(new THREE.CylinderGeometry(r,r,h,128),m,parent,0,y)}

function createScene(host:HTMLElement,mode:LuxuryGame,assets:Assets,tick:()=>void,status:(s:string)=>void):Scene {
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,700)
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'})
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;scene.environmentIntensity=.35;host.appendChild(renderer.domElement)
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose()
 scene.add(new THREE.HemisphereLight(0xffe1ab,0x16100a,.65))
 const key=new THREE.DirectionalLight(mode==='golf'?0xffedbd:0xffb85d,mode==='golf'?3:4);key.position.set(-4,8,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=12;key.shadow.camera.bottom=-12;scene.add(key)
 const fill=new THREE.PointLight(0xff650d,30,25);fill.position.set(4,4,-3);scene.add(fill)
 const gold=mat(0xd9a24c,.88,.23),black=mat(0x090909,.15,.2),wood=mat(0x241309,.35,.35)
 let frame=0,disposed=false,busy=false,clock=0
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
 const pending=new Set<(ok:boolean)=>void>()
 const animate=(seconds:number,draw:(t:number)=>void)=>new Promise<boolean>(resolve=>{const done=(ok:boolean)=>{pending.delete(done);resolve(ok)};pending.add(done);const duration=reduced?Math.min(seconds,.15):seconds;const start=performance.now();const fn=()=>{if(disposed){done(false);return}const t=Math.min(1,(performance.now()-start)/(duration*1000));draw(t);if(t<1)requestAnimationFrame(fn);else done(true)};fn()})
 const target=new THREE.Vector3(0,0,0)
 if(mode!=='golf'){
  camera.position.set(0,6.8,7.9);target.set(0,.1,0);camera.lookAt(target)
  const tabletop=mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.35}),scene,0,-.14);tabletop.rotation.x=-Math.PI/2;tabletop.castShadow=false
 }
 let idle=()=>{}
 let play:Scene['play']=async()=>({prize:5,detail:''})
 let shuffle:Scene['shuffle']
 let aim:Scene['aim']
 if(mode==='dice'){
  camera.position.set(0,5.8,7.2);camera.lookAt(0,.1,0)
  const tray=new THREE.Group();scene.add(tray)
  mesh(new RoundedBoxGeometry(4.9,.22,3.4,4,.14),wood,tray,0,-.02,0)
  mesh(new RoundedBoxGeometry(4.5,.05,3,4,.09),mat(0x142017,.05,.94),tray,0,.10)
  for(const [x,z,w,d] of [[0,-1.62,4.9,.16],[0,1.62,4.9,.16],[-2.37,0,.16,3.4],[2.37,0,.16,3.4]])mesh(new RoundedBoxGeometry(w,.34,d,3,.05),gold,tray,x,.22,z)
  const dice:THREE.Group[]=[]
  const layouts:Record<number,number[][]>={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]}
  const normals:[[number,number,number],number][]=[[[0,1,0],1],[[0,-1,0],6],[[0,0,1],2],[[0,0,-1],5],[[1,0,0],3],[[-1,0,0],4]]
  for(let i=0;i<2;i++){
   const d=new THREE.Group();scene.add(d);dice.push(d);d.position.set(i? .78:-.78,.63,i?-.15:.22);d.rotation.set(.05,i?.8:.25,.03)
   mesh(new RoundedBoxGeometry(.95,.95,.95,6,.10),black,d)
   for(const [n,value] of normals){const f=new THREE.Group();f.position.set(n[0]*.476,n[1]*.476,n[2]*.476);f.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...n));d.add(f)
    for(const [a,b] of layouts[value]){mesh(new THREE.CircleGeometry(.071,24),mat(0x35230c,.5,.5),f,a*.245,b*.245,.002);const p=mesh(new THREE.SphereGeometry(.062,20,12),gold,f,a*.245,b*.245,.008);p.scale.z=.23;mesh(new THREE.TorusGeometry(.073,.006,6,24),gold,f,a*.245,b*.245,.003)}
   }
  }
  const logo=decal(textTexture('AMPLYFY','#bda475',80),2.2,1.1,tray,0,.133,0);logo.rotation.x=-Math.PI/2
  play=async()=>{busy=true;const prize=[5,10,15][randomIndex(3)];status('Rolling…');let roll:ReturnType<typeof simulateRoll>;try{roll=simulateRoll(prize,1.3)}catch{busy=false;throw new Error('The dice need another toss. Try again.')}await animate(4,t=>{const k=Math.min(roll.frames.length-1,Math.floor(t*(roll.frames.length-1)));const f=roll.frames[k];f.dice.forEach((p,i)=>{dice[i].position.fromArray(p.position);dice[i].quaternion.fromArray(p.quaternion)});if(f.impact&&k%4===0)tick()});busy=false;return{prize,detail:`You rolled ${roll.total}.`}}
 }
 if(mode==='roulette'){
  camera.position.set(0,7.2,7.1);camera.lookAt(0,0,0)
  const wheel=new THREE.Group(),rotor=new THREE.Group();scene.add(wheel);wheel.add(rotor)
  horizontalCylinder(2.65,.5,wood,wheel,-.12);ring(2.58,.095,gold,wheel,.17);ring(2.42,.035,gold,wheel,.20);horizontalCylinder(2.33,.12,black,rotor,.09);ring(1.68,.025,gold,rotor,.18);ring(2.30,.025,gold,rotor,.18)
  const nums=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26]
  const red=rouletteRed
  nums.forEach((n,i)=>{const a=i*TAU/37,b=(i+1)*TAU/37,mid=(a+b)/2;const shape=new THREE.Shape();shape.absarc(0,0,2.27,a+.009,b-.009,false);shape.absarc(0,0,1.68,b-.009,a+.009,true);shape.closePath();const p=mesh(new THREE.ShapeGeometry(shape),mat(n===0?0x12583c:red.has(n)?0x7f100b:0x070707,.3,.33),rotor,0,.175,0);p.rotation.x=-Math.PI/2
   const text=decal(textTexture(String(n),'#ffe6ae',165),.31,.21,rotor,Math.cos(mid)*2,.19,-Math.sin(mid)*2);text.rotation.x=-Math.PI/2;text.rotation.z=mid-Math.PI/2
   const divider=mesh(new THREE.BoxGeometry(.022,.055,.6),gold,rotor,Math.cos(a)*1.98,.20,-Math.sin(a)*1.98);divider.rotation.y=a+Math.PI/2
   const pocket=mesh(new THREE.BoxGeometry(.235,.035,.26),mat(n===0?0x126548:red.has(n)?0x61120c:0x0a0a0a,.25,.35),rotor,Math.cos(mid)*1.51,.135,-Math.sin(mid)*1.51);pocket.rotation.y=mid+Math.PI/2
   const fin=mesh(new THREE.BoxGeometry(.012,.08,.33),gold,rotor,Math.cos(a)*1.52,.16,-Math.sin(a)*1.52);fin.rotation.y=a+Math.PI/2
  })
  const cone=mesh(new THREE.ConeGeometry(1.36,.42,96),wood,rotor,0,.20);cone.rotation.y=.04;ring(1.33,.027,gold,rotor,.07);horizontalCylinder(.18,.42,gold,wheel,.42);mesh(new THREE.SphereGeometry(.18,32,24),gold,wheel,0,.71)
  mesh(new RoundedBoxGeometry(.98,.08,.08,3,.025),gold,wheel,0,.59);mesh(new RoundedBoxGeometry(.08,.08,.98,3,.025),gold,wheel,0,.59)
  const ball=mesh(new THREE.SphereGeometry(.095,32,24),mat(0xffefd7,.15,.12),scene,2.4,.32,0)
  let angle=.4,rotation=0
  idle=()=>{if(!busy){rotor.rotation.y+=.0015;angle-=.004;ball.position.set(Math.cos(angle)*2.39,.29,Math.sin(angle)*2.39)}}
  play=async()=>{busy=true;status('The ball is in play…');const index=randomIndex(37),n=nums[index],startRotation=rotor.rotation.y,spin=TAU*4+.7,startAngle=angle,endRotation=startRotation+spin
   // Pocket centers are (cos(a), -sin(a)); y-axis rotation subtracts rotation from their world polar angle.
   const pocketAngle=-(index+.5)*TAU/37-endRotation
   let finalAngle=pocketAngle;while(finalAngle>startAngle-TAU*8)finalAngle-=TAU
   await animate(6.4,t=>{rotation=startRotation+spin*ease(t);rotor.rotation.y=rotation;const p=t<.75?ease(t/.95):lerp(ease(.75/.95),1,ease((t-.75)/.25));angle=lerp(startAngle,finalAngle,p);const radius=t<.68?2.39:lerp(2.39,1.51,ease((t-.68)/.32));const hop=t>.68&&t<.94?Math.abs(Math.sin((t-.68)*80))*.12*(1-t):0;ball.position.set(Math.cos(angle)*radius,.245+hop,Math.sin(angle)*radius);if(Math.floor(t*100)%4===0&&t<.9)tick()});busy=false;idle=()=>{};return{prize:roulettePrize(n),detail:`${n===0?"Green zero":red.has(n)?"Red":"Black"} ${n} · ${roulettePrize(n)}% off.`}}
 }
 if(mode==='cards'){
  camera.position.set(0,5.1,6.1);camera.lookAt(0,.2,0)
  const cardRoots:THREE.Group[]=[],positions=[-1.65,0,1.65],mapping=[0,1,2]
  const values=[5,10,15]
  const front=(v:number)=>tex(ctx=>{ctx.fillStyle='#080808';ctx.fillRect(0,0,512,768);const g=ctx.createLinearGradient(0,0,512,768);g.addColorStop(0,'#ffe4a0');g.addColorStop(.5,'#9c692e');g.addColorStop(1,'#edc97e');ctx.strokeStyle=g;ctx.lineWidth=6;ctx.strokeRect(17,17,478,734);ctx.lineWidth=1;ctx.strokeRect(27,27,458,714);ctx.fillStyle=g;ctx.font='bold 145px Georgia';ctx.textAlign='center';ctx.fillText(`${v}%`,256,380);ctx.font='26px Arial';ctx.fillText('OFF YOUR FIRST MONTH',256,438);ctx.font='90px Georgia';ctx.fillText(v===5?'♣':v===10?'♥':'♠',256,584);ctx.font='bold 44px Georgia';ctx.textAlign='left';ctx.fillText(`${v}`,40,84);ctx.textAlign='right';ctx.fillText(`${v}`,474,718)},512,768)
  const back=tex(ctx=>{ctx.fillStyle='#080808';ctx.fillRect(0,0,512,768);ctx.strokeStyle='#c6a15b';ctx.lineWidth=6;ctx.strokeRect(17,17,478,734);ctx.lineWidth=1;ctx.strokeRect(29,29,454,710);ctx.save();ctx.beginPath();ctx.rect(38,38,436,692);ctx.clip();for(let a=-700;a<900;a+=32){ctx.beginPath();ctx.moveTo(a,0);ctx.lineTo(a+768,768);ctx.stroke();ctx.beginPath();ctx.moveTo(a,0);ctx.lineTo(a-768,768);ctx.stroke()}ctx.restore();ctx.fillStyle='#090909';ctx.beginPath();ctx.ellipse(256,384,150,105,0,0,TAU);ctx.fill();ctx.strokeStyle='#e3bf75';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#ff8a2a';ctx.font='bold 44px Arial';ctx.textAlign='center';ctx.fillText('AMPLYFY',256,400)},512,768)
  for(let i=0;i<3;i++){const root=new THREE.Group();root.position.set(positions[i],.19,0);scene.add(root);cardRoots.push(root);const card=new THREE.Group();root.add(card);mesh(new RoundedBoxGeometry(1.38,.038,2.12,4,.08),gold,card);const f=decal(front(values[i]),1.34,2.08,card,0,.026,0);f.rotation.x=-Math.PI/2;const b=decal(back,1.34,2.08,card,0,-.026,0);b.rotation.x=Math.PI/2;root.rotation.y=(i-1)*-.08}
  let ready=false
  shuffle=async()=>{busy=true;status('Remember: 5%, 10%, 15%.');await animate(.7,t=>cardRoots.forEach((r,i)=>{r.position.y=.2+Math.sin(t*Math.PI)*.3;r.rotation.y=(i-1)*-.08}));await animate(.85,t=>cardRoots.forEach(r=>{r.rotation.z=Math.PI*ease(t);r.position.y=.2+Math.sin(t*Math.PI)*.5}));status('Follow the cards…')
   let previous=-1
   for(let k=0;k<6;k++){const a=randomIndex(3);let b=(a+1+randomIndex(2))%3;if(a===previous)b=(a+2)%3;previous=b;const ca=mapping[a],cb=mapping[b],xa=positions[a],xb=positions[b];await animate(.52,t=>{const p=ease(t);cardRoots[ca].position.x=lerp(xa,xb,p);cardRoots[cb].position.x=lerp(xb,xa,p);cardRoots[ca].position.z=-Math.sin(t*Math.PI)*.65;cardRoots[cb].position.z=Math.sin(t*Math.PI)*.65;cardRoots[ca].position.y=.25+Math.sin(t*Math.PI)*.18;cardRoots[cb].position.y=.25});[mapping[a],mapping[b]]=[mapping[b],mapping[a]];tick()}
   ready=true;busy=false;status('Choose left, middle, or right.')}
  play=async(_controls,choice=1)=>{if(!ready)throw new Error('Shuffle the cards first.');busy=true;const id=mapping[choice],r=cardRoots[id];status('Turning your card…');await animate(1.1,t=>{r.rotation.z=Math.PI*(1-ease(t));r.position.y=.25+Math.sin(t*Math.PI)*.7;r.position.z=-Math.sin(t*Math.PI)*.15});busy=false;return{prize:values[id],detail:`Your card held ${values[id]}%.`}}
 }
 if(mode==='golf'){
  // A continuous sky and matching atmospheric haze replace the stretched photo horizon.
  scene.background=tex(ctx=>{const sky=ctx.createLinearGradient(0,0,0,512);sky.addColorStop(0,'#493a37');sky.addColorStop(.45,'#af7950');sky.addColorStop(.7,'#e8b47a');sky.addColorStop(1,'#c6b18a');ctx.fillStyle=sky;ctx.fillRect(0,0,512,512)});scene.fog=new THREE.Fog(0xc6b18a,110,390);scene.environmentIntensity=.6;renderer.toneMappingExposure=1.1;fill.intensity=0;key.position.set(-65,85,-85);key.shadow.camera.left=-90;key.shadow.camera.right=90;key.shadow.camera.top=90;key.shadow.camera.bottom=-90;key.shadow.camera.far=260
  camera.fov=48;camera.position.set(0,7,18);target.set(0,1,-45);camera.lookAt(target)
  const grass=tex(ctx=>{ctx.fillStyle='#386b31';ctx.fillRect(0,0,512,512);for(let i=0;i<24000;i++){const x=Math.random()*512,y=Math.random()*512;ctx.strokeStyle=i%3?'#59793988':'#24421f88';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1,y-3);ctx.stroke()}});grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.repeat.set(40,50);grass.anisotropy=4
  const ground=mesh(new THREE.PlaneGeometry(1600,1600,1,1),new THREE.MeshStandardMaterial({map:grass,color:0x718453,roughness:1}),scene,0,-.03,-125);ground.rotation.x=-Math.PI/2
  const fairwayTex=grass.clone();fairwayTex.repeat.set(4,24);
  const fairwayShape=new THREE.Shape();fairwayShape.moveTo(-9,-8);fairwayShape.bezierCurveTo(-18,38,-12,82,-18,132);fairwayShape.quadraticCurveTo(0,150,18,132);fairwayShape.bezierCurveTo(13,85,18,35,9,-8);fairwayShape.closePath();
  const fairway=mesh(new THREE.ShapeGeometry(fairwayShape),new THREE.MeshStandardMaterial({map:fairwayTex,color:0x85ac52,roughness:1}),scene,0,.015,0);fairway.rotation.x=-Math.PI/2;
  // Mowing bands are painted into the turf, with no raised strip edges.
  const mown=tex(ctx=>{ctx.fillStyle='#65844b';ctx.fillRect(0,0,512,512);for(let i=0;i<16;i++){ctx.fillStyle=i%2?'#718e53':'#64804a';ctx.fillRect(0,i*32,512,32)}for(let i=0;i<18000;i++){ctx.fillStyle=i%2?'#ffffff0b':'#0000000c';ctx.fillRect(Math.random()*512,Math.random()*512,1,2)}});mown.wrapS=mown.wrapT=THREE.RepeatWrapping;mown.repeat.set(.025,.007);(fairway.material as THREE.MeshStandardMaterial).map=mown;
  const greenTex=tex(ctx=>{ctx.fillStyle='#78a44e';ctx.fillRect(0,0,512,512);for(let i=0;i<30000;i++){ctx.fillStyle=i%2?'#84ad5e':'#689342';ctx.fillRect(Math.random()*512,Math.random()*512,1,1)}});greenTex.wrapS=greenTex.wrapT=THREE.RepeatWrapping;greenTex.repeat.set(7,7)
  const green=mesh(new THREE.CircleGeometry(19,128),new THREE.MeshStandardMaterial({map:greenTex,color:0x91b35d,roughness:1}),scene,0,.05,-128);green.rotation.x=-Math.PI/2;green.scale.x=1.12
  // Mown fringe and sand hazards, sculpted with irregular outlines.
  const fringe=ring(19.2,.5,mat(0x6d923d,0,1),scene,.02);fringe.position.z=-128;fringe.scale.x=1.12
  for(const [x,z,sx,sz] of [[-22,-114,8,13],[23,-132,10,7]]){const s=new THREE.Shape();for(let i=0;i<=36;i++){const a=i*TAU/36,r=1+.15*Math.sin(a*3)+.08*Math.cos(a*5);const px=Math.cos(a)*sx*r,pz=Math.sin(a)*sz*r;if(i===0)s.moveTo(px,pz);else s.lineTo(px,pz)}const sandTex=tex(ctx=>{ctx.fillStyle='#dbc69a';ctx.fillRect(0,0,512,512);for(let i=0;i<12000;i++){ctx.fillStyle=i%2?'#fff0cc55':'#8c754855';ctx.fillRect(Math.random()*512,Math.random()*512,2,1)}});const bunker=mesh(new THREE.ShapeGeometry(s),new THREE.MeshStandardMaterial({map:sandTex,roughness:1}),scene,x,.06,z);bunker.rotation.x=-Math.PI/2}
  const foliageTexture=tex(ctx=>{ctx.fillStyle='#435a28';ctx.fillRect(0,0,512,512);for(let i=0;i<26000;i++){ctx.fillStyle=['#7e8f47','#243b20','#58732c','#a0a46b'][i%4];ctx.save();ctx.translate(Math.random()*512,Math.random()*512);ctx.rotate(Math.random()*TAU);ctx.beginPath();ctx.ellipse(0,0,2.8,1.2,0,0,TAU);ctx.fill();ctx.restore()}});const treeGeo=new THREE.SphereGeometry(1,24,18);const tp=treeGeo.attributes.position;for(let v=0;v<tp.count;v++){const x=tp.getX(v),y=tp.getY(v),z=tp.getZ(v),n=1+.08*Math.sin(x*18+y*13)+.08*Math.cos(y*17+z*21);tp.setXYZ(v,x*n,y*n,z*n)}treeGeo.computeVertexNormals();const leafMats=[0x445d29,0x5a692e,0x6a7335].map(color=>new THREE.MeshStandardMaterial({map:foliageTexture,bumpMap:foliageTexture,bumpScale:.18,color,roughness:1})),trunkMat=mat(0x4c3d24,0,1)
  for(let i=0;i<95;i++){const side=i%2?1:-1,x=side*(34+Math.random()*65),z=20-Math.random()*235,h=5+Math.random()*8;mesh(new THREE.CylinderGeometry(.22,.4,h,6),trunkMat,scene,x,h/2,z);for(let j=0;j<3;j++){const crown=mesh(treeGeo,leafMats[i%3],scene,x+Math.sin(j*2)*2,h-1+j*1.5,z+Math.cos(j*2)*1.5);crown.scale.set(h*.43,h*.32,h*.4)}}
  const hillsMat=mat(0x77765a,0,1);for(let i=0;i<10;i++){const hill=mesh(new THREE.SphereGeometry(1,20,16),hillsMat,scene,(i-5)*55,-12,-280-Math.random()*70);hill.scale.set(55,25+Math.random()*15,65)}
  const hole=mesh(new THREE.CircleGeometry(.28,48),mat(0x050604),scene,0,.067,-128);hole.rotation.x=-Math.PI/2
  mesh(new THREE.CylinderGeometry(.045,.045,4.6,12),mat(0xf7e6ba,.2,.3),scene,0,2.35,-128)
  const flagGeo=new THREE.PlaneGeometry(2.6,1.25,12,4),flag=mesh(flagGeo,mat(0xe65a17,.1,.6),scene,1.3,4.15,-128);(flag.material as THREE.MeshPhysicalMaterial).side=THREE.DoubleSide
  const ballTex=tex(ctx=>{ctx.fillStyle='#f7f5e9';ctx.fillRect(0,0,512,512);for(let y=16;y<512;y+=30)for(let x=16;x<512;x+=30){const dx=x+(y%60?10:0);const g=ctx.createRadialGradient(dx-2,y-2,0,dx,y,10);g.addColorStop(0,'#a5a598');g.addColorStop(.6,'#c7c7b8');g.addColorStop(1,'#fffff5');ctx.fillStyle=g;ctx.beginPath();ctx.arc(dx,y,10,0,TAU);ctx.fill()}})
  const ball=mesh(new THREE.SphereGeometry(.28,32,24),new THREE.MeshPhysicalMaterial({map:ballTex,bumpMap:ballTex,bumpScale:.012,roughness:.35,color:0xffffff}),scene,0,.31,0)
  // Tee box with markers and a polished club head at address.
  const tee=mesh(new THREE.BoxGeometry(8,.15,5),mat(0x4f773c,0,.95),scene,0,.05,1);tee.receiveShadow=true
  for(const x of [-3.5,3.5])mesh(new THREE.SphereGeometry(.25,20,16),mat(0xe17926,.7,.35),scene,x,.28,2)
  // Forged cavity-back iron: curved toe, lofted face, grooves, hosel, ferrule and grip.
  const club=new THREE.Group();scene.add(club);club.position.set(.63,.36,.25);club.rotation.y=-.12;
  const steel=mat(0xbcc2c5,.95,.22),darkSteel=mat(0x394044,.85,.3);
  const iron=new THREE.Group();club.add(iron);iron.rotation.x=-.3;
  const outline=new THREE.Shape();outline.moveTo(-.48,-.16);outline.quadraticCurveTo(-.6,.12,-.42,.28);outline.quadraticCurveTo(-.05,.39,.35,.25);outline.quadraticCurveTo(.48,.19,.46,-.1);outline.quadraticCurveTo(.03,-.24,-.48,-.16);
  const head=mesh(new THREE.ExtrudeGeometry(outline,{depth:.16,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.04,bevelThickness:.035,curveSegments:24}),steel,iron);
  const cavity=mesh(new RoundedBoxGeometry(.58,.22,.03,4,.04),darkSteel,iron,0,.04,.21);
  decal(textTexture('AMPLYFY','#e0b56a',80),.48,.16,iron,0,.045,.232);
  for(let i=0;i<7;i++)mesh(new THREE.BoxGeometry(.66,.008,.006),darkSteel,iron,-.05,-.1+i*.045,-.039);
  const shaftRoot=new THREE.Group();shaftRoot.position.set(.38,.12,.08);shaftRoot.rotation.z=-.24;club.add(shaftRoot);
  mesh(new THREE.CylinderGeometry(.07,.09,.4,20),steel,shaftRoot,0,.18,0);
  mesh(new THREE.CylinderGeometry(.067,.067,.12,20),mat(0x171b1c,0,.5),shaftRoot,0,.42,0);
  mesh(new THREE.CylinderGeometry(.027,.041,3.2,24),steel,shaftRoot,0,2.06,0);
  const gripMat=mat(0x181c1d,0,.85);mesh(new THREE.CylinderGeometry(.07,.055,.9,24),gripMat,shaftRoot,0,4.04,0);
  for(let i=0;i<18;i++){const band=mesh(new THREE.TorusGeometry(.061,.004,6,24),mat(0x4c5050,0,.8),shaftRoot,0,3.65+i*.044,0);band.rotation.x=Math.PI/2}
  mesh(new THREE.SphereGeometry(.071,16,12),gripMat,shaftRoot,0,4.49,0);
  const arcPoints=new Float32Array(60*3),guideGeo=new THREE.BufferGeometry();guideGeo.setAttribute('position',new THREE.BufferAttribute(arcPoints,3));const guide=new THREE.Line(guideGeo,new THREE.LineDashedMaterial({color:0xffe2a1,dashSize:1.6,gapSize:1,transparent:true,opacity:.7}));scene.add(guide)
  const updateAim=(c:Controls)=>{const a=c.aim*Math.PI/180,d=c.power*1.72;for(let i=0;i<60;i++){const t=i/59;arcPoints[i*3]=Math.sin(a)*d*t;arcPoints[i*3+1]=.4+Math.sin(t*Math.PI)*20;arcPoints[i*3+2]=-Math.cos(a)*d*t}guideGeo.attributes.position.needsUpdate=true;guide.computeLineDistances();const pull=Math.max(0,Math.min(1,(c.power-35)/65));club.rotation.z=-pull*.55;club.position.z=.25+pull*.22;club.position.y=.36+pull*.12;club.rotation.y=-.12+(c.aim*Math.PI/180)*.4};aim=updateAim;updateAim({aim:0,power:72})
  const flagPositions=flagGeo.attributes.position as THREE.BufferAttribute
  idle=()=>{for(let i=0;i<flagPositions.count;i++){const x=flagPositions.getX(i);flagPositions.setZ(i,Math.sin(clock*2+x*2.4)*.16*(x+1.3)/2.6)}flagPositions.needsUpdate=true}
  play=async(c)=>{busy=true;guide.visible=false;status('Swing…');const startRotZ=club.rotation.z,startRotY=club.rotation.y,startPosZ=club.position.z,startPosY=club.position.y;await animate(.46,t=>{const swing=Math.sin(t*Math.PI*.72);club.rotation.z=lerp(startRotZ,.65,swing);club.rotation.y=lerp(startRotY,.45,t);club.position.z=lerp(startPosZ,-.06,t);club.position.y=lerp(startPosY,.36,t)});club.visible=false;tick();status('Ball in flight…');const angle=c.aim*Math.PI/180,range=c.power*1.72,wind=2.4;const flightX=Math.sin(angle)*range+wind,flightZ=-Math.cos(angle)*range;
   await animate(3.1,t=>{ball.position.set(flightX*t,.3+4*22*t*(1-t),flightZ*t);ball.rotation.x+=.2;const follow=ease(Math.min(1,t*2));camera.position.set(lerp(0,ball.position.x+7,follow),lerp(7,ball.position.y+12,follow),lerp(18,ball.position.z+22,follow));target.copy(ball.position);camera.lookAt(target)});status('Rolling to a stop…');const roll=7.2*(c.power/100),endX=flightX+Math.sin(angle)*roll,endZ=flightZ-Math.cos(angle)*roll;
   await animate(2,t=>{const p=ease(t);ball.position.set(lerp(flightX,endX,p),.29+Math.abs(Math.sin(t*15))*.85*Math.pow(1-t,2),lerp(flightZ,endZ,p));ball.rotation.x+=.12*(1-t);camera.position.lerp(new THREE.Vector3(endX+9,16,endZ+18),.035);target.lerp(new THREE.Vector3(endX*.5,0,lerp(endZ,-128,.5)),.025);camera.lookAt(target)});
   const distance=Math.hypot(endX,endZ+128),prize=golfPrize(distance);if(distance<.45)ball.position.set(0,-.1,-128);busy=false;status(`${distance.toFixed(1)} metres from the cup.`);return{prize,detail:`${distance.toFixed(1)} metres from the cup.`}}
 }
 const resize=()=>{const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix()};const ro=new ResizeObserver(resize);ro.observe(host);resize()
 const draw=()=>{if(disposed)return;frame=requestAnimationFrame(draw);clock+=.016;idle();renderer.render(scene,camera)};draw()
 return {play,shuffle,aim,dispose:()=>{disposed=true;cancelAnimationFrame(frame);pending.forEach(done=>done(false));pending.clear();ro.disconnect();const gs=new Set<THREE.BufferGeometry>(),ms=new Set<THREE.Material>(),ts=new Set<THREE.Texture>();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){gs.add(o.geometry);const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{ms.add(m);Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)ts.add(v)})})}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());if(scene.background instanceof THREE.Texture)scene.background.dispose();env.dispose();renderer.dispose();renderer.domElement.remove()}}
}

export function mountLuxury(root:HTMLElement,providedAssets?:Assets){
 const assets=providedAssets??Object.fromEntries(['hero','table','dice','roulette','golf','cards','logo','golf-environment'].map(k=>[k,`/luxury/${k}.webp`]))
 let active:Scene|null=null,interval:ReturnType<typeof setInterval>|null=null,timer:ReturnType<typeof setTimeout>|null=null,destroyed=false,generation=0,sound=false,audio:AudioContext|null=null,locked=false,currentPrize=5,currentGame:LuxuryGame='dice'
 const tick=()=>{if(!sound)return;audio??=new AudioContext();void audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(480,audio.currentTime);o.frequency.exponentialRampToValueAtTime(130,audio.currentTime+.06);g.gain.setValueAtTime(.04,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.09);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.1)}
 const clear=()=>{generation++;active?.dispose();active=null;if(interval)clearInterval(interval);if(timer)clearTimeout(timer);interval=null;timer=null;locked=false}
 const brand=()=>`<div class="amp-brand"><div class="amp-wordmark"><img src="${assets.logo}" alt="Amplyfy"></div></div><p class="amp-topline">RESTAURANT GROWTH DEMO</p><div class="amp-rule"></div>`
 const nav=(back:()=>void)=>{const b=root.querySelector<HTMLButtonElement>('.amp-back');if(b)b.onclick=()=>{if(!locked)back()};const a=root.querySelector<HTMLButtonElement>('.amp-audio');if(a)a.onclick=()=>{sound=!sound;a.textContent=sound?'ON':'OFF';a.setAttribute('aria-pressed',String(sound));a.setAttribute('aria-label',`Sound ${sound?'on':'off'}`);tick()}}
 const navHtml=()=>`<nav class="amp-nav"><button class="amp-back" aria-label="Back">‹</button><button class="amp-audio" aria-label="Sound ${sound?'on':'off'}" aria-pressed="${sound}">${sound?'ON':'OFF'}</button></nav>`
 const screen=(cls:string,contents:string,background='table')=>{root.innerHTML=`<main class="amp-screen ${cls}" style="background-image:url('${assets[background]}')">${contents}</main>`}
  const legalFooter=()=>`<div class="amp-legal-footer"><a href="/terms">Terms of Service</a><span>•</span><a href="/privacy">Privacy Policy</a></div>`

 const home=()=>{clear();screen('amp-home',brand()+`<h1>Grow<span class="amp-rotating amp-gradient" aria-live="off">Repeat Visits</span></h1><p class="amp-copy">Guests scan, play, and unlock an offer.<br>You collect leads, build loyalty, and<br>bring customers back more often.</p><div class="amp-home-bottom"><button class="amp-primary" data-action="play">Play Now</button><p class="amp-fine">FOUR GAMES. EVERY GUEST WINS.</p>${legalFooter()}</div>`,'hero');root.querySelector<HTMLButtonElement>('[data-action=play]')!.onclick=lobby;let i=0;const phrases=['Repeat Visits','Customer LCV','Regulars','Loyalty'];if(!matchMedia('(prefers-reduced-motion: reduce)').matches)interval=setInterval(()=>{const el=root.querySelector('.amp-rotating');if(el){el.classList.remove('amp-change');el.textContent=phrases[++i%phrases.length];void (el as HTMLElement).offsetWidth;el.classList.add('amp-change')}},3200)}
 const lobby=()=>{clear();screen('amp-lobby',navHtml()+brand()+`<h1>Choose <span class="amp-gradient">Your Game</span></h1><p class="amp-copy">A little fun. A reason to come back.<br>Play for 5–15% off your first month with us.</p><div class="amp-grid">${gameList.map(g=>`<button class="amp-tile" data-game="${g.id}" aria-label="Play ${g.name}"><img src="${assets[g.id]}" alt="" loading="eager"><div class="amp-tile-label"><h2>${g.name}</h2><span>${g.tag}</span></div></button>`).join('')}</div><p class="amp-fine">PICK A GAME. YOUR NEXT VISIT STARTS HERE.</p>${legalFooter()}`);nav(home);root.querySelectorAll<HTMLButtonElement>('[data-game]').forEach(b=>b.onclick=()=>game(b.dataset.game as LuxuryGame))}
 const confetti=()=>{const c=document.createElement('div');c.className='amp-confetti';c.setAttribute('aria-hidden','true');c.innerHTML=Array.from({length:36},(_,i)=>`<i style="left:${i*2.8}%;animation-delay:${i%7*.1}s;transform:rotate(${i*23}deg)"></i>`).join('');root.querySelector('main')?.appendChild(c)}
 const game=(id:LuxuryGame)=>{clear();currentGame=id;const selected=gameList.find(g=>g.id===id)!;const cards=id==='cards',golf=id==='golf';screen('amp-game-screen',navHtml()+brand()+`<h1>${selected.name}</h1><p class="amp-copy">${selected.description}</p><div class="amp-stage ${golf?'amp-golf-stage':''}" role="img" aria-label="Interactive 3D ${selected.name}"><div class="amp-loading">Setting the table…</div><div class="amp-status" aria-live="polite"></div>${golf?`<div class="amp-golf-overlay" aria-hidden="true"><div class="amp-golf-instruction"><span class="amp-golf-instruction-dot"></span><span>Drag & pull back to swing</span></div><svg class="amp-golf-slingshot" style="display:none"><defs><linearGradient id="amp-golf-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffe4a0"/><stop offset="100%" stop-color="#ff5910"/></linearGradient><filter id="amp-golf-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter></defs><line class="amp-golf-arrow-line" stroke="#ffe4a0" stroke-width="2.5" stroke-dasharray="5 4" opacity="0.85"/><circle class="amp-golf-arrow-head" r="4.5" fill="#ffe4a0" opacity="0.9"/><line class="amp-golf-tether" stroke="url(#amp-golf-grad)" stroke-width="3.5" stroke-linecap="round" filter="url(#amp-golf-glow)"/><circle class="amp-golf-anchor" r="7" fill="none" stroke="#ffe4a0" stroke-width="2.5"/><circle class="amp-golf-anchor-inner" r="3" fill="#ffe4a0"/><circle class="amp-golf-handle" r="14" fill="#ff611633" stroke="#ff8b38" stroke-width="2.5" filter="url(#amp-golf-glow)"/><circle class="amp-golf-handle-core" r="5" fill="#fff"/></svg><div class="amp-golf-hud" style="display:none"><span class="amp-golf-hud-pwr">POWER <b>72%</b></span><span class="amp-golf-hud-sep"></span><span class="amp-golf-hud-aim">AIM <b>0°</b></span></div></div>`:''}</div><div class="amp-prizes">${golf?'<span><b>15%</b>WITHIN 6 M</span><span><b>10%</b>WITHIN 20 M</span><span><b>5%</b>EVERY SHOT</span>':id==='dice'?'<span><b>5%</b>ROLL 2–5</span><span><b>10%</b>ROLL 6–9</span><span><b>15%</b>ROLL 10–12</span>':cards?'<span><b>5%</b></span><span><b>10%</b></span><span><b>15%</b></span>':'<span><b>15%</b>RED NUMBER</span><span><b>10%</b>BLACK NUMBER</span><span><b>5%</b>GREEN ZERO</span>'}</div><div class="amp-controls">${id==='roulette'?'<p class="amp-roulette-rule">Root for red to win 15% off. Every spin wins a reward.</p>':''}${golf?`<div class="amp-golf-guide-badge"><div class="amp-golf-guide-pulse"></div><div class="amp-golf-guide-text"><strong>PULL BACK & RELEASE TO SWING</strong><span>Touch fairway, drag down to charge power, angle to aim, release to shoot.</span></div></div>`:''}${cards?'<div class="amp-choice-row" hidden><button data-pick="0">Left card</button><button data-pick="1">Middle card</button><button data-pick="2">Right card</button></div>':''}${golf?'':`<button class="amp-primary" data-action="start" disabled>${cards?'Shuffle the Cards':id==='dice'?'Roll the Dice':'Spin the Wheel'}</button>`}<p class="amp-error" role="alert" hidden></p><p class="amp-fine">DEMO PLAY • NO PURCHASE NECESSARY</p></div>`);nav(lobby)
 const stage=root.querySelector<HTMLElement>('.amp-stage')!,message=stage.querySelector<HTMLElement>('.amp-status')!,start=root.querySelector<HTMLButtonElement>('[data-action=start]')
 const controls=()=>({aim:Number(root.querySelector<HTMLInputElement>('#amp-aim')?.value??0),power:Number(root.querySelector<HTMLInputElement>('#amp-power')?.value??72)})
 const setStatus=(s:string)=>{if(message.isConnected)message.textContent=s}
 try{active=createScene(stage,id,assets,tick,setStatus);stage.querySelector('.amp-loading')?.remove();if(start)start.disabled=false;setStatus(cards?'The rewards are face up. Remember them.':golf?'A gentle crosswind blows right.':'Ready when you are.')}
 catch(e){stage.innerHTML='<div class="amp-fallback">This device could not start the 3D scene.<br>Try a browser with WebGL enabled.</div>';if(start)start.textContent='3D unavailable';console.error(e);return}
 const sceneAtStart=active,version=generation
 root.querySelectorAll<HTMLInputElement>('input[type=range]').forEach(input=>input.oninput=()=>{const c=controls();root.querySelector('#amp-aim-value')!.textContent=`${c.aim}°`;root.querySelector('#amp-power-value')!.textContent=`${c.power}%`;sceneAtStart.aim?.(c)})
 const disable=(state:boolean)=>{root.querySelectorAll<HTMLButtonElement|HTMLInputElement>('.amp-controls button,.amp-controls input,.amp-back').forEach(b=>b.disabled=state)}
 const finish=async(choice?:number,overrideControls?:Controls)=>{if(locked)return;locked=true;disable(true);const overlay=stage.querySelector<HTMLElement>('.amp-golf-overlay');if(overlay)overlay.style.display='none';root.querySelector<HTMLElement>('.amp-error')!.hidden=true;try{const r=await sceneAtStart.play(overrideControls??controls(),choice);if(destroyed||version!==generation)return;currentPrize=r.prize;setStatus(r.detail);stage.insertAdjacentHTML('beforeend',`<div class="amp-reveal"><div class="amp-reveal-amount amp-gradient">${r.prize}%</div><span>OFF YOUR FIRST MONTH WITH US</span><p>${r.detail}</p></div>`);confetti();tick();timer=setTimeout(()=>claim(),2200)}catch(e){if(version!==generation)return;locked=false;disable(false);if(overlay)overlay.style.display='';const error=root.querySelector<HTMLElement>('.amp-error')!;error.hidden=false;error.textContent=e instanceof Error?e.message:'Please try again.'}}
 if(start)start.onclick=async()=>{if(cards){if(locked)return;locked=true;disable(true);try{await sceneAtStart.shuffle?.();if(version!==generation)return;locked=false;start.hidden=true;const row=root.querySelector<HTMLElement>('.amp-choice-row')!;row.hidden=false;disable(false)}catch{locked=false;disable(false);setStatus('Please try shuffling again.')}}else void finish()}
 root.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(b=>b.onclick=()=>void finish(Number(b.dataset.pick)))
 if(golf){
  let dragging=false,pid:number|null=null,startX=0,startY=0,aimVal=0,pwrVal=72
  const overlay=stage.querySelector<HTMLElement>('.amp-golf-overlay')
  const instr=overlay?.querySelector<HTMLElement>('.amp-golf-instruction')
  const svg=overlay?.querySelector<SVGSVGElement>('.amp-golf-slingshot')
  const hud=overlay?.querySelector<HTMLElement>('.amp-golf-hud')
  const hudPwr=hud?.querySelector<HTMLElement>('.amp-golf-hud-pwr b')
  const hudAim=hud?.querySelector<HTMLElement>('.amp-golf-hud-aim b')
  const tether=svg?.querySelector<SVGLineElement>('.amp-golf-tether')
  const anchor=svg?.querySelector<SVGCircleElement>('.amp-golf-anchor')
  const anchorIn=svg?.querySelector<SVGCircleElement>('.amp-golf-anchor-inner')
  const handle=svg?.querySelector<SVGCircleElement>('.amp-golf-handle')
  const handleCore=svg?.querySelector<SVGCircleElement>('.amp-golf-handle-core')
  const arrowL=svg?.querySelector<SVGLineElement>('.amp-golf-arrow-line')
  const arrowH=svg?.querySelector<SVGCircleElement>('.amp-golf-arrow-head')
  const onDown=(e:PointerEvent)=>{
   if(locked||e.button>0)return
   const r=stage.getBoundingClientRect()
   startX=e.clientX-r.left;startY=e.clientY-r.top;pid=e.pointerId
   try{stage.setPointerCapture(pid)}catch{}
   dragging=true;aimVal=0;pwrVal=72
   if(instr)instr.style.display='none'
   if(svg)svg.style.display='block'
   if(hud)hud.style.display='flex'
   anchor?.setAttribute('cx',String(startX));anchor?.setAttribute('cy',String(startY))
   anchorIn?.setAttribute('cx',String(startX));anchorIn?.setAttribute('cy',String(startY))
   onMove(e)
  }
  const onMove=(e:PointerEvent)=>{
   if(!dragging)return
   const r=stage.getBoundingClientRect(),cx=e.clientX-r.left,cy=e.clientY-r.top
   const dx=cx-startX,dy=cy-startY
   const pull=Math.max(0,dy),ratio=Math.min(1,Math.max(0,(pull-6)/125))
   pwrVal=Math.round(35+ratio*65)
   aimVal=Math.max(-18,Math.min(18,Math.round(-dx*0.22)))
   sceneAtStart.aim?.({aim:aimVal,power:pwrVal})
   tether?.setAttribute('x1',String(startX));tether?.setAttribute('y1',String(startY))
   tether?.setAttribute('x2',String(cx));tether?.setAttribute('y2',String(cy))
   handle?.setAttribute('cx',String(cx));handle?.setAttribute('cy',String(cy))
   handleCore?.setAttribute('cx',String(cx));handleCore?.setAttribute('cy',String(cy))
   const rad=aimVal*Math.PI/180,len=30+ratio*55
   const fx=startX+Math.sin(rad)*len,fy=startY-Math.cos(rad)*len
   arrowL?.setAttribute('x1',String(startX));arrowL?.setAttribute('y1',String(startY))
   arrowL?.setAttribute('x2',String(fx));arrowL?.setAttribute('y2',String(fy))
   arrowH?.setAttribute('cx',String(fx));arrowH?.setAttribute('cy',String(fy))
   if(hudPwr)hudPwr.textContent=`${pwrVal}%`
   if(hudAim)hudAim.textContent=aimVal===0?'0°':`${aimVal>0?'+':''}${aimVal}°`
  }
  const onUp=(e:PointerEvent)=>{
   if(!dragging||(pid!==null&&e.pointerId!==pid))return
   dragging=false
   if(pid!==null){try{stage.releasePointerCapture(pid)}catch{};pid=null}
   if(svg)svg.style.display='none'
   if(hud)hud.style.display='none'
   const r=stage.getBoundingClientRect(),dy=e.clientY-r.top-startY
   if(dy>=20){void finish(undefined,{aim:aimVal,power:pwrVal})}
   else{if(instr)instr.style.display='flex';sceneAtStart.aim?.({aim:0,power:72})}
  }
  stage.onpointerdown=onDown;stage.onpointermove=onMove;stage.onpointerup=onUp;stage.onpointercancel=onUp
 }
 }
 const claim=()=>{clear();screen('amp-claim-screen',navHtml()+brand()+`<h1>You <span class="amp-gradient">Won It.</span></h1><div class="amp-win-amount amp-gradient">${currentPrize}%</div><p class="amp-win-caption">OFF YOUR FIRST MONTH WITH US</p><form class="amp-form"><h2>Now go enjoy it.</h2><p>Add your details to claim your reward pass.</p><label>First name<input name="firstName" type="text" autocomplete="given-name" placeholder="Your first name" required maxlength="60"></label><label>Phone number<input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="(203) 555-0123" required maxlength="22"></label><div class="amp-honeypot"><label>Company<input name="company" type="text" tabindex="-1" autocomplete="off"></label></div><label class="amp-consent"><input name="smsConsent" type="checkbox"><span>I’d like offers and reminders by text from Amplyfy.<br>Optional. Msg & data rates may apply. Reply STOP to opt out. View <a href="/terms" target="_blank">Terms</a> & <a href="/privacy" target="_blank">Privacy</a>.</span></label><button class="amp-primary" type="button" data-action="reward">Continue to My Reward</button><p class="amp-error" role="alert" hidden></p></form><p class="amp-fine">YOUR DETAILS SYNC TO YOUR AMPLYFY REWARDS ACCOUNT</p>${legalFooter()}`);nav(lobby);const form=root.querySelector<HTMLFormElement>('form')!;const btn=form.querySelector<HTMLButtonElement>('[data-action=reward]')!;const submit=async()=>{if(!form.reportValidity())return;const name=(form.elements.namedItem('firstName') as HTMLInputElement).value.trim();const phone=(form.elements.namedItem('phone') as HTMLInputElement).value;const smsConsent=(form.elements.namedItem('smsConsent') as HTMLInputElement).checked;const company=(form.elements.namedItem('company') as HTMLInputElement)?.value||'';const digits=phone.replace(/\D/g,'');if(digits.length<10||digits.length>15){const error=form.querySelector<HTMLElement>('.amp-error')!;error.hidden=false;error.textContent='Enter a valid phone number with 10–15 digits.';return}btn.disabled=true;btn.textContent='Saving your reward…';try{await fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,phone,smsConsent,prize:currentPrize,company})})}catch(e){console.warn('GHL sync notice:',e)}wallet(name)};form.onsubmit=e=>{e.preventDefault();void submit()};btn.onclick=()=>void submit()}
 const wallet=(name:string)=>{clear();const guestName=name.trim()||'Guest';const passUrl=`/api/demo-pass?prize=${currentPrize}&name=${encodeURIComponent(guestName)}`;screen('amp-claim-screen',navHtml()+brand()+`<h1>Welcome<br><span class="amp-gradient">to Amplyfy.</span></h1><p class="amp-copy">Your first month with us just got even sweeter.</p><div class="amp-pass"><div class="amp-pass-top">AMPLYFY<span>EXCLUSIVE REWARD</span></div><div class="amp-pass-main"><strong>${currentPrize}% OFF</strong><p>Your first month with us</p><div class="amp-pass-meta"><div><small>GUEST</small><span data-guest-name></span></div><div><small>OFFER</small>First month</div></div></div></div><div class="amp-wallet-badge-wrap"><a href="${passUrl}" class="amp-apple-wallet-link" aria-label="Add to Apple Wallet"><img src="/add-to-apple-wallet.svg" alt="Add to Apple Wallet" class="amp-apple-wallet-badge" width="190" height="58"></a></div><p class="amp-fine">Saves directly to your Apple Wallet app.<br>Tap to add your reward pass.</p><button class="amp-primary" data-action="again" style="margin-top:24px;font-size:17px">Try Another Game</button>${legalFooter()}`);root.querySelector('[data-guest-name]')!.textContent=guestName;nav(claim);root.querySelector<HTMLButtonElement>('[data-action=again]')!.onclick=lobby;const wl=root.querySelector<HTMLAnchorElement>('.amp-apple-wallet-link');if(wl)wl.onclick=()=>{root.querySelector('.amp-pass')?.classList.add('amp-change');tick()}}
 home()
 return()=>{destroyed=true;clear();void audio?.close();root.innerHTML=''}
}
