import * as T from 'three';
import { gsap } from 'gsap/gsap-core.js';
import { cover, projects, still, wallFrame, wallProject } from './projects.js';
import { cameraPose, featurePose, fov, tilePose, wallRows } from './composition.js';

const ease = gsap.parseEase('power2.inOut');
const v = () => new T.Vector3();
const q = () => new T.Quaternion();

function panelGeometry() {
  const s = new T.Shape(), r = .014, x = .5, y = 9/32;
  s.moveTo(-x+r,-y); s.lineTo(x-r,-y); s.quadraticCurveTo(x,-y,x,-y+r);
  s.lineTo(x,y-r); s.quadraticCurveTo(x,y,x-r,y);
  s.lineTo(-x+r,y); s.quadraticCurveTo(-x,y,-x,y-r);
  s.lineTo(-x,-y+r); s.quadraticCurveTo(-x,-y,-x+r,-y);
  const geo = new T.ShapeGeometry(s, 4);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i=0;i<p.count;i++) uv.setXY(i,p.getX(i)+.5,(p.getY(i)+y)/(2*y));
  return geo;
}

export function createGallery({host, canvas, base, reduced, onFallback}) {
  const context = canvas.getContext('webgl2', {alpha:false, antialias:true, powerPreference:'low-power'});
  if (!context) return null;
  const renderer = new T.WebGLRenderer({canvas, context});
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  scene.background = new T.Color('#171412');
  const rig = new T.Group();
  scene.add(rig);
  const camera = new T.PerspectiveCamera(fov, 1, .1, 90);
  const meshGeometry = panelGeometry();
  const floorGeometry = new T.PlaneGeometry(140,140);
  const floorMaterial = new T.ShaderMaterial({
    vertexShader: `
      varying vec3 area;
      void main(){
        area=(modelMatrix*vec4(position,1.)).xyz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
      }`,
    fragmentShader: `
      varying vec3 area;
      void main(){
        vec2 p=area.xz;
        float spread=exp(-dot((p-vec2(-1.5,-6.))/vec2(7.,5.5),(p-vec2(-1.5,-6.))/vec2(7.,5.5)));
        float soft=exp(-length((p-vec2(-4.,-7.))/vec2(15.,10.)));
        float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)*.004;
        vec3 color=vec3(.019,.016,.014)+vec3(.123,.102,.076)*spread+vec3(.019,.015,.010)*soft+grain;
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`,
  });
  const floor = new T.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI/2;
  floor.position.y = -3.95;
  scene.add(floor);

  const loader = new T.TextureLoader(), textures = new Map();
  let raf = 0, dead = false, suspended = false, drawUntil = 0;
  let width = 1, height = 1, mobile, selected = 0, active = null, high = null, loadToken = 0;
  let panels = [], highReady = false, ready = false, loadedThumbnails = 0;
  const flying = new Set();
  const pointer = new T.Vector2(), raycaster = new T.Raycaster(), ndc = new T.Vector2();
  const camLocal = v(), destPos = v(), destQ = q();
  let yaw = 0, yawTarget = 0, currentX = 0, currentY = 0;

  function invalidate(extra=0) {
    drawUntil = Math.max(drawUntil,performance.now()+extra);
    if (!raf && !dead && !suspended && !document.hidden) raf=requestAnimationFrame(tick);
  }
  function thumb(index,frame) {
    const url=still(base,projects[index],frame);
    if (!textures.has(url)) {
      const texture=loader.load(url,() => { loadedThumbnails++; invalidate(); });
      texture.colorSpace=T.SRGBColorSpace;
      texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      textures.set(url,texture);
    }
    return textures.get(url);
  }
  function material(texture, tone) {
    return new T.MeshBasicMaterial({map:texture,color:new T.Color(tone,tone,tone),toneMapped:false});
  }
  function layout() {
    for (const p of panels) { rig.remove(p); p.material.dispose(); }
    panels=[];
    const columns=mobile ? 9 : 11;
    for (const row of wallRows.keys()) {
      for (let col=0;col<columns;col++) {
        const index=wallProject(row,col,mobile), frame=wallFrame(row,col,projects[index]);
        const {position,rotation,scale,tone}=tilePose(row,col,mobile);
        const mesh=new T.Mesh(meshGeometry,material(thumb(index,frame),tone));
        mesh.position.copy(position); mesh.rotation.copy(rotation); mesh.scale.copy(scale);
        mesh.userData={index,frame,row,col,tone};
        panels.push(mesh);
        rig.add(mesh);
      }
    }
    rig.updateMatrixWorld(true);
  }
  function home(index, candidate) {
    if (candidate && panels.includes(candidate)) return candidate;
    const center=mobile ? 3 : 4;
    return panels.filter(p=>p.userData.index===index).reduce((best,p)=>{
      const score=m=>Math.abs(m.userData.row-2)*1.5 + Math.abs(m.userData.col-center);
      return !best || score(p)<score(best) ? p : best;
    },null);
  }
  function remove(item) {
    flying.delete(item);
    scene.remove(item.mesh);
    item.mesh.material.dispose();
    if (![...flying].some(other=>other.home===item.home)) item.home.visible=true;
  }
  function move(item, out, immediate) {
    const m=item.mesh;
    item.from={pos:m.position.clone(),quat:m.quaternion.clone(),scale:m.scale.clone(),tone:m.material.color.r};
    item.out=out;
    item.start=performance.now();
    item.duration=immediate || reduced.matches ? 0 : out ? 1000 : 800;
    invalidate(item.duration+50);
  }
  function placeAtHome(item, pos, rot) {
    item.home.getWorldPosition(pos);
    item.home.getWorldQuaternion(rot);
  }
  function activate(index, candidate, immediate=false) {
    if (active && selected===index && !candidate) return;
    const old=active;
    if (old) {
      old.mesh.material.map=thumb(old.index,old.home.userData.frame);
      move(old,false,immediate);
    }
    if (high) { high.dispose(); high=null; }
    selected=index;
    const slot=home(index,candidate), token=++loadToken;
    const mesh=new T.Mesh(meshGeometry,material(thumb(index,slot.userData.frame),slot.userData.tone));
    const item={mesh,home:slot,index};
    placeAtHome(item,mesh.position,mesh.quaternion);
    mesh.scale.copy(slot.scale);
    flying.add(item);
    slot.visible=false;
    scene.add(mesh);
    active=item;
    move(item,true,immediate);
    loader.load(cover(base,projects[index]), texture=>{
      if (dead || loadToken!==token) { texture.dispose(); return; }
      texture.colorSpace=T.SRGBColorSpace;
      texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      high=texture;
      mesh.material.map=texture;
      highReady=true;
      invalidate();
    }, undefined, () => { highReady=true; invalidate(); });
  }
  function resize() {
    const rect=host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width=rect.width; height=rect.height;
    const compact=width<=700;
    if (!panels.length || compact!==mobile) {
      mobile=compact;
      for (const item of [...flying]) remove(item);
      active=null;
      layout();
      activate(selected,null,true);
    }
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,mobile ? 1.35 : 1.6));
    renderer.setSize(width,height,false);
    invalidate();
  }
  let lastTick=0;
  function tick(now) {
    raf=0;
    if (dead || suspended || document.hidden) { lastTick=0; return; }
    const dt=lastTick ? Math.min(.06,(now-lastTick)/1000) : .016;
    lastTick=now;
    const damping=reduced.matches ? 1 : 1-Math.exp(-9*dt);
    yaw=T.MathUtils.lerp(yaw,yawTarget,damping);
    currentX=T.MathUtils.lerp(currentX,reduced.matches ? 0 : pointer.x,damping);
    currentY=T.MathUtils.lerp(currentY,reduced.matches ? 0 : pointer.y,damping);
    rig.rotation.y=yaw;
    rig.updateMatrixWorld(true);
    cameraPose(camera,mobile,currentX,currentY);
    camera.updateMatrixWorld();
    const {width:frontWidth,heightScale,position:frontPos,rotation:frontQ}=featurePose(camera,mobile);
    for (const item of flying) {
      const raw=item.duration ? T.MathUtils.clamp((now-item.start)/item.duration,0,1) : 1;
      const progress=ease(raw);
      if (item.out) {
        destPos.copy(frontPos); destQ.copy(frontQ);
        item.mesh.scale.copy(item.from.scale).lerp(camLocal.set(frontWidth,heightScale,1),progress);
      } else {
        placeAtHome(item,destPos,destQ);
        item.mesh.scale.copy(item.from.scale).lerp(item.home.scale,progress);
      }
      item.mesh.position.copy(item.from.pos).lerp(destPos,progress);
      item.mesh.quaternion.copy(item.from.quat).slerp(destQ,progress);
      item.mesh.material.color.setScalar(T.MathUtils.lerp(item.from.tone,item.out ? 1 : item.home.userData.tone,progress));
      item.mesh.updateMatrixWorld();
      if (!item.out && raw>=1) remove(item);
    }
    renderer.render(scene,camera);
    if (highReady && loadedThumbnails>=Math.min(8,textures.size) && !ready) {
      ready=true;
      host.closest('[data-portfolio]').classList.add('webgl');
    }
    if (now<drawUntil) invalidate(); else lastTick=0;
  }
  const observer=new ResizeObserver(resize);
  observer.observe(host);
  function visibility() {
    if (document.hidden) { cancelAnimationFrame(raf); raf=0; lastTick=0; }
    else invalidate(100);
  }
  document.addEventListener('visibilitychange',visibility);
  reduced.addEventListener('change',visibility);
  function dispose() {
    dead=true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    document.removeEventListener('visibilitychange',visibility);
    reduced.removeEventListener('change',visibility);
    canvas.removeEventListener('webglcontextlost',contextLost);
    meshGeometry.dispose(); floorGeometry.dispose(); floorMaterial.dispose();
    for (const mesh of panels) mesh.material.dispose();
    for (const item of flying) item.mesh.material.dispose();
    for (const texture of textures.values()) texture.dispose();
    high?.dispose();
    renderer.dispose();
  }
  function contextLost(event) {
    event.preventDefault();
    dispose();
    onFallback();
  }
  canvas.addEventListener('webglcontextlost',contextLost);
  resize();
  return {
    activate,
    look(x,y) { pointer.set(x,y); if (!reduced.matches) invalidate(600); },
    drag(delta) { yawTarget=T.MathUtils.clamp(yawTarget+delta*.0025,-.39,.39); invalidate(620); },
    pick(x,y) {
      if (!ready) return null;
      const r=host.getBoundingClientRect();
      ndc.set(((x-r.left)/width)*2-1,-((y-r.top)/height)*2+1);
      raycaster.setFromCamera(ndc,camera);
      const hit=raycaster.intersectObjects([...panels.filter(p=>p.visible),...(active ? [active.mesh] : [])],false)[0]?.object;
      return hit===active?.mesh ? {active:true} : hit ? {index:hit.userData.index,slot:hit} : null;
    },
    pause(pause) {
      suspended=pause;
      if (pause) { cancelAnimationFrame(raf); raf=0; lastTick=0; }
      else invalidate(150);
    },
    dispose,
  };
}
