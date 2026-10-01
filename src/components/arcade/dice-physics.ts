import { Body, Box, ContactMaterial, Material, Plane, Quaternion, Vec3, World } from 'cannon-es'

export type DicePose = { position:[number,number,number]; quaternion:[number,number,number,number] }
export type RollFrame = { dice:DicePose[]; impact:boolean }
const faces:[number,Vec3][]=[[1,new Vec3(0,1,0)],[6,new Vec3(0,-1,0)],[2,new Vec3(0,0,1)],[5,new Vec3(0,0,-1)],[3,new Vec3(1,0,0)],[4,new Vec3(-1,0,0)]]
function top(q:Quaternion){return faces.map(([value,normal])=>({value,y:q.vmult(normal).y})).sort((a,b)=>b.y-a.y)[0]}

// Record a real rigid-body trajectory whose top faces match the server's reward.
// Replaying fixed steps makes the same throw smooth on devices with different frame rates.
export function simulateRoll(prize:number,strength=1):{frames:RollFrame[];total:number} {
  let seed=Math.floor(Math.random()*2147483646)+1
  const random=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646}
  for(let attempt=0;attempt<60;attempt++) {
    const world=new World({gravity:new Vec3(0,-18,0),allowSleep:true})
    const dieMaterial=new Material('resin'),surfaceMaterial=new Material('felt')
    world.addContactMaterial(new ContactMaterial(dieMaterial,surfaceMaterial,{friction:.46,restitution:.37}))
    world.addContactMaterial(new ContactMaterial(dieMaterial,dieMaterial,{friction:.25,restitution:.35}))
    const table=new Body({mass:0,material:surfaceMaterial,shape:new Plane()});table.quaternion.setFromEuler(-Math.PI/2,0,0);table.position.y=.065;world.addBody(table)
    for(const [x,z,hx,hz] of [[2.35,0,.15,1.7],[-2.35,0,.15,1.7],[0,1.55,2.4,.15],[0,-1.55,2.4,.15]]){
      const rail=new Body({mass:0,material:surfaceMaterial,shape:new Box(new Vec3(hx,.3,hz))});rail.position.set(x,.29,z);world.addBody(rail)
    }
    let impact=false
    const dice=[0,1].map(i=>{
      const b=new Body({mass:1,material:dieMaterial,shape:new Box(new Vec3(.475,.475,.475)),linearDamping:.13,angularDamping:.22,sleepSpeedLimit:.12,sleepTimeLimit:.3})
      b.position.set(i===0?-.85:.85,2.4+i*.35,-.65+i*.25);b.quaternion.setFromEuler(random()*6,random()*6,random()*6)
      b.velocity.set((random()-.5)*3.5,1.5+strength*.6,2.4+random()*strength)
      b.angularVelocity.set((random()-.5)*19,(random()-.5)*19,(random()-.5)*19)
      b.addEventListener('collide',()=>{impact=true});world.addBody(b);return b
    })
    const frames:RollFrame[]=[]
    for(let step=0;step<240;step++){
      impact=false;world.step(1/60)
      frames.push({impact,dice:dice.map(b=>({position:[b.position.x,b.position.y,b.position.z],quaternion:[b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w]}))})
    }
    const result=dice.map(b=>top(b.quaternion)),total=result[0].value+result[1].value
    const tier=total<=5?5:total<=9?10:15
    if(tier===prize&&result.every(r=>r.y>.98)&&dice.every(b=>Math.abs(b.position.x)<1.74&&Math.abs(b.position.z)<.94&&b.position.y<.56))return {frames,total}
  }
  // A rare failed search retries rather than revealing a result that contradicts the reward.
  throw new Error('The dice are taking a moment. Please roll again.')
}
