import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { simulateRoll } from './dice-physics'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export type Game = 'wheel' | 'cards' | 'dice' | 'scratch'
export type SceneMode = Exclude<Game, 'scratch'> | 'home'
export type SceneController = {
  play: (prize: number, choice?: number, strength?: number) => Promise<number | void>
  shuffle: () => Promise<void>
  dispose: () => void
}
const TAU = Math.PI * 2
const offers = [5, 10, 15, 5, 10, 15, 5, 10, 15, 5, 10, 15]
const ease = (t: number) => 1 - Math.pow(1 - t, 4)

function material(color: number, metalness = 0, roughness = .4) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness })
}
function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x=0, y=0, z=0) {
  const m = new THREE.Mesh(geometry, mat)
  m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true
  parent.add(m); return m
}
function canvasTexture(draw: (ctx: CanvasRenderingContext2D) => void, w=512, h=512) {
  const c = document.createElement('canvas'); c.width=w; c.height=h
  const ctx = c.getContext('2d')!; draw(ctx)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
function label(text: string, size: number, color='#fff0cb', w=512,h=256) {
  return canvasTexture(ctx => {
    ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.font=`800 ${size}px Arial`; ctx.fillText(text,w/2,h/2)
  },w,h)
}
function decal(texture: THREE.Texture, w: number,h: number,parent: THREE.Object3D,x=0,y=0,z=0) {
  return mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),parent,x,y,z)
}
// Batch decorative geometry by material while leaving interactive parts separate.
function batch(group:THREE.Group,recursive=true){
  group.updateMatrixWorld(true)
  const inverse=group.matrixWorld.clone().invert(),buckets=new Map<THREE.Material,{geometries:THREE.BufferGeometry[];meshes:THREE.Mesh[]}>()
  const collect=(obj:THREE.Object3D)=>{
    if(!(obj instanceof THREE.Mesh)||obj.userData.keepSeparate||Array.isArray(obj.material))return
    const geo=obj.geometry.index?obj.geometry.toNonIndexed():obj.geometry.clone()
    geo.applyMatrix4(inverse.clone().multiply(obj.matrixWorld))
    if(!geo.getAttribute('uv'))geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geo.getAttribute('position').count*2),2))
    for(const name of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(name))geo.deleteAttribute(name)
    const bucket=buckets.get(obj.material)??{geometries:[],meshes:[]};bucket.geometries.push(geo);bucket.meshes.push(obj);buckets.set(obj.material,bucket)
  }
  if(recursive)group.traverse(collect);else group.children.forEach(collect)
  buckets.forEach(({geometries,meshes},mat)=>{
    const merged=mergeGeometries(geometries);if(!merged){geometries.forEach(g=>g.dispose());return}
    meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose()});geometries.forEach(g=>g.dispose());mesh(merged,mat,group)
  })
}
function brushedMetal() {
  const texture=canvasTexture(ctx=>{
    ctx.fillStyle='#d0ac70';ctx.fillRect(0,0,512,512)
    for(let i=0;i<400;i++){ctx.strokeStyle=i%2?'rgba(255,255,255,.09)':'rgba(44,25,7,.09)';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(256,256,i*.8,0,TAU);ctx.stroke()}
  })
  return new THREE.MeshPhysicalMaterial({map:texture,color:0xffe7b8,metalness:.88,roughness:.28,clearcoat:.25})
}
function ring(radius:number,tube:number,mat:THREE.Material,parent:THREE.Object3D,z:number) {
  return mesh(new THREE.TorusGeometry(radius,tube,12,100),mat,parent,0,0,z)
}
function wheel(blank=false) {
  const group=new THREE.Group(),rotor=new THREE.Group();group.add(rotor)
  const metal=brushedMetal(),dark=material(0x432214,.65,.3)
  const cylinder=(r:number,h:number,mat:THREE.Material,parent:THREE.Object3D,z:number)=>{const m=mesh(new THREE.CylinderGeometry(r,r,h,100),mat,parent,0,0,z);m.rotation.x=Math.PI/2;return m}
  cylinder(2.02,.45,dark,group,-.22)
  cylinder(2.06,.2,metal,group,-.13)
  ring(2.03,.055,metal,group,-.26)
  ring(1.96,.095,metal,group,.04)
  ring(1.81,.027,material(0x6a421f,.85,.2),rotor,.26)
  const segmentMats=[0xf07632,0x683223,0xffe4ac].map((color,i)=>new THREE.MeshPhysicalMaterial({color,metalness:i===2?.35:.15,roughness:.3,clearcoat:.6,clearcoatRoughness:.25}))
  offers.forEach((offer,i)=>{
    const a=i*TAU/12,b=(i+1)*TAU/12,gap=.014
    const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(1.77*Math.cos(a+gap),1.77*Math.sin(a+gap));shape.absarc(0,0,1.77,a+gap,b-gap,false);shape.lineTo(0,0)
    mesh(new THREE.ExtrudeGeometry(shape,{depth:.19,bevelEnabled:true,bevelSegments:3,bevelSize:.018,bevelThickness:.018}),segmentMats[i%3],rotor,0,0,.025)
    const mid=(a+b)/2
    if(!blank){const l=decal(label(`${offer}%`,150,i%3===2?'#7b441d':'#fff2d4'),.7,.35,rotor,1.23*Math.cos(mid),1.23*Math.sin(mid),.245);l.rotation.z=mid-Math.PI/2}
    const spoke=mesh(new THREE.BoxGeometry(.021,1.29,.03),metal,rotor,.95*Math.cos(a),.95*Math.sin(a),.246);spoke.rotation.z=a-Math.PI/2
  })
  const bulbMat=new THREE.MeshStandardMaterial({color:0xffefd0,emissive:0xffb345,emissiveIntensity:1.3,roughness:.15})
  for(let i=0;i<36;i++) {
    const a=i*TAU/36
    const socket=mesh(new THREE.CylinderGeometry(.049,.049,.02,12),dark,group,1.965*Math.cos(a),1.965*Math.sin(a),.12);socket.rotation.x=Math.PI/2
    const bulb=mesh(new THREE.SphereGeometry(.031,12,8),bulbMat,group,1.965*Math.cos(a),1.965*Math.sin(a),.15);bulb.castShadow=false
  }
  cylinder(.47,.19,dark,group,.3);cylinder(.42,.16,metal,group,.4);ring(.36,.012,dark,group,.486)
  if(!blank)decal(label('a.',110,'#8c5529',256,256),.42,.42,group,0,0,.486)
  const pointer=new THREE.Group();group.add(pointer);pointer.position.set(0,2.04,.47)
  const ps=new THREE.Shape();ps.moveTo(-.13,.16);ps.lineTo(.13,.16);ps.lineTo(.07,-.18);ps.lineTo(0,-.31);ps.lineTo(-.07,-.18);ps.closePath()
  mesh(new THREE.ExtrudeGeometry(ps,{depth:.08,bevelSize:.015,bevelThickness:.015,bevelSegments:3}),metal,pointer)
  const pin=mesh(new THREE.CylinderGeometry(.07,.07,.04,20),dark,pointer,0,.09,.12);pin.rotation.x=Math.PI/2
  if(!blank){mesh(new RoundedBoxGeometry(1.65,.16,.85,3,.07),dark,group,0,-2.28,-.3);mesh(new RoundedBoxGeometry(.22,1,.2,3,.04),metal,group,0,-1.9,-.31)}
  group.rotation.y=-.18
  batch(rotor);batch(pointer);batch(group,false)
  return {group,rotor,pointer}
}
function roundedShape(w:number,h:number,r:number){
  const s=new THREE.Shape(),x=-w/2,y=-h/2
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s
}
function cardFace(mat:THREE.Material,parent:THREE.Group,z:number,reverse=false){
  const geo=new THREE.ShapeGeometry(roundedShape(1.25,1.91,.07))
  const uv=geo.getAttribute('uv'),pos=geo.getAttribute('position');for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/1.25+.5,pos.getY(i)/1.91+.5)
  const m=mesh(geo,mat,parent,0,0,z);if(reverse)m.rotation.y=Math.PI;return m
}
function rewardFace(prize:number|null){
  return canvasTexture(ctx=>{
    ctx.fillStyle='#fff0cf';ctx.fillRect(0,0,512,768)
    ctx.strokeStyle='#bc883e';ctx.lineWidth=3;ctx.strokeRect(20,20,472,728);ctx.lineWidth=1;ctx.strokeRect(31,31,450,706)
    for(const [x,y] of [[60,70],[452,70],[60,698],[452,698]]){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle='#bf873c';ctx.fillRect(-9,-9,18,18);ctx.restore()}
    ctx.strokeStyle='#dbad62';ctx.lineWidth=2;ctx.beginPath();ctx.arc(256,357,160,0,TAU);ctx.stroke()
    for(let i=0;i<32;i++){const a=i*TAU/32;ctx.beginPath();ctx.moveTo(256+171*Math.cos(a),357+171*Math.sin(a));ctx.lineTo(256+184*Math.cos(a),357+184*Math.sin(a));ctx.stroke()}
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#b65725';ctx.font='900 154px Arial';ctx.fillText(prize===null?'?':`${prize}%`,256,351);ctx.font='700 38px Arial';ctx.fillText('OFF',256,452)
    ctx.beginPath();ctx.moveTo(150,562);ctx.lineTo(362,562);ctx.stroke();ctx.fillStyle='#af7935';ctx.font='700 31px Arial';ctx.fillText('amplyfy.',256,621)
  },512,768)
}
function makeCard(texture:THREE.Texture,blank=false){
  const group=new THREE.Group(),paper=material(0xffe9c5,0,.68),foil=brushedMetal()
  mesh(new RoundedBoxGeometry(1.29,1.95,.115,4,.044),paper,group)
  const edges=[material(0xfff3d6,0,.8),material(0xdab987,0,.8)]
  for(let i=0;i<4;i++)mesh(new RoundedBoxGeometry(1.287,1.947,.003,2,.025),edges[i%2],group,0,0,-.036+i*.024)
  cardFace(new THREE.MeshPhysicalMaterial({map:texture,roughness:.43,clearcoat:.45,clearcoatRoughness:.3}),group,.059)
  const frame=roundedShape(1.22,1.88,.055);frame.holes.push(new THREE.Path(roundedShape(1.185,1.845,.05).getPoints(20)))
  mesh(new THREE.ShapeGeometry(frame),foil,group,0,0,.062)
  ring(.24,.006,foil,group,.065)
  if(!blank)decal(label('amplyfy.',44,'#d77532',512,256),.77,.38,group,0,-.02,.066)
  cardFace(new THREE.MeshPhysicalMaterial({color:0xffedca,roughness:.48,clearcoat:.35}),group,-.059,true)
  const frontFrame=mesh(new THREE.ShapeGeometry(frame),foil,group,0,0,-.062);frontFrame.rotation.y=Math.PI
  const front=cardFace(new THREE.MeshBasicMaterial({map:rewardFace(null),toneMapped:false}),group,-.065,true);front.userData.keepSeparate=true
  batch(group)
  return {group,front}
}
function die(orange=false){
  const group=new THREE.Group(),bodyMat=new THREE.MeshPhysicalMaterial({color:orange?0xe26a29:0xffedd0,roughness:.2,metalness:0,clearcoat:1,clearcoatRoughness:.19})
  // Remove flat face triangles, then replace them with faces containing real pip holes.
  const rounded=new RoundedBoxGeometry(.95,.95,.95,6,.095),geo=rounded.index?rounded.toNonIndexed():rounded
  const positions=geo.getAttribute('position'),normals=geo.getAttribute('normal'),p:number[]=[],n:number[]=[]
  for(let i=0;i<positions.count;i+=3){
    const flat=[0,1,2].some(axis=>[0,1,2].every(k=>Math.abs(normals.getComponent(i+k,axis))>.9999))
    if(!flat)for(let k=0;k<3;k++){p.push(positions.getX(i+k),positions.getY(i+k),positions.getZ(i+k));n.push(normals.getX(i+k),normals.getY(i+k),normals.getZ(i+k))}
  }
  const shell=new THREE.BufferGeometry();shell.setAttribute('position',new THREE.Float32BufferAttribute(p,3));shell.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));mesh(shell,bodyMat,group);if(geo!==rounded)geo.dispose();rounded.dispose()
  const faces=[{n:1,pos:[0,.475,0],rot:[-Math.PI/2,0,0]},{n:6,pos:[0,-.475,0],rot:[Math.PI/2,0,0]},{n:2,pos:[0,0,.475],rot:[0,0,0]},{n:5,pos:[0,0,-.475],rot:[0,Math.PI,0]},{n:3,pos:[.475,0,0],rot:[0,Math.PI/2,0]},{n:4,pos:[-.475,0,0],rot:[0,-Math.PI/2,0]}]
  const pipMat=new THREE.MeshPhysicalMaterial({color:orange?0xffefd1:0x65321c,roughness:.32,clearcoat:.7})
  faces.forEach(face=>{
    const f=new THREE.Group();f.position.set(...face.pos as [number,number,number]);f.rotation.set(...face.rot as [number,number,number]);group.add(f)
    const dots:number[][]=[];if(face.n%2)dots.push([0,0]);if(face.n>1)dots.push([-.22,.22],[.22,-.22]);if(face.n>3)dots.push([.22,.22],[-.22,-.22]);if(face.n===6)dots.push([-.22,0],[.22,0])
    const shape=new THREE.Shape();shape.moveTo(-.38,-.38);shape.lineTo(.38,-.38);shape.lineTo(.38,.38);shape.lineTo(-.38,.38);shape.closePath()
    dots.forEach(([x,y])=>{
      const hole=new THREE.Path();hole.absarc(x,y,.076,0,TAU,true);shape.holes.push(hole)
      const bowl=new THREE.LatheGeometry([new THREE.Vector2(0,-.038),new THREE.Vector2(.027,-.035),new THREE.Vector2(.055,-.021),new THREE.Vector2(.072,-.007),new THREE.Vector2(.076,0)],24)
      bowl.rotateX(Math.PI/2);mesh(bowl,pipMat,f,x,y,0)
      const lip=mesh(new THREE.TorusGeometry(.076,.0035,6,24),bodyMat,f,x,y,0);lip.castShadow=false
    })
    mesh(new THREE.ShapeGeometry(shape,24),bodyMat,f)
  });batch(group);return group
}
function tabletop(){
  const group=new THREE.Group(),wood=canvasTexture(ctx=>{
    ctx.fillStyle='#643723';ctx.fillRect(0,0,512,512)
    for(let y=0;y<512;y+=2){ctx.strokeStyle=`rgba(24,8,3,${.06+(y%9)*.014})`;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(170,y+Math.sin(y)*9,340,y-5,512,y+2);ctx.stroke()}
  }),felt=canvasTexture(ctx=>{
    ctx.fillStyle='#7a4230';ctx.fillRect(0,0,512,512)
    let seed=19;for(let i=0;i<60000;i++){seed=seed*16807%2147483647;const x=seed%512;seed=seed*16807%2147483647;const y=seed%512;ctx.fillStyle=i%2?'rgba(255,222,164,.08)':'rgba(0,0,0,.12)';ctx.fillRect(x,y,1,2)}
  })
  felt.wrapS=felt.wrapT=THREE.RepeatWrapping;felt.repeat.set(3,2)
  const woodMat=new THREE.MeshPhysicalMaterial({map:wood,roughness:.42,clearcoat:.5}),metal=brushedMetal(),pad=material(0x3b2015,.03,.8)
  mesh(new RoundedBoxGeometry(5.15,.24,3.5,4,.12),woodMat,group,0,-.15,0)
  mesh(new RoundedBoxGeometry(4.7,.1,3.05,3,.07),new THREE.MeshStandardMaterial({map:felt,bumpMap:felt,bumpScale:.035,roughness:1}),group,0,.015,0)
  for(const [x,z,w,d] of [[2.35,0,.3,3.4],[-2.35,0,.3,3.4],[0,1.55,4.75,.3],[0,-1.55,4.75,.3]]){
    mesh(new RoundedBoxGeometry(w,.55,d,4,.11),pad,group,x,.29,z)
    mesh(new RoundedBoxGeometry(w+.025,.026,d+.025,2,.012),metal,group,x,.18,z)
  }
  const stitchMat=material(0xc28d5c,0,.75)
  for(let x=-2.03;x<2.05;x+=.12)for(const z of [-1.39,1.39])mesh(new THREE.BoxGeometry(.045,.006,.013),stitchMat,group,x,.071,z)
  for(let z=-1.3;z<1.35;z+=.12)for(const x of [-2.16,2.16])mesh(new THREE.BoxGeometry(.013,.006,.045),stitchMat,group,x,.071,z)
  const brand=decal(label('amplyfy.',64,'#c39267'),1.7,.8,group,0,.072,0);brand.rotation.x=-Math.PI/2
  batch(group);return group
}

export function createScene(host: HTMLElement, mode: SceneMode, textureUrl: string, onTap: (index: number) => void, onTick: () => void, reducedMotion=false): SceneController {
  const scene=new THREE.Scene()
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75)); renderer.shadowMap.enabled=true
  renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9
  renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement)
  const camera=new THREE.PerspectiveCamera(35,1,.1,60)
  if(mode==='dice') {camera.position.set(3.2,6.8,7.1);camera.lookAt(0,.15,0)}
  else if(mode==='cards'){camera.position.set(.8,5.1,7.1);camera.lookAt(0,.25,0)}
  else if(mode==='wheel'){camera.position.set(2.6,1.9,8.6);camera.lookAt(0,-.05,0)}
  else {camera.position.set(1.6,2.8,8.2);camera.lookAt(0,0,0)}
  const pmrem=new THREE.PMREMGenerator(renderer), room=new RoomEnvironment()
  const env=pmrem.fromScene(room,.035);scene.environment=env.texture;scene.environmentIntensity=.6;room.dispose();pmrem.dispose()
  scene.add(new THREE.HemisphereLight(0xfff1dc,0x3a1d15,.9))
  const key=new THREE.SpotLight(0xffefda,40,30,Math.PI/4,.75,1.6);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0004;key.shadow.radius=5;scene.add(key)
  const fill=new THREE.PointLight(0xffb475,8,15);fill.position.set(4,1,2);scene.add(fill)
  const floor=mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.12}),scene,0,-2.03,0);floor.rotation.x=-Math.PI/2;floor.visible=mode==='dice'||mode==='cards'
  const shadowTexture=canvasTexture(ctx=>{const g=ctx.createRadialGradient(256,256,10,256,256,255);g.addColorStop(0,'rgba(0,0,0,.45)');g.addColorStop(.5,'rgba(0,0,0,.17)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,512,512)})
  const contact=mesh(new THREE.PlaneGeometry(6,4),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}),scene,0,mode==='wheel'?-2.4:-2.02,0);contact.rotation.x=-Math.PI/2;contact.castShadow=false;contact.receiveShadow=false
  if(mode==='cards'||mode==='dice')contact.visible=false
  const objects=new THREE.Group();scene.add(objects)
  let needsRender=true,lastDraw=0
  const hasCards=mode==='cards'||mode==='home'
  const texture=hasCards?new THREE.TextureLoader().load(textureUrl,()=>{needsRender=true}):new THREE.Texture();texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4
  // Allocate only the active game's meshes. Switching games releases all resources.
  const w=mode==='wheel'||mode==='home'?wheel(mode==='home'):{group:new THREE.Group(),rotor:new THREE.Group(),pointer:new THREE.Group()}
  const cardSet=hasCards?Array.from({length:mode==='home'?2:3},()=>makeCard(texture,mode==='home')):[]
  const dice=mode==='dice'||mode==='home'?[die(),die(true)]:[]
  const idleCards=()=>cardSet.forEach((c,i)=>{c.group.position.set((i-1)*1.29,.15,i===1?.25:0);c.group.rotation.set(-Math.PI/2,0,(i-1)*-.14)})
  if(mode==='wheel') {objects.add(w.group);w.group.position.y=.04;floor.position.y=-2.42}
  if(mode==='cards') {objects.add(tabletop());floor.position.y=-.3;cardSet.forEach((c,i)=>{objects.add(c.group);c.group.userData.cardIndex=i});idleCards()}
  if(mode==='dice') {
    objects.add(tabletop());floor.position.y=-.3
    dice.forEach((d,i)=>{objects.add(d);d.position.set(i===0?-.68:.68,.56,i===0?.1:-.1);d.rotation.set(0,i===0?.35:-.25,0)})
  }
  if(mode==='home') {
    objects.add(w.group);w.group.scale.setScalar(.86);w.group.position.set(-.34,.21,-.48);w.group.rotation.y=-.25
    cardSet.slice(0,2).forEach((c,i)=>{objects.add(c.group);c.group.position.set(1.02+i*.38,-.1,.66+i*.1);c.group.rotation.set(.05,-.26,-.23+i*.3);c.group.scale.setScalar(.82)})
    dice.forEach((d,i)=>{objects.add(d);d.position.set(-1.45+i*.83,-1.34,1.0+i*.18);d.rotation.set(.35+i*.4,.3+i*.5,.2);d.scale.setScalar(.75)})
  }
  const sparkleMap=canvasTexture(ctx=>{const g=ctx.createRadialGradient(32,32,0,32,32,30);g.addColorStop(0,'#fff9db');g.addColorStop(.3,'#ffcd7b');g.addColorStop(1,'rgba(255,180,90,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64)},64,64)
  const sparkleGeo=new THREE.BufferGeometry(),sparklePositions=new Float32Array(36*3),sparkleVelocity=Array.from({length:36},()=>new THREE.Vector3((Math.random()-.5)*3,1+Math.random()*2,(Math.random()-.5)*2))
  sparkleGeo.setAttribute('position',new THREE.BufferAttribute(sparklePositions,3))
  const sparkles=new THREE.Points(sparkleGeo,new THREE.PointsMaterial({map:sparkleMap,color:0xffcd88,size:.07,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sparkles.visible=false;scene.add(sparkles)
  let burstAt=0
  const celebrate=()=>{burstAt=performance.now();sparkles.visible=true;for(let i=0;i<36;i++){sparklePositions[i*3]=(Math.random()-.5)*3;sparklePositions[i*3+1]=mode==='dice'?.5:-.4;sparklePositions[i*3+2]=.5}sparkleGeo.attributes.position.needsUpdate=true}
  let disposed=false,frame=0,lastTime=0,visible=true,animation:((time:number,dt:number)=>void)|null=null
  const pending=new Set<()=>void>()
  let busy=false,mouseX=0,mouseY=0
  const resize=()=>{const width=host.clientWidth,height=host.clientHeight; if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();needsRender=true}
  const observer=new ResizeObserver(resize);observer.observe(host);resize()
  const intersection=new IntersectionObserver(e=>{visible=e[0].isIntersecting});intersection.observe(host)
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2()
  const move=(e:PointerEvent)=>{const rect=host.getBoundingClientRect();mouseX=(e.clientX-rect.left)/rect.width-.5;mouseY=(e.clientY-rect.top)/rect.height-.5}
  const tap=(e:PointerEvent)=>{
    if(mode!=='cards'||busy)return
    const rect=host.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1)
    raycaster.setFromCamera(pointer,camera)
    const hit=raycaster.intersectObjects(cardSet.map(c=>c.group),true)[0]
    if(hit){let obj:THREE.Object3D|null=hit.object;while(obj&&obj.userData.cardIndex===undefined)obj=obj.parent;if(obj)onTap(obj.userData.cardIndex)}
  }
  host.addEventListener('pointermove',move);host.addEventListener('pointerup',tap)
  const tick=(time:number)=>{
    if(disposed)return
    frame=requestAnimationFrame(tick)
    const dt=Math.min((time-lastTime)/1000,.035)||.016;lastTime=time
    if(!visible||document.hidden)return
    if(animation){animation(time,dt);needsRender=true}
    else if(!reducedMotion){const dy=mouseX*.065-objects.rotation.y,dx=-mouseY*.025-objects.rotation.x;if(Math.abs(dy)+Math.abs(dx)>.0001){objects.rotation.y+=dy*.06;objects.rotation.x+=dx*.06;needsRender=true}if(mode==='home'&&time-lastDraw>=33){objects.position.y=Math.sin(time*.00065)*.055;needsRender=true}}
    if(sparkles.visible){needsRender=true;const age=(time-burstAt)/1000;if(age>1.7)sparkles.visible=false;else{sparkleVelocity.forEach((v,i)=>{sparklePositions[i*3]+=v.x*dt;sparklePositions[i*3+1]+=(v.y-age*2)*dt;sparklePositions[i*3+2]+=v.z*dt});sparkleGeo.attributes.position.needsUpdate=true;(sparkles.material as THREE.PointsMaterial).opacity=1-age/1.7}}
    if(needsRender){renderer.render(scene,camera);needsRender=false;lastDraw=time}
  };frame=requestAnimationFrame(tick)
  const animate=(duration:number,update:(t:number,dt:number)=>void)=>new Promise<void>(resolve=>{
    if(disposed){resolve();return}
    const finish=()=>{pending.delete(finish);resolve()};pending.add(finish)
    const start=performance.now();animation=(time,dt)=>{const t=Math.max(0,Math.min((time-start)/duration,1));update(t,dt);if(t===1){animation=null;finish()}}
  })
  return {
    async shuffle(){
      if(mode!=='cards')return;busy=true
      await animate(reducedMotion?100:1450,t=>{
        cardSet.forEach((c,i)=>{const blend=Math.sin(t*Math.PI),a=t*TAU*1.9+i*TAU/3;c.group.position.set((i-1)*1.29*(1-blend)+Math.cos(a)*.8*blend,.15+blend*.14+i*.035*blend,Math.sin(a)*.55*blend+(i===1?.25:0)*(1-blend));c.group.rotation.z=(i-1)*-.12*(1-blend);c.group.rotation.y=0})
      });idleCards();busy=false
    },
    async play(prize,choice=1,strength=1){
      busy=true
      if(mode==='wheel'){
        const matches=offers.map((p,i)=>p===prize?i:-1).filter(i=>i>=0)
        const index=matches[Math.floor(Math.random()*matches.length)]
        const target=TAU*5+((Math.PI/2-(index+.5)*TAU/12+TAU)%TAU)
        let lastSector=-1
        await animate(reducedMotion?250:3400,t=>{
          w.rotor.rotation.z=target*ease(t)
          const sector=Math.floor(w.rotor.rotation.z/(TAU/12))
          if(sector!==lastSector){lastSector=sector;onTick()}
          w.pointer.rotation.z=t<.99?Math.sin(w.rotor.rotation.z*12)*.13*(1-t):0
        })
      }
      if(mode==='cards'){
        const oldMaterial=cardSet[choice].front.material as THREE.MeshStandardMaterial
        oldMaterial.map?.dispose();oldMaterial.dispose()
        cardSet[choice].front.material=new THREE.MeshBasicMaterial({map:rewardFace(prize),toneMapped:false})
        const selected=cardSet[choice].group,start=selected.position.clone(),startRot=selected.rotation.clone(),otherStarts=cardSet.map(c=>c.group.position.clone())
        await animate(reducedMotion?150:950,t=>{
          const e=ease(t);selected.position.set(THREE.MathUtils.lerp(start.x,0,e),THREE.MathUtils.lerp(start.y,1.7,e)+Math.sin(t*Math.PI)*.22,THREE.MathUtils.lerp(start.z,.9,e));selected.rotation.set(THREE.MathUtils.lerp(startRot.x,-.65,e),startRot.y+(Math.PI-startRot.y)*e,startRot.z*(1-e));selected.scale.setScalar(1+e*.4)
          cardSet.forEach((c,i)=>{if(i!==choice){const slot=i<choice?i:i-1,side=slot===0?-1:1;c.group.position.x=THREE.MathUtils.lerp(otherStarts[i].x,side*1.25,e);c.group.position.z=THREE.MathUtils.lerp(otherStarts[i].z,-.32,e);c.group.rotation.z=THREE.MathUtils.lerp((i-1)*-.14,side*-.17,e)}})
        });onTick()
      }
      if(mode==='dice'){
        // Cannon computes collisions, tumbling, friction and the final resting faces.
        // The chosen trajectory matches the existing server reward without altering it.
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))
        const {frames,total}=simulateRoll(prize,strength)
        let lastFrame=-1
        const position=new THREE.Vector3(),quaternion=new THREE.Quaternion()
        await animate(reducedMotion?300:4000,t=>{
          const index=reducedMotion?frames.length-1:Math.min(frames.length-1,Math.floor(t*(frames.length-1)))
          const next=Math.min(index+1,frames.length-1),fraction=reducedMotion?0:t*(frames.length-1)-index
          dice.forEach((d,i)=>{
            const a=frames[index].dice[i],b=frames[next].dice[i]
            d.position.fromArray(a.position).lerp(position.fromArray(b.position),fraction)
            d.quaternion.fromArray(a.quaternion).slerp(quaternion.fromArray(b.quaternion),fraction)
          })
          if(index!==lastFrame){if(frames.slice(lastFrame+1,index+1).some(f=>f.impact))onTick();lastFrame=index}
        });busy=false;celebrate();return total
      }
      celebrate()
      busy=false
    },
    dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',tap);pending.forEach(f=>f());pending.clear();scene.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>{const map=(m as THREE.MeshStandardMaterial).map;if(map&&map!==texture)map.dispose();m.dispose()})}});sparkleGeo.dispose();sparkleMap.dispose();(sparkles.material as THREE.Material).dispose();texture.dispose();env.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()}
  }
}
