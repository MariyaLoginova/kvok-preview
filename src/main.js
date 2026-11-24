import { cover, media, projects, still, wallFrame, wallProject } from './projects.js';

export function mountPortfolio({ doc=document, base=new URL('./',doc.baseURI), forceFallback=false }={}) {
  const get = sel => doc.querySelector(sel);
  const root=get('[data-portfolio]'), host=get('[data-scene]'), canvas=get('[data-canvas]');
  const list=get('[data-project-list]'), fallback=get('[data-fallback]'), fallbackWall=get('[data-wall]');
  const index=get('[data-index]'), indexToggle=get('[data-index-toggle]');
  const count=get('[data-count]'), title=get('[data-title]'), category=get('[data-category]');
  const dialog=get('[data-detail]'), detailTitle=get('[data-detail-title]');
  const detailBody=get('[data-detail-body]'), detailKicker=get('[data-detail-kicker]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const compact=matchMedia('(max-width: 700px)');
  const touch=matchMedia('(pointer: coarse)');
  const pad = n => String(n).padStart(2,'0');
  let gallery, active=0, captionFX, pointer, video, openTrigger;
  let wheelTotal=0, wheelAt=-Infinity, wheelLastAt=-Infinity;
  const buttons=projects.map((p,i)=>{
    const el=doc.createElement('button');
    el.type='button';
    el.textContent=p.indexTitle || p.title;
    el.addEventListener('click',()=>{ select(i); setIndex(false); });
    const li=doc.createElement('li');
    li.append(el); list.append(li);
    return el;
  });
  const setIndex = (open) => {
    index.classList.toggle('open',open);
    indexToggle.setAttribute('aria-expanded',String(!compact.matches || open));
  };
  setIndex(false);
  compact.addEventListener('change',()=>setIndex(false));
  const gesture=get('[data-gesture]');
  const hint=()=>gesture.textContent=touch.matches ? 'Смахните, чтобы листать' : 'Листайте или перетаскивайте';
  hint();
  touch.addEventListener('change',hint);
  indexToggle.addEventListener('click',()=>{
    if (compact.matches) setIndex(!index.classList.contains('open'));
    else buttons[active].focus();
  });

  function populateFallback() {
    if (fallbackWall.childElementCount) return;
    for (let row=0;row<5;row++) for (let col=0;col<9;col++) {
      const p=projects[wallProject(row,col,false)], img=doc.createElement('img');
      img.src=still(base,p,wallFrame(row,col,p)); img.alt=''; img.decoding='async';
      fallbackWall.append(img);
    }
  }
  function showFallback() {
    gallery=null;
    root.classList.remove('webgl');
    populateFallback();
    fallback.src=cover(base,projects[active]);
  }
  function showCaption(i, animate) {
    const p=projects[i];
    title.textContent=p.title;
    title.toggleAttribute('data-long',p.title.length>17);
    category.textContent=p.category;
    count.textContent=`${pad(i+1)} / ${pad(projects.length)}`;
    buttons.forEach((button,n)=>n===i ? button.setAttribute('aria-current','true') : button.removeAttribute('aria-current'));
    if (compact.matches && index.contains(doc.activeElement)) indexToggle.focus();
    captionFX?.cancel();
    if (animate && !reduced.matches) {
      captionFX=title.parentElement.animate([{opacity:.43,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:430,easing:'cubic-bezier(.2,.8,.3,1)'});
    }
  }
  function select(i, slot) {
    i=(i+projects.length)%projects.length;
    if (active===i && !slot) return;
    active=i;
    gallery?.activate(i,slot);
    fallback.src=cover(base,projects[i]);
    showCaption(i,true);
  }
  showCaption(0,false);
  get('[data-prev]').addEventListener('click',()=>select(active-1));
  get('[data-next]').addEventListener('click',()=>select(active+1));

  function showDetail(contact=false, trigger=doc.activeElement) {
    if (dialog.open) return;
    openTrigger=trigger;
    const p=projects[active];
    detailBody.replaceChildren();
    if (contact) {
      detailTitle.textContent='Контакты';
      detailKicker.textContent='KVOK Production';
      const contactLink=doc.createElement('a');
      contactLink.className='contact-link';
      contactLink.href='https://mariyaloginova.github.io/kvok-preview/contacts/';
      contactLink.textContent='Страница контактов KVOK ↗';
      detailBody.append(contactLink);
    } else {
      detailTitle.textContent=p.title;
      detailKicker.textContent=`${pad(active+1)} / ${pad(projects.length)} · ${p.category}`;
      if (p.video) {
        video=doc.createElement('video');
        video.controls=true; video.playsInline=true; video.preload='none';
        video.poster=cover(base,p);
        video.src=media(base,`${p.id}.mp4`);
        detailBody.append(video);
      } else {
        const grid=doc.createElement('div');
        grid.className='detail-gallery';
        for (let i=0;i<p.frames;i++) {
          const img=doc.createElement('img');
          img.loading=i ? 'lazy' : 'eager'; img.decoding='async';
          img.alt=`${p.title} — кадр ${i+1}`;
          img.src=i ? still(base,p,i) : cover(base,p);
          grid.append(img);
        }
        detailBody.append(grid);
      }
    }
    setIndex(false);
    dialog.showModal();
    gallery?.pause(true);
  }
  get('[data-case]').addEventListener('click',e=>showDetail(false,e.currentTarget));
  get('[data-contact]').addEventListener('click',e=>showDetail(true,e.currentTarget));
  dialog.addEventListener('click',e=>{ if (e.target===dialog) dialog.close(); });
  dialog.addEventListener('close',()=>{
    if (video) { video.pause(); video.removeAttribute('src'); video.load(); video=null; }
    detailBody.replaceChildren();
    gallery?.pause(false);
    openTrigger?.focus();
  });
  doc.addEventListener('visibilitychange',()=>{ if (doc.hidden && video) video.pause(); });
  doc.addEventListener('keydown',e=>{
    if (dialog.open || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key==='Escape' && compact.matches && index.classList.contains('open')) { setIndex(false); indexToggle.focus(); return; }
    if (['ArrowUp','ArrowDown','ArrowRight','ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      select(active+(['ArrowDown','ArrowRight'].includes(e.key) ? 1 : -1));
    }
  });
  root.addEventListener('wheel',e=>{
    if (dialog.open || e.ctrlKey || (compact.matches && index.classList.contains('open'))) return;
    e.preventDefault();
    const delta=(Math.abs(e.deltaX)>Math.abs(e.deltaY) ? e.deltaX : e.deltaY)*(e.deltaMode===1 ? 16 : e.deltaMode===2 ? innerHeight : 1);
    const now=performance.now();
    if (now-wheelLastAt>150 || Math.sign(wheelTotal)!==Math.sign(delta)) wheelTotal=0;
    wheelLastAt=now;
    if (now-wheelAt<470) return;
    wheelTotal+=delta;
    if (Math.abs(wheelTotal)>=30) {
      select(active+Math.sign(wheelTotal)); wheelAt=now; wheelTotal=0;
    }
  },{passive:false});
  host.addEventListener('pointerdown',e=>{
    if (e.button!==0 || pointer) return;
    pointer={id:e.pointerId,x:e.clientX,y:e.clientY,last:e.clientX,touch:e.pointerType==='touch',moved:false};
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove',e=>{
    if (pointer?.id===e.pointerId) {
      if (Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>7) pointer.moved=true;
      if (pointer.moved) gallery?.drag((e.clientX-pointer.last)*(pointer.touch ? .52 : 1));
      pointer.last=e.clientX;
    } else if (e.pointerType==='mouse') {
      const r=host.getBoundingClientRect();
      gallery?.look((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
    }
  });
  host.addEventListener('pointerup',e=>{
    if (pointer?.id!==e.pointerId) return;
    const p=pointer;
    pointer=null;
    if (p.moved) {
      const dx=e.clientX-p.x, dy=e.clientY-p.y;
      const delta=Math.abs(dx)>Math.abs(dy) ? dx : dy;
      if (p.touch && Math.abs(delta)>38) select(active-Math.sign(delta));
      return;
    }
    const hit=gallery?.pick(e.clientX,e.clientY);
    if (hit?.active) showDetail(false,get('[data-case]'));
    else if (hit) select(hit.index,hit.slot);
  });
  host.addEventListener('lostpointercapture',()=>{ pointer=null; });
  host.addEventListener('pointerleave',()=>gallery?.look(0,0));

  if (forceFallback) showFallback();
  else import('./gallery.js').then(({createGallery})=>{
    gallery=createGallery({host,canvas,base,reduced,onFallback:showFallback});
    if (!gallery) showFallback();
    else {
      if (active) gallery.activate(active,null,true);
      if (dialog.open) gallery.pause(true);
    }
  }).catch(showFallback);
}

mountPortfolio({forceFallback:new URLSearchParams(location.search).has('fallback')});
