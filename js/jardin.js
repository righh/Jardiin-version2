const {Color,Vector3,Mesh,Group}=THREE;
const TAU=Math.PI*2,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const col=h=>new Color(h).convertSRGBToLinear();
let seed=(Math.random()*1e6|0)+1;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
const R=(a,b)=>a+(b-a)*rnd(),GS=1.4;
const DEF='Arrastra para mirar en 360° · W A S D o rueda para caminar · clic en una flor la abre · clic en la tierra siembra · ☀ cambia entre día y noche · busca la puerta negra';
const MOB=matchMedia('(pointer:coarse)').matches||innerWidth<700;
const hud=document.getElementById('hud');hud.textContent='';

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,MOB?1.25:1.75));
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const cv=renderer.domElement;document.body.prepend(cv);
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xcfe3e8,30,130);
const cam=new THREE.PerspectiveCamera(62,1,.05,300);

// cielo
{const c=document.createElement('canvas');c.width=4;c.height=256;const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);
 gr.addColorStop(0,'#4a8fd0');gr.addColorStop(.35,'#9ccbea');gr.addColorStop(.5,'#d4e6ea');gr.addColorStop(1,'#bcd5b0');g.fillStyle=gr;g.fillRect(0,0,4,256);
 const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;
 var skyDome=new Mesh(new THREE.SphereGeometry(100,32,16),new THREE.ShaderMaterial({uniforms:{uK:{value:1}},side:THREE.BackSide,depthTest:false,depthWrite:false,fog:false,vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float uK;varying vec3 vD;void main(){float h=vD.y;vec3 dayC=mix(vec3(.82,.9,.92),vec3(.25,.5,.82),clamp(h*1.6,0.,1.));vec3 ni=mix(vec3(.035,.06,.15),vec3(.004,.01,.04),clamp(h*1.4,0.,1.));if(h<0.){ni=vec3(.02,.035,.08);dayC=vec3(.6,.75,.6);}gl_FragColor=vec4(mix(dayC,ni,uK),1.);}'}));skyDome.renderOrder=-10;skyDome.frustumCulled=false;scene.add(skyDome);}
const hemi=new THREE.HemisphereLight(0xcfe8ff,0x55703a,.85);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d2,2.3);sun.position.set(9,15,7);sun.castShadow=true;sun.shadow.mapSize.set(MOB?1024:2048,MOB?1024:2048);
Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:70});sun.shadow.bias=-.0006;scene.add(sun);

// suelo
{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#3f6e2a';g.fillRect(0,0,256,256);
 for(let i=0;i<5000;i++){g.fillStyle='hsla('+(80+Math.random()*30)+',45%,'+(22+Math.random()*22)+'%,.5)';g.fillRect(Math.random()*256,Math.random()*256,2,3)}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(70,70);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;
 const gr=new Mesh(new THREE.CircleGeometry(120,64),new THREE.MeshStandardMaterial({map:t,roughness:1}));gr.rotation.x=-Math.PI/2;gr.receiveShadow=true;scene.add(gr);}

// ---------- geometría de pétalos ----------
const geoCache={},texCache={};
const dotTex=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d'),r=g.createRadialGradient(16,16,0,16,16,16);r.addColorStop(0,'#ffffff');r.addColorStop(.3,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,32,32);return new THREE.CanvasTexture(c)})();
const petalMat=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.5,metalness:0});
const glowU={value:0};
petalMat.onBeforeCompile=sh=>{sh.uniforms.uGlow=glowU;sh.fragmentShader='uniform float uGlow;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance+=vColor*uGlow;\n#endif')};
const stemMat=new THREE.MeshStandardMaterial({color:col('#3d6e2b'),roughness:.8});
function petalGeo(o){
 const key=JSON.stringify(o);if(geoCache[key])return geoCache[key];
 const US=6,VS=8,pos=[],cs=[],idx=[],c0=col(o.p[0]),c1=col(o.p[1]),c2=col(o.p[2]),tmp=new Color();
 for(let j=0;j<=VS;j++){const v=j/VS,w=o.W*Math.pow(Math.max(Math.sin(Math.PI*Math.pow(v,o.a)),0),o.b)*(1-o.pt*Math.pow(v,4));
  for(let i=0;i<=US;i++){const u=i/US*2-1;
   pos.push(u*w,o.L*v*(1-.12*o.curl*v),-o.cup*u*u*o.W*.55*(.4+v)+o.curl*o.L*v*v*.5+o.ruf*o.L*Math.sin(u*5+v*3)*v*v);
   if(v<.5)tmp.copy(c0).lerp(c1,v*2);else tmp.copy(c1).lerp(c2,(v-.5)*2);
   tmp.lerp(c2,Math.abs(u)*.18*v);tmp.multiplyScalar((1+.07*Math.sin(u*Math.PI*6)*(1-v*.4))*o.dk);cs.push(tmp.r,tmp.g,tmp.b)}}
 for(let j=0;j<VS;j++)for(let i=0;i<US;i++){const a=j*(US+1)+i,b=a+1,c=a+US+1,d=c+1;idx.push(a,c,b,b,c,d)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));g.setIndex(idx);g.computeVertexNormals();
 return geoCache[key]=g;
}
function domeTex(C){
 if(texCache[C.id])return texCache[C.id];
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle=C.bg;g.fillRect(0,0,256,256);
 for(let i=0;i<420;i++){const r=Math.sqrt(i/420)*120,a=i*2.39996;g.fillStyle=C.d[i%C.d.length];g.beginPath();g.arc(128+Math.cos(a)*r,128+Math.sin(a)*r,2+3*i/420,0,TAU);g.fill()}
 const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return texCache[C.id]=t;
}
function dome(r,h,tex){
 const g=new THREE.SphereGeometry(1,24,8,0,TAU,0,Math.PI/2),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)*.5+.5,p.getZ(i)*.5+.5);g.scale(r,h,r);
 return new Mesh(g,new THREE.MeshStandardMaterial({map:tex,roughness:.8}));
}
function stamens(S,c){
 const g=new Group(),am=new THREE.MeshStandardMaterial({color:col(c.anth||'#e8b020'),roughness:.6}),fm=new THREE.MeshStandardMaterial({color:col(c.col||'#e8d8a0'),roughness:.6});
 for(let i=0;i<c.n;i++){
  const len=c.len*S*(c.n>1?R(.45,1):1),piv=new Group();piv.rotation.order='YXZ';piv.rotation.y=R(0,TAU);piv.rotation.x=(c.sp||0)*R(.5,1.4);
  const f=new Mesh(new THREE.CylinderGeometry(.012*S,.016*S,len,5),fm);f.position.y=len/2;
  const a=new Mesh(new THREE.SphereGeometry(.05*S,6,5),am);a.scale.set(1,1.8,1);a.position.y=len;piv.add(f,a);g.add(piv);
 }
 return g;
}

// ---------- 11 variedades ----------
const LY=(n,L,W,t0,t1,o)=>Object.assign({n,L,W,t0,t1},o||{});
const A2=[0,Math.PI],A2b=[Math.PI/2,Math.PI*1.5];
const TYPES=[
{name:'Rosa',S:.1,h:[.7,.95],sr:.009,nl:4,ll:.14,tilt:.15,o0:.6,
 pal:[{c:['#4a0412','#b8112f','#e8465f']},{c:['#b5476f','#f0a2bd','#ffe0ea']},{c:['#b8a07c','#f3e8d2','#fffaf0']},{c:['#b88a0c','#f1c831','#fff0a0']},{c:['#9a2a10','#f0743c','#ffc190']}],
 layers:[0,1,2,3,4,5,6].map(i=>LY([5,5,5,4,4,3,3][i],1-i*.1,.62-i*.045,.05,1.3-i*.17,{cup:.55,curl:.5-i*.06,ruf:.03,r0:.02,y:i*.015,off:i*.9,dk:1-i*.05}))},
{name:'Tulipán',S:.06,h:[.4,.55],sr:.007,nl:3,ll:.35,tilt:0,o0:.5,n:10,
 pal:[{c:['#7a0a22','#e11d48','#ff6b87']},{c:['#b87000','#ffcf1f','#fff2a0']},{c:['#7a2a8a','#c05ad0','#f0c0f5']},{c:['#c4400c','#ff8a2a','#ffd8a0']},{c:['#c8c0a0','#fffbe8','#ffffff']},{c:['#c04a7a','#ff9cc0','#ffe6f0']},{c:['#1a0820','#3a1050','#7a4a9a']},{c:['#c01a10','#ff4a20','#ffd23a']}],
 layers:[LY(3,1.25,.5,.05,.55,{cup:.6,curl:.25,pt:.35,a:.7,b:.7,r0:.12}),LY(3,1.1,.46,.03,.45,{cup:.6,curl:.2,pt:.35,a:.7,b:.7,off:1.047,r0:.1})]},
{name:'Orquídea',S:.09,h:[.7,.9],sr:.006,nl:3,ll:.22,tilt:1.3,o0:.7,
 pal:[{c:['#8a0f55','#e0509c','#ffc6e4'],lip:['#9c1a60','#ffd23a','#ffeea0']},{c:['#cfc4d8','#fdf8ff','#ffffff'],lip:['#8e1b6a','#ffcf3a','#fff0a0']},{c:['#5b3a9a','#b58be0','#eddcff'],lip:['#7a1a6a','#f2c230','#ffe58a']}],
 layers:[LY(0,1,.34,.4,1.45,{az:[0,2.094,4.19],cup:.15,curl:.3,pt:.1,r0:.03}),LY(0,.95,.72,.5,1.5,{az:A2b,cup:.1,curl:.2,a:.6,b:.55,r0:.03}),LY(0,.45,.3,.4,.9,{az:[Math.PI],lip:1,cup:.7,curl:.5,r0:.02})],
 center:{k:'stam',n:1,len:.22,col:'#f5f0e0',anth:'#ffffff'}},
{name:'Girasol',S:.2,h:[1.5,1.9],sr:.02,nl:5,ll:.35,tilt:.95,o0:.7,
 pal:[{c:['#c46d00','#f5b000','#ffd84a']},{c:['#b85a00','#ee9a00','#ffc93c']}],
 layers:[LY(21,1,.22,.1,1.35,{curl:.35,cup:.2,a:.85,b:.4,pt:.15,r0:.45}),LY(21,.9,.2,.05,1.2,{off:.15,curl:.4,cup:.2,a:.85,b:.4,pt:.15,y:.01,r0:.45})],
 center:{k:'tex',id:'sun',r:.55,h:.16,bg:'#2a1608',d:['#3a2008','#6b4214','#a8742a']}},
{name:'Margarita',S:.05,h:[.4,.55],sr:.004,nl:4,ll:.12,tilt:.35,o0:.7,
 pal:[{c:['#cfcab5','#fafaf0','#ffffff']},{c:['#e8d0d8','#fbe9ef','#f7a8c0']}],
 layers:[LY(20,1,.11,.1,1.45,{a:.9,b:.35,cup:.25,curl:.2,r0:.22}),LY(16,.88,.1,.05,1.3,{off:.12,a:.9,b:.35,y:.01,r0:.22})],
 center:{k:'tex',id:'dai',r:.26,h:.12,bg:'#f2bd16',d:['#c98a05','#ffe066']}},
{name:'Amapola',S:.075,h:[.75,1],sr:.004,nl:3,ll:.2,tilt:.3,o0:.7,
 pal:[{c:['#4a0810','#e0242a','#ff5a3e']},{c:['#8a2a08','#ff7a1a','#ffc060']},{c:['#a03060','#f070a0','#ffd0e0']}],
 layers:[LY(0,1,.85,.2,1.0,{az:A2,cup:.5,curl:.35,ruf:.05,a:.6,b:.5,r0:.05}),LY(0,.95,.8,.25,.95,{az:A2b,cup:.5,curl:.35,ruf:.05,a:.6,b:.5,r0:.05,y:.01})],
 center:{k:'tex',id:'pop',r:.2,h:.18,bg:'#201018',d:['#40202e','#e8d36a']}},
{name:'Lirio',S:.12,h:[.9,1.2],sr:.008,nl:5,ll:.3,tilt:.85,o0:.7,
 pal:[{c:['#c04a6e','#f5a3be','#fff0f5']},{c:['#b94000','#ff8f20','#ffd890']},{c:['#bfc9a0','#fdfdf5','#ffffff']}],
 layers:[LY(3,1,.34,.2,1.15,{curl:1,cup:.35,pt:.45,a:.65,b:.7,ruf:.015,r0:.03}),LY(3,1,.3,.15,1.05,{off:1.047,curl:.9,cup:.35,pt:.45,a:.65,b:.7,r0:.03,y:.01})],
 center:{k:'stam',n:6,len:.9,sp:.35,col:'#d8d0a0',anth:'#7a2a10'}},
{name:'Cosmos',S:.055,h:[.7,1],sr:.005,nl:3,ll:.15,tilt:.3,o0:.7,
 pal:[{c:['#a02060','#f060a8','#ffc0e0']},{c:['#8a1060','#d63aa0','#ffa0e0']},{c:['#d8d0d8','#ffffff','#ffffff']}],
 layers:[LY(8,1,.42,.1,1.4,{cup:.15,curl:.15,a:.6,b:.5,r0:.15})],
 center:{k:'tex',id:'cos',r:.24,h:.14,bg:'#e8a810',d:['#c07a05','#ffe066']}},
{name:'Peonía',S:.12,h:[.5,.7],sr:.008,nl:4,ll:.2,tilt:.1,o0:.6,
 pal:[{c:['#c05080','#f4a8c8','#ffe6f0']},{c:['#cfc0b0','#f8f0ea','#fffaf5']},{c:['#c0503a','#ff9a80','#ffd8c8']},{c:['#6a0a30','#c02068','#f070a8']}],
 layers:[0,1,2,3,4,5,6,7].map(i=>LY([6,6,6,5,5,5,4,3][i],1-i*.09,.7-i*.05,.05,1.2-i*.14,{cup:.6,curl:.4,ruf:.06,off:i*.8,y:i*.01,r0:.02,dk:1-i*.04}))},
{name:'Dalia',S:.11,h:[.8,1.1],sr:.008,nl:4,ll:.22,tilt:.1,o0:.6,
 pal:[{c:['#a02a00','#f26a0a','#ffc060']},{c:['#6a0a50','#d01a90','#ff90d8']},{c:['#c08a00','#f8d020','#fff7a0']},{c:['#4a0612','#c0102a','#ff6a6a']}],
 layers:[0,1,2,3,4,5,6].map(i=>LY(9-Math.floor(i/3),1-i*.1,.26-i*.015,.1,1.15-i*.14,{pt:.3,a:.85,b:.8,cup:.7,curl:.2,off:i*.4,y:i*.008,r0:.02,dk:1-i*.04}))},
{name:'Hibisco',S:.1,h:[.9,1.2],sr:.01,nl:5,ll:.22,tilt:.9,o0:.7,
 pal:[{c:['#5a0010','#e0102a','#ff6070']},{c:['#b87800','#ffc820','#fff0a0']},{c:['#b02060','#ff70a8','#ffd0e4']}],
 layers:[LY(5,1,.65,.4,1.1,{cup:.3,curl:.5,ruf:.07,a:.65,b:.55,r0:.03})],
 center:{k:'stam',n:9,len:1.2,sp:.12,col:'#e8a0a0',anth:'#ffd23a'}},
{name:'Iris',S:.09,h:[.7,.95],sr:.007,nl:4,ll:.38,tilt:.2,o0:.7,
 pal:[{c:['#2a1a6a','#6a4ad0','#d8ccff']},{c:['#5a2a7a','#a05ad0','#f0d8ff']},{c:['#b88a00','#f5d020','#fff6a8']}],
 layers:[LY(3,1,.5,.05,.28,{cup:.5,curl:.3,ruf:.05,a:.65,b:.6,r0:.03}),LY(3,1.05,.6,.7,1.95,{off:1.047,cup:.2,curl:.9,ruf:.09,a:.6,b:.55,r0:.04,y:-.01})],
 center:{k:'stam',n:3,len:.45,sp:.2,col:'#f5f0e0',anth:'#ffd23a'}},
{name:'Gerbera',S:.07,h:[.4,.55],sr:.005,nl:5,ll:.2,tilt:.35,o0:.8,
 pal:[{c:['#c43a00','#ff7a1a','#ffc060']},{c:['#b0105a','#ff4aa0','#ffc0e0']},{c:['#c09000','#ffd21f','#fff4a0']},{c:['#8a0a14','#e8212e','#ff7a7a']}],
 layers:[LY(24,1,.17,.1,1.45,{a:.9,b:.4,cup:.3,curl:.25,r0:.2}),LY(20,.9,.16,.05,1.3,{off:.15,a:.9,b:.4,cup:.3,curl:.2,y:.01,r0:.2}),LY(14,.7,.14,.05,1.1,{off:.3,a:.9,b:.4,y:.02,r0:.2})],
 center:{k:'tex',id:'ger',r:.24,h:.13,bg:'#2a1a10',d:['#4a3020','#c8a050']}},
{name:'Camelia',S:.08,h:[.6,.85],sr:.01,nl:6,ll:.2,tilt:.35,o0:.65,
 pal:[{c:['#9a1a3a','#e84a76','#ffb0c8']},{c:['#cfc4b8','#fff5f0','#ffffff']},{c:['#b02a50','#ff8aa8','#ffe0ea']}],
 layers:[0,1,2,3,4].map(i=>LY([5,5,5,4,3][i],1-i*.12,.8-i*.08,.05,1.05-i*.17,{cup:.4,curl:.15,ruf:.02,off:i*1.1,y:i*.01,r0:.04,dk:1-i*.04})),
 center:{k:'stam',n:26,len:.3,sp:.5,col:'#f0e8a0',anth:'#ffd23a'}},
{name:'Hortensia',S:.2,h:[.6,.8],sr:.012,nl:6,ll:.34,tilt:.05,o0:.7,
 pal:[{c:['#2a4a9a','#6f95e6','#d8e4ff']},{c:['#a03a80','#e88ac8','#ffe0f2']},{c:['#5a3a9a','#a888e8','#eadcff']}],
 layers:[0,1,2,3,4,5].map(i=>{const f=.15+i*.27;return LY(Math.max(3,Math.round(18*Math.sin(f))),.34,.3,f,f+.25,{r0:Math.sin(f)*.55,y:Math.cos(f)*.55,cup:.4,curl:.15,a:.6,b:.5,off:i*1.3,dk:.9+i*.03})})},
{name:'Lavanda',S:.06,h:[.5,.75],sr:.004,nl:6,ll:.22,tilt:0,o0:.7,n:7,
 pal:[{c:['#4a2a8a','#8a5fd0','#c8a8ff']},{c:['#5a3a9a','#b090f0','#e8dcff']}],
 layers:Array.from({length:12},(_,i)=>LY(4,.22,.09,.35,.95,{r0:.06,y:i*.2,off:i*.8,cup:.4,curl:.2,a:.7,b:.5}))},
{name:'Narciso',S:.06,h:[.35,.5],sr:.005,nl:3,ll:.4,tilt:.5,o0:.7,
 pal:[{c:['#c9a000','#ffd92a','#fff1a0'],lip:['#b05a00','#ff9a1f','#ffc860']},{c:['#d0ccb8','#fffdf2','#ffffff'],lip:['#c98a00','#ffcf2a','#fff0a0']}],
 layers:[LY(3,1,.4,.05,1.25,{pt:.35,a:.7,b:.7,cup:.1,curl:.3,r0:.04}),LY(3,.95,.4,.05,1.2,{off:1.047,pt:.35,a:.7,b:.7,cup:.1,curl:.3,r0:.04,y:.005}),LY(10,.55,.22,.02,.4,{lip:1,cup:.8,curl:.35,ruf:.1,r0:.1,y:.02,a:.7,b:.6})]},
{name:'Magnolia',S:.13,h:[.9,1.2],sr:.012,nl:5,ll:.3,tilt:.15,o0:.55,
 pal:[{c:['#a05080','#f2b8d4','#fff0f6']},{c:['#cfc8b8','#fffaf0','#ffffff']},{c:['#6a1a5a','#c050a0','#f0b0e0']}],
 layers:[LY(3,1,.5,.1,.95,{cup:.7,curl:.3,a:.65,b:.6,r0:.03}),LY(3,.95,.5,.08,.85,{off:1.047,cup:.7,curl:.3,a:.65,b:.6,r0:.03,y:.01}),LY(3,.8,.46,.06,.6,{off:.5,cup:.7,curl:.2,a:.65,b:.6,r0:.02,y:.02})]},
{name:'Alcatraz',S:.1,h:[.7,.95],sr:.008,nl:4,ll:.4,tilt:.35,o0:.7,
 pal:[{c:['#c8d0b8','#fcfffa','#ffffff']},{c:['#2a0a30','#6a2a8a','#b080d0']},{c:['#c09000','#ffd21f','#fff4a0']},{c:['#a02a5a','#f080a8','#ffd8e6']}],
 layers:[LY(0,1.6,.9,.1,.55,{az:[0],cup:1.2,curl:.5,a:.6,b:.7,pt:.5,r0:.05}),LY(0,1.45,.8,.1,.5,{az:[2.7],cup:1.2,curl:.4,a:.6,b:.7,pt:.5,r0:.05,y:.01})],
 center:{k:'stam',n:1,len:.95,col:'#f2c820',anth:'#e6b010'}},
{name:'Crisantemo',S:.09,h:[.5,.7],sr:.007,nl:5,ll:.22,tilt:.1,o0:.7,n:4,
 pal:[{c:['#8a3a00','#e07a1a','#ffc880']},{c:['#c8c8b0','#fafaf0','#ffffff']},{c:['#7a0a5a','#e0309a','#ffa0e0']},{c:['#b89000','#ffd21f','#fff4a0']}],
 layers:[0,1,2,3,4,5].map(i=>LY([16,14,12,10,8,6][i],1-i*.1,.09,.1,1.3-i*.2,{a:.9,b:.45,cup:.4,curl:.4,off:i*.5,y:i*.012,r0:.03,dk:1-i*.03}))},
{name:'Clavel',S:.06,h:[.5,.7],sr:.004,nl:4,ll:.3,tilt:.15,o0:.7,n:4,
 pal:[{c:['#6a0010','#d0102a','#ff6a7a']},{c:['#b04a70','#f48ab0','#ffe0ea']},{c:['#d0c0c0','#fff0f4','#ff8aa0']},{c:['#a85a00','#ffa020','#ffe08a']}],
 layers:[LY(14,1,.3,.1,1.1,{ruf:.14,cup:.4,a:.8,b:.5,r0:.03}),LY(12,.85,.28,.08,.95,{ruf:.14,cup:.4,a:.8,b:.5,off:.2,y:.01,r0:.03}),LY(10,.65,.25,.05,.7,{ruf:.14,cup:.4,a:.8,b:.5,off:.4,y:.02,r0:.02})]},
{name:'Flor de cerezo',S:.05,h:[.4,.6],sr:.004,nl:3,ll:.12,tilt:.3,o0:.7,
 pal:[{c:['#e8809a','#ffc8d8','#fff4f8']},{c:['#d06a8a','#f8a8c0','#ffeaf0']}],
 layers:[LY(5,1,.55,.05,1.1,{cup:.3,curl:.25,a:.6,b:.5,r0:.04})],
 center:{k:'stam',n:18,len:.5,sp:.5,col:'#f6d8e0',anth:'#e8708a'}},
{name:'Anémona',S:.06,h:[.4,.6],sr:.004,nl:3,ll:.15,tilt:.25,o0:.7,
 pal:[{c:['#6a0a1a','#d01a3a','#ff6a80']},{c:['#3a1a6a','#7a4ad0','#c8b0ff']},{c:['#c8c8d8','#ffffff','#ffffff']}],
 layers:[LY(7,1,.45,.1,1.05,{cup:.35,curl:.2,a:.6,b:.5,r0:.15})],
 center:{k:'tex',id:'ane',r:.3,h:.22,bg:'#14102a',d:['#2a2050','#6070c0']}},
{name:'Loto',S:.12,h:[.8,1.1],sr:.01,nl:3,ll:.4,tilt:.05,o0:.6,n:4,
 pal:[{c:['#a03a70','#f6a0c8','#fff0f6']},{c:['#c8d0b8','#ffffff','#ffffff']}],
 layers:[LY(8,1,.3,.05,1.0,{pt:.45,a:.7,b:.7,cup:.5,curl:.3,r0:.03}),LY(7,.85,.3,.05,.8,{off:.4,pt:.45,a:.7,b:.7,cup:.5,curl:.3,r0:.03,y:.01}),LY(6,.65,.28,.05,.55,{off:.8,pt:.45,a:.7,b:.7,cup:.5,curl:.2,r0:.02,y:.02})],
 center:{k:'tex',id:'lot',r:.2,h:.15,bg:'#e8c020',d:['#a07a10','#fff0a0']}},
{name:'Petunia',S:.06,h:[.3,.4],sr:.004,nl:6,ll:.1,tilt:.6,o0:.7,
 pal:[{c:['#5a0a50','#c0309a','#ff90e0']},{c:['#3a1a7a','#7a4ad0','#c8b0ff']},{c:['#c8c8c8','#ffffff','#ffffff']}],
 layers:[LY(5,1,.6,.6,1.0,{cup:.15,curl:.3,ruf:.06,a:.6,b:.5,r0:.06})],
 center:{k:'stam',n:5,len:.3,sp:.1,col:'#f0e8d0',anth:'#ffd23a'}},
{name:'Pensamiento',S:.045,h:[.2,.3],sr:.003,nl:5,ll:.1,tilt:.5,o0:.7,
 pal:[{c:['#2a0a4a','#7a2ab0','#d8a8ff'],lip:['#c09000','#ffd21f','#fff4a0']},{c:['#3a2a8a','#6a7ae0','#c8d0ff'],lip:['#d0a000','#fff0a0','#ffffff']},{c:['#7a0a1a','#d02a3a','#ff9aa0'],lip:['#c07000','#ffc030','#fff0a0']}],
 layers:[LY(0,.9,.55,.2,.6,{az:[-.45,.45],cup:.2,ruf:.04,r0:.02}),LY(0,.9,.55,.6,1.2,{az:[1.6,-1.6],cup:.2,ruf:.04,r0:.02,y:.005}),LY(0,1,.65,.6,1.3,{az:[3.1416],lip:1,cup:.2,ruf:.05,r0:.02,y:.01})],
 center:{k:'tex',id:'pan',r:.14,h:.1,bg:'#c07000',d:['#3a1a00','#ffd21f']}},
{name:'Jazmín',S:.05,h:[.4,.6],sr:.004,nl:5,ll:.1,tilt:.35,o0:.7,
 pal:[{c:['#d8d4c0','#fffdf6','#ffffff']},{c:['#c8788a','#f8c0cc','#fff0f2']}],
 layers:[LY(5,1,.2,.1,1.4,{pt:.3,a:.7,b:.6,cup:.15,curl:.2,r0:.05}),LY(5,.9,.2,.08,1.25,{off:.63,pt:.3,a:.7,b:.6,cup:.15,curl:.2,r0:.05,y:.005})],
 center:{k:'stam',n:2,len:.3,col:'#f0e8c0',anth:'#e8c840'}},
{name:'Fucsia',S:.06,h:[.5,.7],sr:.004,nl:5,ll:.14,tilt:2.7,o0:.7,lean:.2,
 pal:[{c:['#a0103a','#e8306a','#ff8aae'],lip:['#3a0a6a','#7a2ab0','#b070e0']},{c:['#d8d0d8','#fff4f8','#ffffff'],lip:['#a0103a','#d83070','#ff80a8']}],
 layers:[LY(4,1,.22,.5,1.5,{pt:.4,a:.7,b:.65,cup:.2,curl:.5,r0:.03}),LY(4,.6,.34,.05,.55,{off:.78,lip:1,cup:.9,curl:.4,ruf:.05,a:.65,b:.6,r0:.04,y:.01})],
 center:{k:'stam',n:8,len:1.5,sp:.04,col:'#ff9ab8',anth:'#7a2a6a'}},
{name:'Delfinio',S:.07,h:[.9,1.3],sr:.006,nl:5,ll:.3,tilt:0,o0:.7,n:4,
 pal:[{c:['#1a2a8a','#4a6ae0','#b8c8ff']},{c:['#4a1a8a','#8a5ae0','#d8c8ff']},{c:['#c8c8d8','#ffffff','#ffffff']}],
 layers:Array.from({length:11},(_,i)=>LY(4,.34,.16,.3,.9,{r0:.08,y:i*.3,off:i*.9,cup:.4,curl:.2,a:.65,b:.55}))},
{name:'Zinnia',S:.07,h:[.5,.8],sr:.006,nl:4,ll:.2,tilt:.2,o0:.7,n:4,
 pal:[{c:['#8a0a14','#e8212e','#ff8a8a']},{c:['#c43a00','#ff7a1a','#ffc060']},{c:['#b0105a','#ff4aa0','#ffc0e0']},{c:['#c09000','#ffd21f','#fff4a0']}],
 layers:[0,1,2,3,4].map(i=>LY([14,12,10,8,6][i],1-i*.15,.3-i*.02,.1,1.3-i*.2,{cup:.3,curl:.2,a:.7,b:.5,off:i*.4,y:i*.012,r0:.1})),
 center:{k:'tex',id:'zin',r:.2,h:.12,bg:'#7a4a10',d:['#c8a020','#ffe066']}},
{name:'Ranúnculo',S:.06,h:[.4,.6],sr:.005,nl:4,ll:.14,tilt:.15,o0:.6,n:4,
 pal:[{c:['#c03a00','#ff7a1a','#ffc080']},{c:['#b04a70','#f48ab0','#ffe0ea']},{c:['#c09000','#ffd21f','#fff4a0']},{c:['#cfc4b8','#fff8f0','#ffffff']}],
 layers:[0,1,2,3,4,5].map(i=>LY([8,8,7,6,5,4][i],1-i*.1,.45-i*.04,.05,1.2-i*.18,{cup:.6,curl:.3,ruf:.04,off:i*.8,y:i*.01,r0:.02,dk:1-i*.04}))},
{name:'Campanilla',S:.07,h:[.5,.75],sr:.004,nl:5,ll:.14,tilt:2.2,o0:.7,
 pal:[{c:['#3a2a9a','#6a6ae8','#c8c8ff']},{c:['#c8c8d8','#fdfdff','#ffffff']},{c:['#a04a90','#e08ad0','#ffe0f6']}],
 layers:[LY(5,1,.5,.05,.5,{cup:.9,curl:.7,a:.6,b:.5,pt:.1,r0:.05})],
 center:{k:'stam',n:1,len:.7,col:'#f0e8f8',anth:'#ffffff'}}
];
TYPES.push({name:'Rosal (arbusto)',bush:1,S:.07,h:[.5,.95],sr:.006,nl:0,ll:.1,tilt:.2,o0:.65,lean:.4,pal:TYPES[0].pal,layers:[0,2,4,6].map(i=>TYPES[0].layers[i])});

// ---------- planta ----------
const hits=[],plants=[],beds=[];var gardenG=null;
function makePlant(T,pi,x,z){
 const pal=T.pal[pi%T.pal.length],S=T.S*GS,h=R(T.h[0],T.h[1])*GS,plant=new Group();plant.position.set(x,0,z);
 const lq=T.lean||.12,bx=R(-lq,lq)*h,bz=R(-lq,lq)*h;
 const curve=new THREE.CatmullRomCurve3([new Vector3(0,0,0),new Vector3(bx*.2,h*.35,bz*.2),new Vector3(bx*.6,h*.7,bz*.6),new Vector3(bx,h,bz)]);
 const stem=new Mesh(new THREE.TubeGeometry(curve,14,T.sr*GS,6),stemMat);stem.castShadow=true;plant.add(stem);
 const lg=petalGeo({L:T.ll*GS,W:T.ll*GS*.28,cup:.35,curl:.5,a:.6,b:.7,ruf:0,pt:.3,p:['#2c5420','#4a8532','#78ad55'],dk:1});
 for(let i=0;i<T.nl;i++){
  const piv=new Group();piv.position.copy(curve.getPoint(.1+i/T.nl*.55));piv.rotation.order='YXZ';piv.rotation.y=i*2.4+R(0,1);piv.rotation.x=R(.6,1.1);
  const m=new Mesh(lg,petalMat);m.castShadow=true;piv.add(m);plant.add(piv);
 }
 const root=new Group();root.position.copy(curve.getPoint(1));plant.add(root);
 const tg=new Group();tg.rotation.x=T.tilt+R(-.1,.1);root.add(tg);
 const sg=new Group();tg.add(sg);
 const rc=new Mesh(new THREE.SphereGeometry(.2*S,8,6),stemMat);rc.scale.y=.6;sg.add(rc);
 const petals=[];
 T.layers.forEach((ly,li)=>{
  const cnt=ly.az?ly.az.length:ly.n,pc=ly.lip&&pal.lip?pal.lip:pal.c;
  const geo=petalGeo({L:ly.L*S,W:ly.W*S,cup:ly.cup||0,curl:ly.curl||0,a:ly.a||.75,b:ly.b||.65,ruf:ly.ruf||0,pt:ly.pt||0,p:pc,dk:ly.dk||1});
  for(let i=0;i<cnt;i++){
   const az=ly.az?ly.az[i]:i/cnt*TAU+(ly.off||0)+R(-.08,.08),r0=(ly.r0||0)*S;
   const piv=new Group();piv.rotation.order='YXZ';piv.rotation.y=az;piv.position.set(Math.sin(az)*r0,(ly.y||0)*S,Math.cos(az)*r0);
   piv.add(new Mesh(geo,petalMat));sg.add(piv);
   petals.push({piv,t0:ly.t0+R(-.04,.04),t1:ly.t1+R(-.1,.1),li,ph:R(0,TAU)});
  }
 });
 const C=T.center;
 if(C&&C.k==='tex'){const d=dome(C.r*S,C.h*S,domeTex(C));d.position.y=.01*S;sg.add(d)}
 if(C&&C.k==='stam')sg.add(stamens(S,C));
 const hit=new Mesh(new THREE.SphereGeometry(1.2*S,8,6),new THREE.MeshBasicMaterial({visible:false}));hit.position.y=.5*S;tg.add(hit);
 const yaw=R(0,TAU);root.rotation.y=yaw;
 const p={g:plant,root,sg,petals,T,open:T.o0,target:T.o0,spin:0,spinT:0,hov:0,yaw,cur:yaw,ph:R(0,TAU),nl:T.layers.length};
 hit.userData.plant=p;hits.push(hit);plants.push(p);(gardenG||scene).add(plant);p.grow=1;return p;
}
function updPlant(p,dt,t){
 if(p.grow<1){p.grow=Math.min(1,p.grow+dt/1.5);const x=p.grow-1;p.g.scale.setScalar(Math.max(.001,1+2.70158*x*x*x+1.70158*x*x))}
 p.open+=(cl(p.target+p.hov*.3,0,1)-p.open)*(1-Math.exp(-dt*2.2));
 p.spin+=(p.spinT-p.spin)*(1-Math.exp(-dt*2.4));
 p.sg.rotation.y=p.spin;p.sg.scale.setScalar(1+.08*p.hov+.1*Math.min(1,Math.abs(p.spinT-p.spin)/Math.PI));
 for(const q of p.petals){const e=cl(p.open*1.5-q.li/p.nl*.5,0,1),s=e*e*(3-2*e);q.piv.rotation.x=lerp(q.t0,q.t1,s)+Math.sin(t*1.6+q.ph)*.018*(.3+s)}
 p.g.rotation.z=Math.sin(t*.9+p.ph)*.025;p.g.rotation.x=Math.cos(t*.7+p.ph)*.02;
 const tgt=p.hov>.5?Math.atan2(cam.position.x-p.g.position.x,cam.position.z-p.g.position.z):p.yaw;
 const d=((tgt-p.cur+Math.PI)%TAU+TAU)%TAU-Math.PI;p.cur+=d*(1-Math.exp(-dt*3));p.root.rotation.y=p.cur;
}

const leafG=petalGeo({L:.14*GS,W:.05*GS,cup:.3,curl:.4,a:.6,b:.7,ruf:0,pt:.3,p:['#24491b','#3f7a2c','#6aa346'],dk:1});
function makeBush(T,pi,x,z){
 const g=new Group(),n=95,im=new THREE.InstancedMesh(leafG,petalMat,n),o=new THREE.Object3D();
 for(let i=0;i<n;i++){const a=R(0,TAU),r=Math.sqrt(R(0,1))*.62*GS,hh=R(.12,.8)*GS*(1-r/(.9*GS)*.5);
  o.position.set(Math.cos(a)*r,hh,Math.sin(a)*r);o.rotation.set(R(-1,1),R(0,TAU),R(-1,1));o.scale.setScalar(R(.8,1.5));o.updateMatrix();im.setMatrixAt(i,o.matrix)}
 im.castShadow=true;im.frustumCulled=false;g.add(im);g.position.set(x,0,z);(gardenG||scene).add(g);
 for(let k=0;k<7;k++){const a=k/7*TAU+R(0,.8),d=R(.05,.3)*GS;makePlant(T,pi,x+Math.cos(a)*d,z+Math.sin(a)*d)}
}
function addAt(ti,x,z){
 const T=TYPES[ti];if(plants.length>460)return;
 if(T.bush){const p0=plants.length;makeBush(T,R(0,5)|0,x,z);for(let i=p0;i<plants.length;i++)plants[i].grow=0}
 else{const p=makePlant(T,R(0,5)|0,x,z);p.grow=0}
}
const INFO={
'Rosa':['Rosa × hybrida','Primavera a otoño','Símbolo universal del amor. Existen más de 30 000 variedades cultivadas.'],
'Tulipán':['Tulipa gesneriana','Primavera','En la Holanda del siglo XVII un solo bulbo llegó a costar más que una casa.'],
'Orquídea':['Phalaenopsis amabilis','Todo el año','Una sola flor puede durar hasta tres meses abierta.'],
'Girasol':['Helianthus annuus','Verano','De joven sigue al sol durante el día: es el heliotropismo.'],
'Margarita':['Leucanthemum vulgare','Primavera y verano','Cada «pétalo» blanco es en realidad una flor diminuta.'],
'Amapola':['Papaver rhoeas','Primavera','Sus semillas pueden dormir décadas hasta que se remueve el suelo.'],
'Lirio':['Lilium candidum','Verano','Su perfume intenso se libera sobre todo al caer la tarde.'],
'Cosmos':['Cosmos bipinnatus','Verano a otoño','Atrae mariposas y abejas y crece casi sin cuidados.'],
'Peonía':['Paeonia lactiflora','Primavera','Puede vivir más de 50 años en el mismo lugar.'],
'Dalia':['Dahlia pinnata','Verano a otoño','Es la flor nacional de México y sus tubérculos son comestibles.'],
'Hibisco':['Hibiscus rosa-sinensis','Todo el año','Cada flor dura un solo día. Con sus cálices se preparan infusiones.'],
'Iris':['Iris germanica','Primavera','Su nombre viene de Iris, la diosa griega del arcoíris.'],
'Gerbera':['Gerbera jamesonii','Primavera a otoño','Es una de las flores de corte más vendidas del mundo.'],
'Camelia':['Camellia japonica','Invierno y primavera','Pertenece al mismo género que la planta del té.'],
'Hortensia':['Hydrangea macrophylla','Verano','Su color depende del suelo: azul si es ácido, rosa si es alcalino.'],
'Lavanda':['Lavandula angustifolia','Verano','Su aroma calma y atrae a las abejas.'],
'Narciso':['Narcissus pseudonarcissus','Fin de invierno','Anuncia la primavera. Todas sus partes son tóxicas.'],
'Magnolia':['Magnolia grandiflora','Primavera y verano','Es de los linajes de flores más antiguos, anterior a las abejas.'],
'Alcatraz':['Zantedeschia aethiopica','Primavera','Lo que parece un pétalo es una hoja modificada llamada espata.'],
'Crisantemo':['Chrysanthemum morifolium','Otoño','En Japón es el emblema de la casa imperial.'],
'Clavel':['Dianthus caryophyllus','Primavera a verano','Su aroma recuerda al del clavo de olor.'],
'Flor de cerezo':['Prunus serrulata','Primavera','En Japón su floración efímera simboliza la fugacidad de la vida.'],
'Anémona':['Anemone coronaria','Primavera','Su nombre significa «hija del viento».'],
'Loto':['Nelumbo nucifera','Verano','Sus pétalos repelen el agua y la suciedad: es el efecto loto.'],
'Petunia':['Petunia × hybrida','Primavera a otoño','Es pariente cercana del tomate y de la papa.'],
'Pensamiento':['Viola × wittrockiana','Otoño a primavera','Es comestible y las líneas de su «cara» guían a los insectos al néctar.'],
'Jazmín':['Jasminum officinale','Verano','Su esencia es clave en perfumes famosos como el Chanel nº 5.'],
'Fucsia':['Fuchsia magellanica','Verano a otoño','Sus flores cuelgan como pequeñas bailarinas.'],
'Delfinio':['Delphinium elatum','Verano','Su espiga puede superar los dos metros de altura.'],
'Zinnia':['Zinnia elegans','Verano','Fue la primera flor cultivada en el espacio, en la Estación Espacial.'],
'Ranúnculo':['Ranunculus asiaticus','Primavera','Cada flor puede tener más de 100 pétalos en capas.'],
'Campanilla':['Campanula persicifolia','Verano','Sus flores con forma de campana se abren hacia abajo.'],
'Rosal (arbusto)':['Rosa spp. (arbusto)','Primavera a otoño','Un solo arbusto puede dar decenas de rosas por temporada.']};
const DESC={
'Rosa':'Arbusto de tallos con espinas y flores grandes, perfumadas, de muchos pétalos aterciopelados en capas.',
'Tulipán':'Planta de bulbo con una sola flor en forma de copa y hojas largas y carnosas de color verde azulado.',
'Orquídea':'Hierba epífita de raíces aéreas; sus flores planas y simétricas se alinean en una vara arqueada.',
'Girasol':'Planta anual muy alta, de tallo robusto y velloso; su gran cabezuela amarilla reúne cientos de flores.',
'Margarita':'Hierba perenne de pétalos blancos alrededor de un centro amarillo; crece en praderas y bordes de camino.',
'Amapola':'Hierba anual de tallo fino con cuatro pétalos de papel arrugado y un centro oscuro lleno de estambres.',
'Lirio':'Planta de bulbo con tallo recto y flores en trompeta de seis pétalos curvados hacia atrás.',
'Cosmos':'Hierba ligera de follaje plumoso, con flores en forma de plato de pétalos anchos y centro amarillo.',
'Peonía':'Planta perenne de flores muy grandes, de pétalos suaves y ondulados que forman una bola densa.',
'Dalia':'Planta de tubérculo con flores simétricas de pétalos apretados en espiral; existen miles de cultivares.',
'Hibisco':'Arbusto tropical de hojas brillantes y flores grandes con una columna larga de estambres al centro.',
'Iris':'Planta de rizoma con hojas en abanico y flores de tres pétalos erguidos y tres caídos.',
'Gerbera':'Hierba de roseta basal con flores tipo margarita de colores intensos sobre tallos largos y sin hojas.',
'Camelia':'Arbusto de hojas verdes y brillantes todo el año y flores de pétalos redondeados con estambres dorados.',
'Hortensia':'Arbusto de hojas anchas cuyas flores diminutas se agrupan en grandes bolas de colores.',
'Lavanda':'Subarbusto aromático de hojas plateadas y espigas de pequeñas flores violetas.',
'Narciso':'Planta de bulbo con hojas en cinta y flores de seis tépalos con una corona central en forma de trompeta.',
'Magnolia':'Árbol o arbusto de hojas gruesas y brillantes y grandes flores en copa, de aroma dulce.',
'Alcatraz':'Planta de rizoma con hojas en forma de flecha; su «flor» es una espata blanca que envuelve un espádice amarillo.',
'Crisantemo':'Hierba perenne de hojas lobuladas y flores formadas por muchas láminas finas en capas.',
'Clavel':'Hierba de tallos con nudos y hojas estrechas grisáceas; sus pétalos tienen el borde dentado.',
'Flor de cerezo':'Árbol que florece antes de echar hojas; sus flores de cinco pétalos pálidos nacen en racimos.',
'Anémona':'Planta de tubérculo con hojas muy divididas y flores de pétalos anchos y centro oscuro.',
'Loto':'Planta acuática de hojas grandes y redondas; su flor se alza sobre un tallo largo por encima del agua.',
'Petunia':'Hierba de tallos blandos y velludos con flores en forma de embudo, muy abundantes.',
'Jazmín':'Arbusto trepador de hojas compuestas y pequeñas flores blancas en estrella, muy perfumadas.',
'Fucsia':'Arbusto de ramas finas con flores colgantes de sépalos de colores y corola en campana.',
'Delfinio':'Planta perenne muy alta con hojas lobuladas y largas espigas de flores azules, moradas o blancas.',
'Zinnia':'Hierba anual de tallos ásperos y flores planas de capas regulares y colores vivos.',
'Ranúnculo':'Planta de raíces en garra con hojas divididas y flores de pétalos finos como papel, en muchas capas.',
'Campanilla':'Hierba de hojas estrechas y flores en forma de campana sobre tallos delgados.',
'Rosal (arbusto)':'Arbusto denso y ramificado de follaje verde oscuro que sostiene muchas rosas al mismo tiempo.'};
const signMats=[],ringG=new THREE.TorusGeometry(1.95,.05,6,36),ringM=new THREE.MeshStandardMaterial({color:col('#8a8780'),roughness:.9}),woodM=new THREE.MeshStandardMaterial({color:col('#6b4a2e'),roughness:.8});
function wrapT(g,s,x,y,w,lh){const ws=s.split(' ');let l='';for(const t of ws){const m=l?l+' '+t:t;if(g.measureText(m).width>w&&l){cut(g,l,x,y);y+=lh;l=t}else l=m}cut(g,l,x,y);return y}
function woodPaint(g,x,y,w,h,base){
 const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,base[0]);gr.addColorStop(.5,base[1]);gr.addColorStop(1,base[0]);g.fillStyle=gr;g.fillRect(x,y,w,h);
 for(let i=0;i<260;i++){const yy=y+Math.random()*h;g.strokeStyle='rgba(60,32,10,'+Math.random()*.14+')';g.lineWidth=.6+Math.random()*2.2;g.beginPath();g.moveTo(x,yy);g.bezierCurveTo(x+w*.3,yy+(Math.random()-.5)*14,x+w*.6,yy+(Math.random()-.5)*14,x+w,yy+(Math.random()-.5)*8);g.stroke()}
 for(let i=0;i<3;i++){const kx=x+Math.random()*w,ky=y+Math.random()*h;for(let r=3;r>0;r--){g.strokeStyle='rgba(60,32,10,'+(.06+.04*r)+')';g.lineWidth=2;g.beginPath();g.ellipse(kx,ky,r*10,r*4.5,0,0,TAU);g.stroke()}}
}
function woodTex(){const c=document.createElement('canvas');c.width=c.height=256;woodPaint(c.getContext('2d'),0,0,256,256,['#6e4a2a','#8a6038']);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;return t}
function woodFace(g,W,H){
 woodPaint(g,0,0,W,H,['#b88a56','#cfa56f']);
 g.fillStyle='rgba(40,20,6,.55)';g.fillRect(0,Math.round(H*.34),W,4);g.fillRect(0,Math.round(H*.68),W,4);
 g.fillStyle='rgba(255,230,190,.25)';g.fillRect(0,Math.round(H*.34)+4,W,2);g.fillRect(0,Math.round(H*.68)+4,W,2);
 g.strokeStyle='rgba(50,26,8,.75)';g.lineWidth=10;g.strokeRect(5,5,W-10,H-10);
 g.strokeStyle='rgba(255,235,200,.35)';g.lineWidth=3;g.strokeRect(14,14,W-28,H-28);
 g.strokeStyle='rgba(50,26,8,.55)';g.lineWidth=3;g.strokeRect(22,22,W-44,H-44);
 for(const [px,py] of [[44,44],[W-44,44],[44,H-44],[W-44,H-44]]){g.fillStyle='#3a3a38';g.beginPath();g.arc(px,py,11,0,TAU);g.fill();g.fillStyle='#8c8c88';g.beginPath();g.arc(px-3,py-3,4,0,TAU);g.fill()}
}
function cut(g,s,x,y){const f=g.fillStyle;g.fillStyle='rgba(255,235,200,.4)';g.fillText(s,x+1.5,y+2);g.fillStyle=f;g.fillText(s,x,y)}
const metalM=new THREE.MeshStandardMaterial({map:woodTex(),roughness:.85,metalness:0});const signHits=[];
function makeSign(T,c){
 const inf=INFO[T.name]||['','',''],W=1024,H=960,k2=document.createElement('canvas');k2.width=W;k2.height=H;const g=k2.getContext('2d');
 woodPaint(g,0,0,W,H,['#8a5e34','#a8774a']);g.strokeStyle='rgba(30,15,4,.7)';g.lineWidth=8;g.strokeRect(4,4,W-8,H-8);
 const qx=64,qy=64,qw=W-128,qh=H-128;
 g.save();g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=20;g.shadowOffsetY=6;g.fillStyle='#f3e8cc';g.fillRect(qx,qy,qw,qh);g.restore();
 const pg=g.createLinearGradient(0,qy,0,qy+qh);pg.addColorStop(0,'#f8efd9');pg.addColorStop(1,'#eadcba');g.fillStyle=pg;g.fillRect(qx,qy,qw,qh);
 g.strokeStyle='#7a5430';g.lineWidth=3;g.strokeRect(qx+14,qy+14,qw-28,qh-28);
 for(const [nx,ny] of [[34,34],[W-34,34],[34,H-34],[W-34,H-34]]){g.fillStyle='#3a3a38';g.beginPath();g.arc(nx,ny,11,0,TAU);g.fill();g.fillStyle='#8c8c88';g.beginPath();g.arc(nx-3,ny-3,4,0,TAU);g.fill()}
 const L=108,mw=W-216,ls=on=>{if('letterSpacing' in g)g.letterSpacing=on?'4px':'0px'};
 g.fillStyle=T.pal[0].c[1];g.fillRect(L,104,mw,10);
 g.textAlign='left';let fs=100;g.font='bold 100px Georgia,serif';while(g.measureText(T.name).width>mw&&fs>48){fs-=4;g.font='bold '+fs+'px Georgia,serif'}
 g.fillStyle='#2a1506';g.fillText(T.name,L,222);
 g.font='italic 44px Georgia,serif';g.fillStyle='#6a4018';g.fillText(inf[0],L,288);
 g.fillStyle='rgba(90,52,20,.6)';g.fillRect(L,314,mw,3);
 g.fillStyle='#2a1506';g.font='40px Georgia,serif';let y=wrapT(g,DESC[T.name]||'',L,382,mw,54);
 y+=78;g.fillStyle='#8a4f12';g.font='bold 28px Georgia,serif';ls(1);g.fillText('FLORACIÓN',L,y);ls(0);
 g.fillStyle='#2a1506';g.font='42px Georgia,serif';g.fillText(inf[1],L,y+54);
 T.pal.slice(0,6).forEach((p,i)=>{g.fillStyle=p.c[1];g.beginPath();g.arc(W-L-17-i*48,y+34,17,0,TAU);g.fill();g.strokeStyle='rgba(60,30,10,.6)';g.lineWidth=2;g.stroke()});
 y+=118;g.fillStyle='#8a4f12';g.font='bold 28px Georgia,serif';ls(1);g.fillText('DATO CURIOSO',L,y);ls(0);
 g.fillStyle='#3a2210';g.font='italic 38px Georgia,serif';wrapT(g,inf[2],L,y+52,mw,50);
 const t=new THREE.CanvasTexture(k2);t.encoding=THREE.sRGBEncoding;t.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const m=new THREE.MeshBasicMaterial({map:t});signMats.push(m);
 const sg=new Group(),post=new Mesh(new THREE.BoxGeometry(.09,2.6,.1),metalM);post.position.set(-.93,1.3,0);post.castShadow=true;sg.add(post);const post2=post.clone();post2.position.x=.93;sg.add(post2);
 const fr=new Mesh(new THREE.BoxGeometry(1.72,1.62,.07),metalM);fr.position.y=1.85;fr.castShadow=true;fr.userData.bed=c;signHits.push(fr);sg.add(fr);
 const rf=new Mesh(new THREE.BoxGeometry(1.9,.08,.18),metalM);rf.position.y=2.72;rf.castShadow=true;sg.add(rf);
 const f=new Mesh(new THREE.PlaneGeometry(1.6,1.5),m);f.position.set(0,1.85,.04);sg.add(f);
 const b=new Mesh(new THREE.PlaneGeometry(1.6,1.5),m);b.position.set(0,1.85,-.04);b.rotation.y=Math.PI;sg.add(b);
 let best=0,bs=-1;for(let k=0;k<16;k++){const a=k/16*TAU,px=c.x+Math.cos(a)*2.3,pz=c.z+Math.sin(a)*2.3;let mn=99;for(const o of centers)if(o!==c)mn=Math.min(mn,Math.hypot(o.x-px,o.z-pz));if(mn>bs){bs=mn;best=a}}
 sg.position.set(c.x+Math.cos(best)*2.3,0,c.z+Math.sin(best)*2.3);sg.rotation.y=Math.PI/2-best;scene.add(sg);
}
// ---------- disposición del jardín ----------
const centers=TYPES.map((T,ti)=>{const a=ti*2.39996+.3,d=4.2*Math.sqrt(ti+.6);return{x:Math.cos(a)*d,z:Math.sin(a)*d}});
centers.forEach((c,ti)=>{
 const bed=new Mesh(new THREE.CircleGeometry(1.9,28),new THREE.MeshStandardMaterial({color:col('#4a3624'),roughness:1}));
 bed.rotation.x=-Math.PI/2;bed.position.set(c.x,.012,c.z);bed.receiveShadow=true;bed.userData.ti=ti;beds.push(bed);scene.add(bed);makeSign(TYPES[ti],c);const rg=new Mesh(ringG,ringM);rg.rotation.x=Math.PI/2;rg.position.set(c.x,.06,c.z);rg.castShadow=true;scene.add(rg);
 const T=TYPES[ti];if(T.bush){for(let k=0;k<2;k++)makeBush(T,ti+k,c.x+(k?.85:-.85),c.z+R(-.3,.3));return}const n0=T.name==='Girasol'?3:T.n||4,n=MOB?Math.min(n0,3):n0;
 for(let k=0;k<n;k++){const a=k/n*TAU+R(0,1),d=k?R(.6,1.5):0;makePlant(T,k,c.x+Math.cos(a)*d,c.z+Math.sin(a)*d)}
});

// pasto instanciado con viento
{const N=MOB?28000:70000,bg=new THREE.PlaneGeometry(.04,.2,1,3);bg.translate(0,.1,0);
 const gm=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uN:{value:0}},side:THREE.DoubleSide,
  vertexShader:'uniform float uT;varying vec2 vUv;varying float vD;varying float vR;void main(){vUv=uv;vec4 p=instanceMatrix*vec4(position,1.);vR=fract(sin(dot(instanceMatrix[3].xz,vec2(12.9,78.2)))*437.5);float w=sin(uT*1.6+p.x*.7+p.z*.5)*.06+sin(uT*3.1+p.x*2.)*.02;p.x+=w*uv.y*uv.y*3.;p.z+=w*.5*uv.y*uv.y*3.;vec4 wp=modelMatrix*p;vD=length(wp.xyz-cameraPosition);gl_Position=projectionMatrix*viewMatrix*wp;}',
  fragmentShader:'uniform float uN;varying vec2 vUv;varying float vD;varying float vR;void main(){vec3 c=mix(vec3(.06,.16,.04),vec3(.42,.62,.18),vUv.y);c*=(.8+.4*vR)*mix(1.,.25,uN);c=mix(c,mix(vec3(.81,.89,.91),vec3(.04,.07,.14),uN),smoothstep(30.,120.,vD));gl_FragColor=vec4(c,1.);}'});
 const im=new THREE.InstancedMesh(bg,gm,N),o=new THREE.Object3D();let k=0;
 while(k<N){const a=rnd()*TAU,r=Math.sqrt(rnd())*40,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(centers.some(c=>Math.hypot(c.x-x,c.z-z)<1.75))continue;
  o.position.set(x,0,z);o.rotation.y=rnd()*TAU;o.scale.set(1,R(.6,1.4),1);o.updateMatrix();im.setMatrixAt(k++,o.matrix)}
 im.frustumCulled=false;scene.add(im);window.grassMat=gm;}

// árboles de fondo
{const tm=new THREE.MeshStandardMaterial({color:col('#5a3d26'),roughness:1}),fms=['#2f5a26','#3d6a2a','#25492a','#4a7a30'].map(c=>new THREE.MeshStandardMaterial({color:col(c),roughness:1,flatShading:true})),fm=fms[0];
 for(let i=0;i<(MOB?60:110);i++){const a=R(0,TAU),d=R(48,100),g=new Group();
  const tr=new Mesh(new THREE.CylinderGeometry(.3,.45,3.5,6),tm);tr.position.y=1.75;g.add(tr);
  for(let j=0;j<3;j++){const f=new Mesh(new THREE.IcosahedronGeometry(R(2,3),0),fms[i%4]);f.position.set(R(-1,1),4+j*1.2,R(-1,1));g.add(f)}
  g.scale.setScalar(R(.8,1.7));g.position.set(Math.cos(a)*d,0,Math.sin(a)*d);scene.add(g)}}

// polen flotante
const PN=260,pp=new Float32Array(PN*3);for(let i=0;i<PN;i++){pp[i*3]=R(-30,30);pp[i*3+1]=R(.3,3);pp[i*3+2]=R(-30,30)}
const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));
scene.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0xfff2a0,size:.05,map:dotTex,transparent:true,opacity:.7,depthWrite:false,fog:false})));

// estanque espejo con lotos
const PX=-36,PZ=12;
var pondM=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uK:{value:1},uCam:{value:new Vector3()}},transparent:true,
 vertexShader:'varying vec3 vW;varying vec2 vUv;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
 fragmentShader:'uniform float uT,uK;uniform vec3 uCam;varying vec3 vW;varying vec2 vUv;float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}void main(){vec2 q=vW.xz;vec3 n=normalize(vec3(sin(q.x*1.7+uT*.8)*.03+sin(q.y*2.3-uT*.6)*.03,1.,cos(q.x*1.9-uT*.7)*.03+cos(q.y*1.3+uT)*.03));vec3 v=normalize(vW-uCam);vec3 r=reflect(v,n);float hh=clamp(r.y,0.,1.);vec3 dayC=mix(vec3(.82,.9,.92),vec3(.25,.5,.82),hh);vec3 nc=mix(vec3(.035,.06,.15),vec3(.004,.01,.04),hh);vec3 c=mix(dayC,nc,uK);vec2 sp=r.xz/(r.y+.2)*55.;vec2 id=floor(sp);vec2 f=fract(sp)-.5;float st=step(.97,hs(id))*(1.-smoothstep(0.,.25,length(f)))*(.6+.4*sin(uT*2.+hs(id)*20.));c+=vec3(.9,.95,1.)*st*uK;float fr=pow(1.-max(dot(-v,n),0.),3.);vec3 base=mix(vec3(.05,.2,.22),vec3(0.,.02,.05),uK);c=mix(base,c,.3+.7*fr);float rd=length(vUv-.5)*2.;gl_FragColor=vec4(c,1.-smoothstep(.88,1.,rd));}'});
const pond=new Mesh(new THREE.CircleGeometry(9,64),pondM);pond.rotation.x=-Math.PI/2;pond.position.set(PX,.04,PZ);scene.add(pond);
{const padG=new THREE.CircleGeometry(.4,14,.3,TAU-.6),padM=new THREE.MeshStandardMaterial({color:col('#2f6a2a'),roughness:.6,side:THREE.DoubleSide});
 for(let i=0;i<14;i++){const a=R(0,TAU),r=Math.sqrt(R(0,1))*7,p=new Mesh(padG,padM);p.rotation.x=-Math.PI/2;p.rotation.z=R(0,TAU);p.position.set(PX+Math.cos(a)*r,.06,PZ+Math.sin(a)*r);p.scale.setScalar(R(.7,1.5));scene.add(p)}
 const LT=TYPES.find(t=>t.name==='Loto');for(let k=0;k<4;k++){const a=k*1.6+.4;makePlant(LT,k,PX+Math.cos(a)*3,PZ+Math.sin(a)*3)}}
// ---------- puerta, sala de código y música ----------
gardenG=new Group();[...scene.children].forEach(c=>{if(!c.isLight)gardenG.add(c)});scene.add(gardenG);const gardenFog=scene.fog;
let inRoom=false,busy=false,nearD=false;const fade=document.getElementById('fade');
const DOOR={x:0,z:-34};
window.portalMat=new THREE.ShaderMaterial({uniforms:{uT:{value:0}},side:THREE.DoubleSide,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform float uT;varying vec2 vUv;void main(){vec2 p=vUv-.5;float d=length(p*vec2(1.,.55));vec3 c=mix(vec3(.95,1.,.85),vec3(.1,1.,.5),smoothstep(.05,.6,d));c*=.75+.25*sin(uT*2.+vUv.y*12.);c+=.15*step(.9,fract(vUv.y*30.-uT*.8));gl_FragColor=vec4(c,1.);}'});
{const g=new Group(),sm=new THREE.MeshStandardMaterial({color:col('#8a8a84'),roughness:.9});
 [-1.1,1.1].forEach(x=>{const m=new Mesh(new THREE.BoxGeometry(.35,3.2,.5),sm);m.position.set(x,1.6,0);m.castShadow=true;g.add(m)});
 const lt=new Mesh(new THREE.BoxGeometry(2.8,.4,.6),sm);lt.position.y=3.4;lt.castShadow=true;g.add(lt);
 const st=new Mesh(new THREE.BoxGeometry(2.6,.12,1.1),sm);st.position.set(0,.06,.3);g.add(st);
 const pl=new Mesh(new THREE.BoxGeometry(1.85,3.2,.14),new THREE.MeshStandardMaterial({color:0x050505,roughness:.25,metalness:.6}));pl.position.y=1.7;pl.castShadow=true;g.add(pl);
 const L2=new THREE.PointLight(0x55ffaa,.9,6);L2.position.set(0,1.8,1.2);g.add(L2);
 g.position.set(DOOR.x,0,DOOR.z);gardenG.add(g);window.doorG=g;}
const room=new Group();room.position.set(500,0,0);room.visible=false;scene.add(room);
const code=(document.currentScript?document.currentScript.textContent:'').split('\n').map(s=>s.trim()).filter(s=>s.length>3);if(!code.length)code.push('const jardin = new Garden();');
const cc=document.createElement('canvas');cc.width=cc.height=1024;
{const g=cc.getContext('2d');g.fillStyle='#02100a';g.fillRect(0,0,1024,1024);g.font='bold 38px monospace';
 for(let i=0;i<25;i++){g.fillStyle=['#39ff88','#7dffb0','#1fbf6a','#9ad9ff','#ffd166'][i%5];g.fillText(code[(i*11+3)%code.length].slice(0,38),16,40*i+38)}}
const wallT=[],flatT=[];
function mkT(rx,ry,arr){const t=new THREE.CanvasTexture(cc);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.encoding=THREE.sRGBEncoding;if(arr)arr.push(t);return t}
function rp(w,h,t,c){const m=new Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,color:c,side:THREE.DoubleSide}));room.add(m);return m}
{let m=rp(40,4,mkT(10,1,wallT),0xffffff);m.rotation.y=Math.PI/2;m.position.set(-3,2,0);
 m=rp(40,4,mkT(10,1,wallT),0xffffff);m.rotation.y=-Math.PI/2;m.position.set(3,2,0);
 m=rp(6,40,mkT(1.5,10,flatT),0xaaaaaa);m.rotation.x=Math.PI/2;m.position.set(0,4,0);
 m=rp(6,40,mkT(1.5,10,flatT),0x446655);m.rotation.x=-Math.PI/2;
 m=rp(6,4,mkT(1.5,1),0xffffff);m.position.set(0,2,-20);m=rp(6,4,mkT(1.5,1),0xffffff);m.position.set(0,2,20);
 const ex=new Mesh(new THREE.PlaneGeometry(1.7,2.9),portalMat);ex.position.set(0,1.5,-19.95);room.add(ex);
 [[-.95,1.5,.2,3.1],[.95,1.5,.2,3.1],[0,3.05,2.1,.2]].forEach(a=>{const b=new Mesh(new THREE.BoxGeometry(a[2],a[3],.2),new THREE.MeshBasicMaterial({color:0x39ff88}));b.position.set(a[0],a[1],-19.9);room.add(b)});}
{const t=mkT(1,.9,flatT),s=new Mesh(new THREE.PlaneGeometry(1.6,2.9),new THREE.MeshBasicMaterial({map:t,color:0x4a8a64}));s.position.set(0,1.7,.08);doorG.add(s);
 const hd=new Mesh(new THREE.SphereGeometry(.07,12,8),new THREE.MeshStandardMaterial({color:0xc9a24a,metalness:1,roughness:.25}));hd.position.set(.75,1.6,.14);doorG.add(hd);
 [[0,3.32,1.95,.05],[0,.08,1.95,.05],[-.95,1.7,.05,3.3],[.95,1.7,.05,3.3]].forEach(a=>{const b=new Mesh(new THREE.BoxGeometry(a[2],a[3],.06),new THREE.MeshBasicMaterial({color:0x1c5a38}));b.position.set(a[0],a[1],.05);doorG.add(b)})}
// día y noche, luciérnagas y mariposas
let tod=1,todT=1;
const nc=document.createElement('canvas');nc.width=512;nc.height=256;
{const g=nc.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#03061a');gr.addColorStop(.5,'#0c1a3a');gr.addColorStop(1,'#1a2a4a');g.fillStyle=gr;g.fillRect(0,0,512,256);
 
 
 }
const nt=new THREE.CanvasTexture(nc);nt.encoding=THREE.sRGBEncoding;
const nightSky=new Mesh(new THREE.SphereGeometry(148,24,24),new THREE.MeshBasicMaterial({map:nt,side:THREE.BackSide,transparent:true,opacity:0,fog:false,depthWrite:false}));
const FN=MOB?700:1400,fp=new Float32Array(FN*3);for(let i=0;i<FN;i++){fp[i*3]=R(-34,34);fp[i*3+1]=R(.2,2.6);fp[i*3+2]=R(-34,34)}
const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(fp,3));
const fph=new Float32Array(FN);for(let i=0;i<FN;i++)fph[i]=rnd();fg.setAttribute('aPh',new THREE.Float32BufferAttribute(fph,1));
const ffm=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uK:{value:0},uS:{value:40}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,
 vertexShader:'attribute float aPh;uniform float uT,uK,uS;varying float vI;void main(){vec3 p=position;p.x+=sin(uT*.35+aPh*6.28)*.9;p.z+=cos(uT*.3+aPh*9.)*.9;p.y+=sin(uT*.6+aPh*11.)*.35;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float b=pow(max(sin(uT*(1.1+aPh*1.4)+aPh*40.),0.),4.);vI=(.12+b)*uK;gl_PointSize=(.7+.9*b)*uS/(-mv.z);}',
 fragmentShader:'varying float vI;void main(){float d=length(gl_PointCoord-.5);float g=1.-smoothstep(0.,.5,d);float core=1.-smoothstep(0.,.1,d);vec3 c=mix(vec3(.55,1.,.25),vec3(1.,1.,.8),core);gl_FragColor=vec4(c*(g*g*.9+core)*vI,1.);}'});
const ff=new THREE.Points(fg,ffm);ff.frustumCulled=false;ff.visible=false;gardenG.add(ff);
// estrellas titilantes
const SN=MOB?2500:5000,sp=new Float32Array(SN*3),sc=new Float32Array(SN*3),ss=new Float32Array(SN*2);
for(let i=0;i<SN;i++){const th=R(0,TAU),ph=Math.acos(R(0,1));sp[i*3]=140*Math.sin(ph)*Math.cos(th);sp[i*3+1]=140*Math.cos(ph);sp[i*3+2]=140*Math.sin(ph)*Math.sin(th);sc.set([[1,1,1],[.7,.8,1],[1,.9,.7]][i%3],i*3);ss[i*2]=R(.6,2.2);ss[i*2+1]=R(0,TAU)}
const sgeo=new THREE.BufferGeometry();sgeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));sgeo.setAttribute('aC',new THREE.Float32BufferAttribute(sc,3));sgeo.setAttribute('aS',new THREE.Float32BufferAttribute(ss,2));
const stars=new THREE.Points(sgeo,new THREE.ShaderMaterial({uniforms:{uT:{value:0},uK:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,
 vertexShader:'attribute vec3 aC;attribute vec2 aS;uniform float uT;varying vec3 vC;varying float vA;void main(){vC=aC;vA=.55+.45*sin(uT*(1.5+aS.x)+aS.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=aS.x*2.4;}',
 fragmentShader:'uniform float uK;varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=1.-smoothstep(0.,.5,d);a*=a;gl_FragColor=vec4(vC*a*vA*uK,1.);}'}));stars.frustumCulled=false;stars.visible=false;gardenG.add(stars);
// aurora boreal
const aur=new Mesh(new THREE.CylinderGeometry(120,120,60,64,1,true,Math.PI-.95,1.9),new THREE.ShaderMaterial({uniforms:{uT:{value:0},uK:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform float uT,uK;varying vec2 vUv;void main(){float x=vUv.x*14.;float n=sin(x*1.7+uT*.35)+sin(x*3.1-uT*.5)*.6+sin(x*.7+uT*.2)*.8;float band=pow(clamp(.5+.35*n,0.,1.),2.5);float h=vUv.y;float a=smoothstep(0.,.35,h)*pow(1.-h,1.2);vec3 c=mix(vec3(.1,1.,.55),vec3(.55,.2,.95),smoothstep(.35,1.,h));gl_FragColor=vec4(c*a*band*uK*1.3,1.);}'}));aur.position.y=42;aur.visible=false;
// estrellas fugaces
const SS=[];for(let i=0;i<3;i++){const n=26,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(n*3),3));g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(n*3),3));
 const p=new THREE.Points(g,new THREE.PointsMaterial({size:6,map:dotTex,sizeAttenuation:false,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));p.frustumCulled=false;p.visible=false;gardenG.add(p);SS.push({p,n,life:0,wait:R(1,4),h:new Vector3(),d:new Vector3()})}
function shoot(s,dt,k){
 if(s.life<=0){s.wait-=dt;if(s.wait>0||k<.5)return;const az=R(0,TAU),el=R(.35,1.05);s.h.set(Math.cos(az)*Math.cos(el),Math.sin(el),Math.sin(az)*Math.cos(el)).multiplyScalar(135);s.d.set(R(-1,1),R(-.6,-.2),R(-1,1)).normalize();s.life=1.1;s.p.visible=true}
 s.life-=dt;const a=s.p.geometry.attributes,f=Math.max(0,s.life)/1.1;s.h.addScaledVector(s.d,dt*75);
 for(let i=0;i<s.n;i++){const q=1-i/s.n;a.position.setXYZ(i,s.h.x-s.d.x*i*1.6,s.h.y-s.d.y*i*1.6,s.h.z-s.d.z*i*1.6);const c=q*q*Math.min(1,f*2);a.color.setXYZ(i,c,c,c*.95)}
 a.position.needsUpdate=true;a.color.needsUpdate=true;if(s.life<=0){s.p.visible=false;s.wait=R(2,7)}}
const bfs=[],bwg=new THREE.PlaneGeometry(.14,.1);bwg.translate(.07,0,0);bwg.rotateX(-Math.PI/2);
for(let i=0;i<14;i++){const g=new Group(),m=new THREE.MeshBasicMaterial({color:[0xff9a2e,0xfff06a,0xff6fa8,0x8ac8ff,0xffffff][i%5],side:THREE.DoubleSide}),w1=new Mesh(bwg,m),w2=new Mesh(bwg,m);w2.scale.x=-1;g.add(w1,w2);g.userData={w1,w2,cx:R(-12,12),cz:R(-12,12),r:R(1.5,4),sp:R(.3,.7),ph:R(0,TAU),hy:R(.7,1.8)};gardenG.add(g);bfs.push(g)}
const cN=new Color(0x7a9aff),cH=new Color(0x2a3a7a),cF=new Color(0x0a1224);
// cartel de ENTRADA / SALIDA
function mkPlaque(t1,t2,w,h,c1){const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const g=c.getContext('2d');
 g.fillStyle='#050a08';g.fillRect(0,0,c.width,c.height);g.strokeStyle=c1;g.lineWidth=8;g.strokeRect(10,10,c.width-20,c.height-20);
 g.textAlign='center';g.shadowColor=c1;g.shadowBlur=24;g.fillStyle=c1;g.font='bold '+Math.round(c.height*.46)+'px ui-monospace,Menlo,Consolas,monospace';g.fillText(t1,c.width/2,c.height*.58);
 g.shadowBlur=0;g.font=Math.round(c.height*.13)+'px ui-monospace,Menlo,Consolas,monospace';g.fillStyle='#b8ffd0';g.fillText(t2,c.width/2,c.height*.86);
 const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return new Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,fog:false}))}
{const pq=mkPlaque('ENTRADA','código · música',2.8,.9,'#39ff88');pq.position.set(0,4.2,.3);doorG.add(pq);
 const sl=new Mesh(new THREE.BoxGeometry(2.9,.95,.1),new THREE.MeshStandardMaterial({color:0x101412,roughness:.5,metalness:.6}));sl.position.set(0,4.2,.22);doorG.add(sl);
 [-1.1,1.1].forEach(x=>{const b=new Mesh(new THREE.BoxGeometry(.08,.5,.08),sl.material);b.position.set(x,3.85,.22);doorG.add(b)});
 const pq2=mkPlaque('SALIDA','volver al jardín',2,.64,'#ffd166');pq2.position.set(0,3.6,-19.85);room.add(pq2)}
// farolas y guirnaldas de luces
var lampFx=()=>{},fxDt=.016;
{const lamps=[],metal=new THREE.MeshStandardMaterial({color:col('#1d201f'),roughness:.45,metalness:.8}),glass=new THREE.MeshBasicMaterial({color:0xfff0c0}),
 haloM=new THREE.SpriteMaterial({map:dotTex,color:0xffc878,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0,fog:false}),
 poolM=new THREE.MeshBasicMaterial({map:dotTex,color:0xffb860,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0,fog:false}),
 cand=[[-2.2,DOOR.z+1.8],[2.2,DOOR.z+1.8]];
 for(let i=0;i<500&&cand.length<20;i++){const a=R(0,TAU),r=R(8,38),x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(centers.some(c=>Math.hypot(c.x-x,c.z-z)<3.4)||cand.some(c=>Math.hypot(c[0]-x,c[1]-z)<8)||Math.hypot(x-PX,z-PZ)<11)continue;cand.push([x,z])}
 for(const [x,z] of cand){const g=new Group();
  const pole=new Mesh(new THREE.CylinderGeometry(.03,.05,2.4,8),metal);pole.position.y=1.2;pole.castShadow=true;g.add(pole);
  const base=new Mesh(new THREE.CylinderGeometry(.08,.1,.25,8),metal);base.position.y=.12;g.add(base);
  const lan=new Mesh(new THREE.BoxGeometry(.2,.28,.2),glass);lan.position.y=2.55;g.add(lan);
  const cap=new Mesh(new THREE.ConeGeometry(.19,.14,4),metal);cap.position.y=2.76;cap.rotation.y=Math.PI/4;g.add(cap);
  const halo=new THREE.Sprite(haloM);halo.scale.set(1.5,1.5,1);halo.position.y=2.55;g.add(halo);
  const pool=new Mesh(new THREE.CircleGeometry(2.6,24),poolM);pool.rotation.x=-Math.PI/2;pool.position.y=.03;g.add(pool);
  g.position.set(x,0,z);gardenG.add(g);lamps.push({x,z})}
 const wireM=new THREE.MeshStandardMaterial({color:0x111111,roughness:.7}),used={'0-1':1,'1-0':1},bp=[];
 lamps.forEach((a,i)=>{let bj=-1,bd=99;lamps.forEach((b,j)=>{if(j===i||used[i+'-'+j]||used[j+'-'+i])return;const d=Math.hypot(a.x-b.x,a.z-b.z);if(d<bd&&d>3){bd=d;bj=j}});
  if(bj<0||bd>17)return;used[i+'-'+bj]=1;const b=lamps[bj],sag=.4+bd*.045,pts=[];
  for(let s=0;s<=16;s++){const t=s/16;pts.push(new Vector3(lerp(a.x,b.x,t),2.5-sag*4*t*(1-t),lerp(a.z,b.z,t)))}
  gardenG.add(new Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),32,.007,4),wireM));
  const nb=Math.max(6,Math.round(bd*1.1));for(let s=1;s<nb;s++){const t=s/nb;bp.push(lerp(a.x,b.x,t),2.5-sag*4*t*(1-t)-.03,lerp(a.z,b.z,t))}});
 const bulbM=new THREE.MeshBasicMaterial({color:0xffc880}),nB=bp.length/3,im=new THREE.InstancedMesh(new THREE.SphereGeometry(.028,8,6),bulbM,nB),o=new THREE.Object3D();
 for(let i=0;i<nB;i++){o.position.set(bp[i*3],bp[i*3+1],bp[i*3+2]);o.updateMatrix();im.setMatrixAt(i,o.matrix)}im.frustumCulled=false;gardenG.add(im);
 const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(bp,3));
 const bpts=new THREE.Points(bg,new THREE.PointsMaterial({map:dotTex,color:0xffc070,size:.5,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));bpts.frustumCulled=false;gardenG.add(bpts);
 const PL=[0,1,2,3].map(()=>{const l=new THREE.PointLight(0xffc070,0,10,2);scene.add(l);return l});const PS=[0,1,2,3].map(()=>({li:-1,f:0}));
 lampFx=k=>{haloM.opacity=k*.9;poolM.opacity=k*.5;bpts.material.opacity=k*.9;bulbM.color.setRGB(lerp(.45,1,k),lerp(.4,.78,k),lerp(.3,.5,k));
  const d2=q=>(q.x-cam.position.x)**2+(q.z-cam.position.z)**2,idx=lamps.map((q,i)=>i).sort((a,b)=>d2(lamps[a])-d2(lamps[b])),top=idx.slice(0,6);
  PS.forEach((s,i)=>{if(s.li>=0){if(top.includes(s.li))s.f=Math.min(1,s.f+fxDt*1.4);else{s.f=Math.max(0,s.f-fxDt*1.4);if(s.f<=.02)s.li=-1}}
  if(s.li<0){const fr=idx.slice(0,4).find(j=>!PS.some(o=>o.li===j));if(fr!==undefined){s.li=fr;s.f=0;PL[i].position.set(lamps[fr].x,2.5,lamps[fr].z)}}
  PL[i].intensity=k*2.2*s.f*s.f*(3-2*s.f)})}}
// abejas y colibríes
const crit=[],tv=new Vector3(),dv=new Vector3(),hv=new Vector3(),ov=new Vector3();
function stripeTex(){const c=document.createElement('canvas');c.width=64;c.height=64;const g=c.getContext('2d');for(let i=0;i<8;i++){g.fillStyle=i%2?'#1a1208':'#f2b81a';g.fillRect(0,i*8,64,8)}const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
const wingM=new THREE.MeshBasicMaterial({color:0xdfe8f0,transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false});
function mkBee(){const g=new Group(),abg=new THREE.SphereGeometry(.016,12,10);abg.rotateX(Math.PI/2);
 const ab=new Mesh(abg,new THREE.MeshStandardMaterial({map:stripeTex(),roughness:.8}));ab.scale.set(1,.9,1.5);ab.position.z=-.022;
 const th=new Mesh(new THREE.SphereGeometry(.012,10,8),new THREE.MeshStandardMaterial({color:col('#a8781a'),roughness:1}));
 const hd=new Mesh(new THREE.SphereGeometry(.008,8,6),new THREE.MeshStandardMaterial({color:0x120e08,roughness:.7}));hd.position.z=.016;g.add(ab,th,hd);
 const wg=new THREE.PlaneGeometry(.03,.012);wg.translate(.015,0,0);wg.rotateX(-Math.PI/2);
 const w1=new Mesh(wg,wingM),w2=new Mesh(wg,wingM);w2.scale.x=-1;w1.position.set(.005,.01,0);w2.position.set(-.005,.01,0);g.add(w1,w2);g.userData={w1,w2};return g}
function mkHum(){const g=new Group(),gm=new THREE.MeshStandardMaterial({color:col('#1f9a5a'),roughness:.35,metalness:.5}),
 bd=new Mesh(new THREE.SphereGeometry(.022,12,10),gm);bd.scale.set(1,1,2.1);
 const hd=new Mesh(new THREE.SphereGeometry(.016,12,10),gm);hd.position.set(0,.006,.05);
 const th=new Mesh(new THREE.SphereGeometry(.012,8,6),new THREE.MeshStandardMaterial({color:col('#d01a5a'),roughness:.3,metalness:.4}));th.position.set(0,-.006,.058);
 const bk=new Mesh(new THREE.ConeGeometry(.0032,.07,6),new THREE.MeshStandardMaterial({color:0x111111,roughness:.5}));bk.rotation.x=Math.PI/2;bk.position.set(0,.004,.1);
 const tl=new Mesh(new THREE.PlaneGeometry(.03,.05),new THREE.MeshStandardMaterial({color:col('#14663a'),side:THREE.DoubleSide}));tl.rotation.x=-Math.PI/2;tl.position.set(0,0,-.06);g.add(bd,hd,th,bk,tl);
 const wg=new THREE.PlaneGeometry(.1,.025);wg.translate(.05,0,0);wg.rotateX(-Math.PI/2);
 const w1=new Mesh(wg,wingM),w2=new Mesh(wg,wingM);w2.scale.x=-1;w1.position.set(.012,.012,.005);w2.position.set(-.012,.012,.005);g.add(w1,w2);g.userData={w1,w2};return g}
for(let i=0;i<16;i++){const hum=i>=12,g=hum?mkHum():mkBee();g.position.set(R(-10,10),1,R(-10,10));gardenG.add(g);crit.push({g,hum,tgt:null,st:0,hold:0,ph:R(0,TAU),sp:hum?4.5:2})}
function pickT(c){const arr=[];for(const p of plants){if(p===c.tgt||p.grow<1)continue;arr.push([p.g.position.distanceToSquared(c.g.position),p])}if(!arr.length)return;arr.sort((a,b)=>a[0]-b[0]);c.tgt=arr[Math.min(arr.length-1,Math.random()*8|0)][1]}
function critUpdate(dt,t,k){
 const show=k<.55;
 for(const c of crit){const g=c.g;g.visible=show;if(!show)continue;
  if(!c.tgt)pickT(c);if(!c.tgt)continue;
  const p=c.tgt,S=p.T.S*GS;p.root.getWorldPosition(hv);tv.copy(hv);
  if(c.hum){tv.x+=Math.sin(p.cur)*S*1.7;tv.z+=Math.cos(p.cur)*S*1.7;tv.y+=S*.4}else tv.y+=S*.7;
  dv.subVectors(tv,g.position);const d=dv.length();
  if(c.st){c.hold-=dt;const w=c.hum?.012:.02;ov.set(Math.sin(t*2.7+c.ph)*w,Math.cos(t*3.3+c.ph)*w*.7,Math.sin(t*2.1+c.ph)*w);
   g.position.lerp(tv.add(ov),1-Math.exp(-dt*5));g.lookAt(hv.x,hv.y,hv.z);if(c.hold<=0){c.st=0;pickT(c)}}
  else{const st=Math.min(d,c.sp*dt*(c.hum?1:1+.3*Math.sin(t*3+c.ph)));g.position.addScaledVector(dv.normalize(),st);g.position.y+=Math.sin(t*6+c.ph)*.003;
   g.lookAt(g.position.x+dv.x,g.position.y+dv.y*.5,g.position.z+dv.z);if(d<.08){c.st=1;c.hold=c.hum?2.5+Math.random()*2.5:1.8+Math.random()*3}}
  const fl=Math.sin(t*(c.hum?70:140)+c.ph)*.9;g.userData.w1.rotation.z=fl;g.userData.w2.rotation.z=-fl;
 }
}
// sonido ambiental 3D
var AA=null,AG,CG,BG,buzzP,buzzG;const tmpD=new Vector3();
function pan(x,y,z,ref){const p=AA.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=ref;p.maxDistance=300;p.rolloffFactor=1.6;setP(p,x,y,z);return p}
function setP(p,x,y,z){if(p.positionX){p.positionX.value=x;p.positionY.value=y;p.positionZ.value=z}else p.setPosition(x,y,z)}
function chirp(dest,t0){for(let j=0;j<3;j++){const o=AA.createOscillator(),g=AA.createGain(),t=t0+j*.075;o.frequency.value=4300+Math.random()*300;o.connect(g);g.connect(dest);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.015);g.gain.linearRampToValueAtTime(0,t+.05);o.start(t);o.stop(t+.06)}}
function tweet(dest,t0){const n=2+Math.random()*3|0,f0=2200+Math.random()*1800;for(let j=0;j<n;j++){const o=AA.createOscillator(),g=AA.createGain(),t=t0+j*.13;o.frequency.setValueAtTime(f0*(1+Math.random()*.3),t);o.frequency.exponentialRampToValueAtTime(f0*(1.3+Math.random()*.5),t+.09);o.connect(g);g.connect(dest);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07,t+.02);g.gain.linearRampToValueAtTime(0,t+.1);o.start(t);o.stop(t+.12)}}
var voices=null;
function startAmb(){
 if(AA){AA.resume();return}
 AA=new(window.AudioContext||window.webkitAudioContext)();AA.resume();
 AG=AA.createGain();AG.gain.value=0;AG.connect(AA.destination);voices=[];
 for(let i=0;i<6;i++){const hum=i>=4,o=AA.createOscillator(),o2=AA.createOscillator(),f=AA.createBiquadFilter(),g=AA.createGain(),pp2=pan(0,1,0,hum?.8:.6);
  o.type='sawtooth';o.frequency.value=hum?80:190;o2.type='sine';o2.frequency.value=hum?160:380;f.type='lowpass';f.frequency.value=hum?600:900;g.gain.value=0;
  o.connect(f);o2.connect(f);f.connect(g);g.connect(pp2);pp2.connect(AG);o.start();o2.start();voices.push({pp:pp2,g,hum,o,o2})}
}
function ambUpdate(k,dt){
 if(!AA||!voices)return;const L=AA.listener,p=cam.position,d=cam.getWorldDirection(tmpD);
 if(L.positionX){L.positionX.value=p.x;L.positionY.value=p.y;L.positionZ.value=p.z;L.forwardX.value=d.x;L.forwardY.value=d.y;L.forwardZ.value=d.z;L.upX.value=0;L.upY.value=1;L.upZ.value=0}else{L.setPosition(p.x,p.y,p.z);L.setOrientation(d.x,d.y,d.z,0,1,0)}
 AG.gain.value+=((inRoom||k>.55?0:1)-AG.gain.value)*Math.min(1,dt*3);
 const dd=c=>c.g.position.distanceToSquared(p),bees=crit.filter(c=>!c.hum).sort((a,b)=>dd(a)-dd(b)),hums=crit.filter(c=>c.hum).sort((a,b)=>dd(a)-dd(b)),tt=performance.now()/1000;
 voices.forEach((v,i)=>{const c=(v.hum?hums:bees)[v.hum?i-4:i];if(!c)return;const b=c.g.position;setP(v.pp,b.x,b.y,b.z);v.g.gain.value=c.g.visible?(c.st?.03:.055)*(v.hum?.9:1):0;const w=1+.05*Math.sin(tt*38+i);v.o.frequency.value=(v.hum?80:190)*w;v.o2.frequency.value=(v.hum?160:380)*w})
}
addEventListener('pointerdown',startAmb,{once:true});addEventListener('keydown',startAmb,{once:true});
// joystick táctil, presentación inicial y viaje a los letreros
var intro={on:true,go:false,t:0,dur:4.2},fly={on:false},joy={x:0,y:0},lastTap={b:null,t:0},turn=0;
['bl','br'].forEach(id=>{const el=document.getElementById(id),k=id==='bl'?1:-1;let on=false;el.addEventListener('pointerdown',e=>{e.stopPropagation();on=true;turn=k});['pointerup','pointerleave','pointercancel'].forEach(ev=>el.addEventListener(ev,()=>{if(on){on=false;turn=0}}))});
{const el=document.getElementById('joy'),kn=el.firstElementChild;let id=null;
 const set=e=>{const r=el.getBoundingClientRect();let dx=(e.clientX-(r.left+r.width/2))/(r.width/2),dy=(e.clientY-(r.top+r.height/2))/(r.height/2);const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}joy.x=dx;joy.y=-dy;kn.style.transform='translate('+dx*38+'px,'+dy*38+'px)'};
 el.addEventListener('pointerdown',e=>{id=e.pointerId;el.setPointerCapture(id);set(e);e.stopPropagation()});
 el.addEventListener('pointermove',e=>{if(e.pointerId===id)set(e)});
 const end=e=>{if(e.pointerId===id){id=null;joy.x=joy.y=0;kn.style.transform=''}};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}
function introNav(dt){
 if(!intro.on)return false;
 let u=0;if(intro.go){intro.t+=dt*(intro.rate||1);u=Math.min(1,intro.t/intro.dur)}
 const S=x=>x*x*x*(x*(x*6-15)+10),cp=x=>Math.min(1,Math.max(0,x)),eh=S(u),ea=S(cp((u-.18)/.82)),er=S(cp((u-.1)/.9)),ep=S(cp((u-.15)/.85)),ang=lerp(-1.5,0,ea),rad=lerp(14,30,er),h=lerp(75,1.4,eh);cam.fov=lerp(46,62,eh);cam.updateProjectionMatrix();
 cam.position.set(Math.sin(ang)*rad,h,Math.cos(ang)*rad);cam.lookAt(0,lerp(0,-2.6,ep),lerp(0,-20,ep));
 
 if(u>=1){intro.on=false;pos.set(0,0,30);eye=1.4;yaw=0;pitch=-.08;vel.set(0,0,0);gardenFog.near=30;gardenFog.far=130;cam.fov=62;cam.updateProjectionMatrix();document.body.classList.remove('cine')}
 return true}
function startIntro(){if(intro.go)return;intro.go=true;intro.t=0;document.body.classList.add('cine');
 for(const p of plants){p.grow=-(Math.hypot(p.g.position.x,p.g.position.z)*.04+R(0,.2));p.open=.02}
 }

addEventListener('pointerdown',()=>{if(intro.on&&intro.go)intro.rate=3});
var warmF=0;function beginIntro(){document.getElementById('veil').classList.add('off');startIntro()}
document.querySelectorAll('#pad,#pad button,#joy').forEach(el=>{el.setAttribute('draggable','false');el.addEventListener('contextmenu',e=>e.preventDefault());el.addEventListener('dragstart',e=>e.preventDefault())});
document.querySelectorAll('#dp button,#joy').forEach(el=>el.addEventListener('touchstart',e=>e.preventDefault(),{passive:false}));
document.querySelectorAll('#pad button').forEach(b=>b.setAttribute('role','button'));
document.addEventListener('selectstart',e=>{const t=e.target.nodeType===1?e.target:e.target.parentElement;if(t&&t.closest('#pad,#joy'))e.preventDefault()});
function flyNav(dt){
 if(!fly.on)return false;
 if(Math.abs(joy.x)+Math.abs(joy.y)>.15||keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||keys.ArrowUp||keys.ArrowDown){fly.on=false;return false}
 fly.t+=dt;const u=Math.min(1,fly.t/fly.dur),e=u*u*(3-2*u);
 pos.x=lerp(fly.x0,fly.x1,e);pos.z=lerp(fly.z0,fly.z1,e);yaw=fly.y0+fly.dy*e;pitch=lerp(fly.p0,fly.p1,e);eye=lerp(fly.e0,fly.e1,e);vel.set(0,0,0);
 cam.position.set(pos.x,eye,pos.z);cam.rotation.set(pitch,yaw,0,'YXZ');if(u>=1)fly.on=false;return true}
function flyTo(c){
 const dx=pos.x-c.x,dz=pos.z-c.z,d=Math.hypot(dx,dz)||1;let tx=c.x+dx/d*4.6,tz=c.z+dz/d*4.6;const r=Math.hypot(tx,tz);if(r>44){tx*=44/r;tz*=44/r}
 const y1=Math.atan2(-(c.x-tx),-(c.z-tz));
 fly={on:true,t:0,dur:2.4,x0:pos.x,z0:pos.z,y0:yaw,dy:((y1-yaw+Math.PI)%TAU+TAU)%TAU-Math.PI,p0:pitch,p1:-.2,e0:eye,e1:1.5,x1:tx,z1:tz}}
function signTap(e){
 mp.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mp,cam);const f0=ray.far;ray.far=90;const h=ray.intersectObjects(signHits,false)[0];ray.far=f0;
 if(!h)return false;const b=h.object.userData.bed,now=performance.now();
 if(lastTap.b===b&&now-lastTap.t<450){flyTo(b);lastTap.b=null}else{lastTap.b=b;lastTap.t=now}
 return true}
function fx(dt,t){
 tod+=(todT-tod)*(1-Math.exp(-dt*1.4));const k=tod;skyDome.material.uniforms.uK.value=k;skyDome.position.copy(cam.position);stars.position.copy(cam.position);pondM.uniforms.uT.value=t;pondM.uniforms.uK.value=k;pondM.uniforms.uCam.value.copy(cam.position);fxDt=dt;lampFx(k);ambUpdate(k,dt);
 sun.intensity=lerp(2.3,.4,k);sun.color.setHex(0xfff0d2).lerp(cN,k);hemi.intensity=lerp(.85,.5,k);hemi.color.setHex(0xcfe8ff).lerp(cH,k);
 gardenFog.color.setHex(0xcfe3e8).lerp(cF,k);nightSky.material.opacity=k;grassMat.uniforms.uN.value=k;glowU.value=k*.6;ffm.uniforms.uK.value=k;ffm.uniforms.uT.value=t;ffm.uniforms.uS.value=renderer.domElement.height*.045;ff.visible=k>.02;stars.material.uniforms.uK.value=k;stars.material.uniforms.uT.value=t;stars.visible=k>.02;for(const m of signMats)m.color.setScalar(lerp(1,.85,k));
 if(inRoom)return;critUpdate(dt,t,k);
 for(const s of SS)shoot(s,dt,k);
 for(const b of bfs){b.visible=k<.5;if(!b.visible)continue;const u=b.userData,an=t*u.sp+u.ph,fl=Math.sin(t*18+u.ph)*.8;b.position.set(u.cx+Math.cos(an)*u.r,u.hy+Math.sin(t*1.3+u.ph)*.2,u.cz+Math.sin(an)*u.r);b.rotation.y=-an;u.w1.rotation.z=fl;u.w2.rotation.z=-fl}
}
// panel de música en las paredes de la sala
const UI={c:document.createElement('canvas')};UI.c.width=1024;UI.c.height=560;UI.t=new THREE.CanvasTexture(UI.c);UI.t.encoding=THREE.sRGBEncoding;UI.t.anisotropy=4;
const UIB=[{id:'sereno',t:'Jardín sereno',x:40,y:96,w:460,h:80},{id:'arpa',t:'Arpa nocturna',x:524,y:96,w:460,h:80},{id:'cristal',t:'Piano de cristal',x:40,y:196,w:460,h:80},{id:'pajaros',t:'Amanecer con pájaros',x:524,y:196,w:460,h:80},{id:'file',t:'Cargar mi música…',x:40,y:296,w:460,h:80},{id:'pp',t:'Pausar / Reanudar',x:524,y:296,w:460,h:80},{id:'vm',t:'−',x:40,y:396,w:100,h:60},{id:'vbar',t:'',x:160,y:396,w:704,h:60},{id:'vp',t:'+',x:884,y:396,w:100,h:60}];
let uiHover=null,uiTrack='',uiMsg='Toca una pista para escucharla en el jardín',uiVol=.6,uiPaused=false,uiX=0;
function drawUI(){const g=UI.c.getContext('2d');g.fillStyle='#02100a';g.fillRect(0,0,1024,560);g.strokeStyle='#1fbf6a';g.lineWidth=4;g.strokeRect(6,6,1012,548);
 g.fillStyle='#39ff88';g.font='bold 34px monospace';g.textAlign='left';g.fillText('$ elegir_musica --jardin',40,62);
 for(const b of UIB){const on=b.id===uiTrack,hv=b===uiHover;g.fillStyle=hv?'#0f4a24':on?'#0b3a1c':'#06210f';g.fillRect(b.x,b.y,b.w,b.h);g.strokeStyle=on?'#9fffc0':'#1fbf6a';g.lineWidth=3;g.strokeRect(b.x,b.y,b.w,b.h);g.fillStyle=on?'#c8ffd8':'#39ff88';g.font='bold 28px monospace';
  if(b.id==='vm'||b.id==='vp'){g.textAlign='center';g.fillText(b.t,b.x+b.w/2,b.y+b.h/2+10);g.textAlign='left'}else if(b.t)g.fillText((on?'▶ ':'')+b.t,b.x+18,b.y+b.h/2+10)}
 g.fillStyle='#39ff88';g.fillRect(168,404,688*uiVol,44);g.fillStyle='#7dffb0';g.font='24px monospace';g.fillText(uiMsg,40,510);g.fillStyle='#1fbf6a';g.fillText('Volumen '+Math.round(uiVol*100)+'%',40,544);UI.t.needsUpdate=true}
drawUI();
const uiPanels=[];
[[-2.96,Math.PI/2,6],[2.96,-Math.PI/2,6],[-2.96,Math.PI/2,-9],[2.96,-Math.PI/2,-9]].forEach(([x,ry,z])=>{const m=new Mesh(new THREE.PlaneGeometry(4.4,2.4),new THREE.MeshBasicMaterial({map:UI.t}));m.position.set(x,2,z);m.rotation.y=ry;room.add(m);uiPanels.push(m)});
function uiPick(e){mp.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mp,cam);const h=ray.intersectObjects(uiPanels,false)[0];if(!h)return null;const x=h.uv.x*1024,y=(1-h.uv.y)*560;uiX=x;return UIB.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)||null}
function uiMove(e){const b=uiPick(e);if(b!==uiHover){uiHover=b;drawUI();cv.style.cursor=b?'pointer':'grab'}}
function uiClick(e){const b=uiPick(e);if(!b)return;
 if(b.id==='file'){$('mf').click();return}
 if(b.id==='pp'){if(!AC){uiMsg='Elige primero una pista'}else{$('pp').onclick();uiPaused=!uiPaused;uiMsg=uiPaused?'En pausa':'Reproduciendo'}}
 else if(b.id==='vm'||b.id==='vp'||b.id==='vbar'){uiVol=b.id==='vm'?cl(uiVol-.1,0,1):b.id==='vp'?cl(uiVol+.1,0,1):cl((uiX-168)/688,0,1);vol.value=uiVol;vol.oninput()}
 else{startTrack(b.id);uiTrack=b.id;uiPaused=false;uiMsg='Reproduciendo: '+b.t}
 drawUI()}
function go(en){busy=true;fade.style.opacity=1;setTimeout(()=>{
 if(en){inRoom=true;gardenG.visible=false;room.visible=true;scene.fog=new THREE.Fog(0,6,30);scene.background=new Color(0);pos.set(500,0,16);yaw=0;pitch=0;eye=1.6;vel.set(0,0,0);hud.textContent=''}
 else{inRoom=false;gardenG.visible=true;room.visible=false;scene.fog=gardenFog;scene.background=null;pos.set(DOOR.x,0,DOOR.z+2.4);yaw=Math.PI;pitch=-.05;eye=1.4;vel.set(0,0,0);nearD=false;hud.textContent=''}
 fade.style.opacity=0;setTimeout(()=>busy=false,900)},650)}
function doorCheck(){
 if(busy)return;
 if(!inRoom){const d=Math.hypot(pos.x-DOOR.x,pos.z-DOOR.z);if(d<1.15)go(true);nearD=d<7;}
 else if(pos.z<-18.2)go(false);
}
// música
let AC,gain,src,amb=[],abuf=null;const $=id=>document.getElementById(id),vol=$('vol'),mpanel=$('mp');
function ac(){if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();gain=AC.createGain();gain.gain.value=+vol.value;gain.connect(AC.destination)}AC.resume();$('pp').textContent='Pausar';return AC}
function stopAll(){try{src&&src.stop()}catch(e){}src=null;amb.forEach(n=>{try{n.stop()}catch(e){}});amb=[]}
$('mb').onclick=()=>mpanel.classList.toggle('on');
$('amb').onclick=()=>{ac();stopAll();[130.8,196,261.6,329.6,392].forEach((f,i)=>{const o=AC.createOscillator(),g=AC.createGain(),l=AC.createOscillator(),lg=AC.createGain();o.frequency.value=f;g.gain.value=.08;l.frequency.value=.07+i*.03;lg.gain.value=.05;l.connect(lg);lg.connect(g.gain);o.connect(g);g.connect(gain);o.start();l.start();amb.push(o,l)})};
$('mf').onchange=async e=>{const f=e.target.files[0];if(!f)return;ac();stopAll();try{abuf=await AC.decodeAudioData(await f.arrayBuffer());src=AC.createBufferSource();src.buffer=abuf;src.loop=true;src.connect(gain);src.start();uiTrack='file';uiPaused=false;uiMsg='Reproduciendo: '+f.name.slice(0,40);drawUI()}catch(x){uiMsg='No pude leer ese archivo de audio';drawUI()}};
$('pp').onclick=()=>{if(!AC)return;if(AC.state==='running'){AC.suspend();$('pp').textContent='Reanudar'}else{AC.resume();$('pp').textContent='Pausar'}};
vol.oninput=()=>{if(gain)gain.gain.value=+vol.value};
var formShown=false;
function startTrack(k){ac();stopAll();const C=AC;
 if(k==='sereno')[130.8,196,261.6,329.6,392].forEach((f,i)=>{const o=C.createOscillator(),g=C.createGain(),l=C.createOscillator(),lg=C.createGain();o.frequency.value=f;g.gain.value=.08;l.frequency.value=.07+i*.03;lg.gain.value=.05;l.connect(lg);lg.connect(g.gain);o.connect(g);g.connect(gain);o.start();l.start();amb.push(o,l)});
 if(k==='lluvia'){const b=C.createBuffer(1,C.sampleRate*2,C.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=C.createBufferSource();s.buffer=b;s.loop=true;const f=C.createBiquadFilter();f.type='lowpass';f.frequency.value=1800;const g=C.createGain();g.gain.value=.35;s.connect(f);f.connect(g);g.connect(gain);s.start();amb.push(s)}
 if(k==='cristal'||k==='pajaros'){const sc=[261.6,293.7,329.6,392,440,523.3,587.3];
  const id=setInterval(()=>{const t=C.currentTime,o=C.createOscillator(),g=C.createGain();
   if(k==='cristal'){o.frequency.value=sc[Math.random()*7|0]*(Math.random()<.3?.5:1);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.25,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+2.2);o.stop(t+2.3)}
   else{const f=2200+Math.random()*1800;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.4,t+.12);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.stop(t+.25)}
   o.connect(g);g.connect(gain);o.start(t)},k==='cristal'?900:1400);amb.push({stop:()=>clearInterval(id)})}
}
$('amb').onclick=()=>startTrack($('trk').value);
const _st=startTrack;
startTrack=function(k){if(k!=='arpa')return _st(k);ac();stopAll();const C=AC,sc=[220,261.6,293.7,329.6,392,440,523.3,587.3];let n=0;
 const id=setInterval(()=>{const t=C.currentTime,o=C.createOscillator(),g=C.createGain();o.type='triangle';o.frequency.value=sc[(n++*3+(Math.random()*3|0))%8];g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+2.4);o.connect(g);g.connect(gain);o.start(t);o.stop(t+2.5)},480);amb.push({stop:()=>clearInterval(id)})};
$('bn').onclick=()=>{todT=todT?0:1;$('bn').textContent=todT?'☀':'☾'};
// ---------- navegación 360° ----------
const keys={},btn={f:0,b:0},pos=new Vector3(0,0,30),vel=new Vector3();let yaw=0,pitch=-.08,eye=1.4;
addEventListener('keydown',e=>keys[e.code]=true);addEventListener('keyup',e=>keys[e.code]=false);
const bf=document.getElementById('bf'),bb=document.getElementById('bb');
[[bf,'f'],[bb,'b']].forEach(([el,k])=>{el.addEventListener('pointerdown',e=>{e.stopPropagation();btn[k]=1});['pointerup','pointerleave','pointercancel'].forEach(ev=>el.addEventListener(ev,()=>btn[k]=0))});
addEventListener('wheel',e=>{const d=-e.deltaY*.004;pos.x+=-Math.sin(yaw)*d;pos.z+=-Math.cos(yaw)*d},{passive:true});
function nav(dt){if(introNav(dt)||flyNav(dt))return;yaw+=turn*dt*1.5;
 const f=cl((keys.KeyW||keys.ArrowUp||btn.f?1:0)-(keys.KeyS||keys.ArrowDown||btn.b?1:0)+joy.y,-1,1),s=cl((keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joy.x,-1,1),sp=keys.ShiftLeft?4.5:2.2;
 const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw),k=Math.min(1,dt*6);
 vel.x+=((fx*f+rx*s)*sp-vel.x)*k;vel.z+=((fz*f+rz*s)*sp-vel.z)*k;pos.x+=vel.x*dt;pos.z+=vel.z*dt;
 eye=cl(eye+((keys.KeyE?1:0)-(keys.KeyQ?1:0))*dt*1.4,.25,4);
 if(inRoom){pos.x=cl(pos.x,497.4,502.6);pos.z=cl(pos.z,-19.2,19)}else{const r=Math.hypot(pos.x,pos.z);if(r>46){pos.x*=46/r;pos.z*=46/r}}
 cam.position.set(pos.x,eye,pos.z);cam.rotation.set(pitch,yaw,0,'YXZ');
}

// ---------- ratón / toque ----------
const ray=new THREE.Raycaster(),mp=new THREE.Vector2();ray.far=18;let hovered=null,down=null,drag=false,lx=0,ly=0;
function pick(e){mp.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mp,cam);const h=ray.intersectObjects(hits,false)[0];return h?h.object.userData.plant:null}
function setHover(p){if(p===hovered)return;hovered=p;hud.textContent=p?p.T.name:'';cv.style.cursor=p?'pointer':'grab'}
cv.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};drag=false;lx=e.clientX;ly=e.clientY;cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{
 if(down){if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)drag=true;
  if(drag){fly.on=false;yaw-=(e.clientX-lx)*.005;pitch=cl(pitch-(e.clientY-ly)*.005,-1.4,1.4)}lx=e.clientX;ly=e.clientY}
 else if(inRoom)uiMove(e);else setHover(pick(e));
});
cv.addEventListener('pointerup',e=>{
 if(down&&!drag&&inRoom)uiClick(e);
 if(down&&!drag&&!inRoom&&!intro.on&&signTap(e)){down=null;return}
 if(down&&!drag&&!inRoom&&!intro.on){const p=pick(e);if(p){const op=p.target<.6;p.target=op?1:.04;p.spinT+=op?TAU:-TAU;if(e.pointerType==='touch'){setHover(p);clearTimeout(window._ht);window._ht=setTimeout(()=>setHover(null),2500)}}else{mp.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mp,cam);const b=ray.intersectObjects(beds,false)[0];if(b)addAt(b.object.userData.ti,b.point.x,b.point.z)}}
 down=null;
});
cv.addEventListener('pointerleave',()=>{if(!down)setHover(null)});

function resize(){renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

let last=performance.now();
function loop(now){
 requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;const t=now/1000;
 nav(dt);grassMat.uniforms.uT.value=t;portalMat.uniforms.uT.value=t;for(const x of wallT)x.offset.x+=dt*.04;for(const x of flatT)x.offset.y+=dt*.04;doorCheck();fx(dt,t);if(!intro.go&&++warmF>8)beginIntro();
 for(const p of plants){p.hov+=((p===hovered?1:0)-p.hov)*(1-Math.exp(-dt*6));updPlant(p,dt,t)}
 const a=pg.attributes.position;for(let i=0;i<PN;i++){a.array[i*3]+=Math.sin(t*.3+i)*.002;a.array[i*3+1]+=Math.cos(t*.5+i*1.3)*.0015;a.array[i*3+2]+=Math.cos(t*.25+i*.7)*.002}a.needsUpdate=true;
 renderer.render(scene,cam);
}
renderer.compile(scene,cam);
requestAnimationFrame(loop);
