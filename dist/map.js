(() => {
  "use strict";
  const host = document.getElementById("map");
  const [states, neighbors, lakes] = window.COFFEE_GEO;
  const canvas = document.createElement("canvas");
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "US coffee locations. Drag or use arrow keys to pan, plus and minus to zoom. Click a dot for stores.");
  Object.assign(canvas.style, {width:"100%",height:"100%",display:"block",touchAction:"none",cursor:"grab",position:"absolute",inset:"0"});
  host.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const popup = document.createElement("section");
  popup.className = "store-popup";
  popup.setAttribute("aria-label", "Mapped stores");
  Object.assign(popup.style, {position:"absolute",zIndex:"6",width:"min(248px, 88%)",background:"#fffdf7",color:"#2f392f",border:"1px solid #b8c0a9",borderRadius:"10px",boxShadow:"0 6px 22px #35452b29",padding:"14px",font:"13px/1.45 system-ui",maxHeight:"60%",overflowY:"auto",boxSizing:"border-box"});
  popup.hidden = true;
  host.append(popup);

  const rad = Math.PI/180;
  const n = (Math.sin(29.5*rad)+Math.sin(45.5*rad))/2;
  const C = Math.cos(29.5*rad)**2+2*n*Math.sin(29.5*rad);
  const rho0 = Math.sqrt(C-2*n*Math.sin(38*rad))/n;
  function project(lon,lat,region="") {
    if(region==="AK") {
      if(lon>0) lon -= 360;
      return [-323 + (lon+151)*2.18, 164 - (lat-62)*5.2];
    }
    if(region==="HI") return [-222 + (lon+157.3)*7.8, 174 - (lat-21)*8.2];
    const rho = Math.sqrt(C-2*n*Math.sin(lat*rad))/n;
    const a = n*(lon+96)*rad;
    return [1000*rho*Math.sin(a),1000*(rho*Math.cos(a)-rho0)];
  }
  function pathOf(rings,region) {
    const path = new Path2D();
    const bounds = [Infinity,Infinity,-Infinity,-Infinity];
    for(const ring of rings) {
      if(region==="HI" && ring.every(([lon])=>lon < -161)) continue;
      ring.forEach(([lon,lat],i)=>{
        const [x,y] = project(lon,lat,region);
        if(i===0) path.moveTo(x,y); else path.lineTo(x,y);
        bounds[0]=Math.min(bounds[0],x); bounds[1]=Math.min(bounds[1],y);
        bounds[2]=Math.max(bounds[2],x); bounds[3]=Math.max(bounds[3],y);
      });
      path.closePath();
    }
    return {path,bounds};
  }
  const features = Object.entries(states).map(([code,[name,rings]]) => ({...pathOf(rings,code),code,name}));
  const adjacent = Object.values(neighbors).map(rings => pathOf(rings).path);
  const lakePath = pathOf(lakes).path;
  const codes = Object.fromEntries(features.map(f=>[f.name.toLowerCase(), f.code]));
  const stateCode = v=>codes[String(v).toLowerCase()]||String(v).toUpperCase();
  const labelCoords = {WA:[-120.6,47.3],OR:[-120.8,44],CA:[-119.7,36.8],NV:[-116.8,39.4],ID:[-114.5,44.1],MT:[-110,47],WY:[-107.5,43.1],UT:[-111.7,39.3],CO:[-105.5,39],AZ:[-111.8,34.2],NM:[-106,34.5],ND:[-100.5,47.4],SD:[-100.3,44.4],NE:[-99.8,41.6],KS:[-98.4,38.5],OK:[-97.4,35.6],TX:[-99.7,31.5],MN:[-94.5,46.4],IA:[-93.5,42.1],MO:[-92.5,38.5],AR:[-92.5,34.9],LA:[-92.6,31.1],WI:[-89.9,44.6],IL:[-89.1,40.1],MI:[-84.8,43.8],IN:[-86.1,40],OH:[-82.8,40.3],KY:[-85.2,37.7],TN:[-86,35.9],MS:[-89.8,32.8],AL:[-86.9,32.8],GA:[-83.5,32.5],FL:[-81.9,28],SC:[-80.9,33.7],NC:[-79.8,35.6],VA:[-79,37.5],WV:[-80.7,38.6],PA:[-77.7,41],NY:[-75.7,42.9],ME:[-69.1,45.5],VT:[-72.7,44],NH:[-71.6,43.7],MA:[-72,42.35],CT:[-72.7,41.55],RI:[-71.55,41.71],NJ:[-74.6,40],DE:[-75.52,39],MD:[-76.9,39.15],DC:[-77.03,38.9]};
  const cities = [["Seattle",-122.33,47.61],["Portland",-122.68,45.52],["San Francisco",-122.42,37.77],["Los Angeles",-118.24,34.05],["Phoenix",-112.07,33.45],["Denver",-104.99,39.74],["Dallas",-96.8,32.78],["Houston",-95.37,29.76],["Minneapolis",-93.27,44.98],["Chicago",-87.63,41.88],["Detroit",-83.05,42.33],["Atlanta",-84.39,33.75],["Miami",-80.19,25.76],["New York",-74.01,40.71],["Boston",-71.06,42.36],["Washington",-77.04,38.91],["Nashville",-86.78,36.16],["Salt Lake City",-111.89,40.76],["Kansas City",-94.58,39.1]];
  let w=1,h=1,base=1,zoom=1,tX=0,tY=0,data=[],colors={},hits=[],pending=false;
  const water="#d8e6e4", land="#eeeede", stroke="#b3bbab";
  function scale(){return base*zoom;}
  function screen(x,y){return [w/2+tX+x*scale(),h/2+tY+y*scale()];}
  function schedule(){if(!pending){pending=true;requestAnimationFrame(draw);}}
  function label(value,x,y,px,color,spacing=false) {
    ctx.font=(spacing?"500 ":"400 ")+px+"px Arial, sans-serif";
    ctx.textAlign="center"; ctx.fillStyle=color;
    ctx.fillText(spacing?value.split("").join("\u2009"):value,x,y);
  }
  function draw() {
    pending=false;
    const dpr=window.devicePixelRatio||1;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle=water;ctx.fillRect(0,0,w,h);
    const s=scale();
    ctx.save(); ctx.translate(w/2+tX,h/2+tY);ctx.scale(s,s);
    ctx.lineJoin="round";
    ctx.lineWidth=.8/s;
    ctx.fillStyle="#e8e9d9";ctx.strokeStyle=stroke;
    for(const p of adjacent){ctx.fill(p,"evenodd");ctx.stroke(p);}
    for(const f of features) {
      if(f.code==="AK"||f.code==="HI") continue;
      ctx.fillStyle=land;ctx.fill(f.path,"evenodd");ctx.strokeStyle=stroke;ctx.stroke(f.path);
    }
    ctx.fillStyle=water;ctx.fill(lakePath,"evenodd");ctx.strokeStyle="#b8ceca";ctx.lineWidth=.55/s;ctx.stroke(lakePath);
    ctx.restore();
    function geoLabel(name,lon,lat,size,color,spacing=true){const [x,y]=screen(...project(lon,lat));label(name,x,y,size,color,spacing);}
    geoLabel("C A N A D A",-107.5,51.6,12,"#8d9986",false);
    geoLabel("M E X I C O",-103.2,25.3,12,"#8d9986",false);
    geoLabel("Pacific Ocean",-128.3,36.3,12,"#839f9e",false);
    geoLabel("Atlantic Ocean",-70.7,32.4,12,"#839f9e",false);
    geoLabel("Gulf of Mexico",-90,25.4,12,"#839f9e",false);
    for(const f of features) {
      if(!labelCoords[f.code]) continue;
      if(zoom<2.6 && ["NJ","MD","DE","DC","CT","RI","MA","VT","NH"].includes(f.code)) continue;
      const [lon,lat]=labelCoords[f.code];
      geoLabel(zoom>3?f.name.toUpperCase():f.code,lon,lat,zoom>3?10:9,"#87907f");
    }
    if(zoom>1.8) for(const [name,lon,lat] of cities) geoLabel(name,lon,lat,11,"#646f62",false);
    for(const [region,bounds] of [["AK",[-400,111, -278,225]],["HI",[-269,142,-181,225]]]) {
      const f=features.find(val=>val.code===region);
      const [x,y]=screen(bounds[0],bounds[1]);const rw=(bounds[2]-bounds[0])*s,rh=(bounds[3]-bounds[1])*s;
      if(x>w||y>h||x+rw<0||y+rh<0)continue;
      ctx.save();ctx.beginPath();ctx.rect(x,y,rw,rh);ctx.clip();
      ctx.fillStyle=water;ctx.fillRect(x,y,rw,rh);
      ctx.save();ctx.translate(w/2+tX,h/2+tY);ctx.scale(s,s);
      ctx.fillStyle=land;ctx.fill(f.path,"evenodd");ctx.strokeStyle=stroke;ctx.lineWidth=.75/s;ctx.stroke(f.path);ctx.restore();
      ctx.strokeStyle="#adbfba";ctx.lineWidth=.7;ctx.strokeRect(x+.5,y+.5,rw-1,rh-1);
      label(region==="AK"?"ALASKA":"HAWAII",x+rw*.5,y+rh-Math.min(9,3*s),Math.max(7,Math.min(10,8*s)),"#61746e",true);
      ctx.restore();
    }
    const cell=Math.max(5,Math.min(12,8+Math.log2(zoom)));
    const bins=new Map();let visible=0;
    for(const pt of data) {
      const [x,y]=screen(pt.x,pt.y);
      if(x<-6||x>w+6||y<-6||y>h+6) continue;
      visible++;
      const key=Math.floor(x/cell)+","+Math.floor(y/cell);
      let b=bins.get(key);
      if(!b){b={x:0,y:0,rows:[],by:new Map()};bins.set(key,b);}
      b.x+=x;b.y+=y;b.rows.push(pt.row);b.by.set(pt.row[0],(b.by.get(pt.row[0])||0)+1);
    }
    hits=[];
    for(const b of bins.values()) {
      const count=b.rows.length;b.x/=count;b.y/=count;
      b.radius=Math.min(8,2.7+Math.log2(count+1)*.61);
      if(zoom>8)b.radius=Math.max(4,b.radius);
      let start=-Math.PI/2;
      for(const [brand,num] of b.by) {
        const end=start+num/count*2*Math.PI;
        ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.arc(b.x,b.y,b.radius,start,end);ctx.closePath();
        ctx.fillStyle=colors[brand]||"#316a4b";ctx.fill();start=end;
      }
      ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,2*Math.PI);ctx.strokeStyle="#fffdf2";ctx.lineWidth=.85;ctx.stroke();hits.push(b);
    }
    if(typeof api.onView==="function")api.onView({zoom,visible});
  }
  function closePopup(){popup.hidden=true;}
  function changeZoom(mult,x=w/2,y=h/2) {
    const prev=zoom;zoom=Math.max(.75,Math.min(8192,zoom*mult));
    const ratio=zoom/prev;
    tX=x-w/2-(x-w/2-tX)*ratio;tY=y-h/2-(y-h/2-tY)*ratio;
    closePopup();schedule();
  }
  function reset(){zoom=1;tX=0;tY=0;closePopup();schedule();}
  function center(x,y){tX=-x*scale();tY=-y*scale();}
  function showStores(rows,x,y) {
    popup.replaceChildren();
    const close=document.createElement("button");close.type="button";close.textContent="×";close.setAttribute("aria-label","Close store details");
    Object.assign(close.style,{float:"right",font:"20px/1 system-ui",cursor:"pointer",color:"#455142",border:"none",background:"transparent"});
    close.onclick=closePopup;popup.append(close);
    if(rows.length>1){
      const head=document.createElement("strong");head.textContent=rows.length.toLocaleString()+" locations";popup.append(head);
    }
    for(const row of rows){
      const block=document.createElement("div");block.style.padding=rows.length>1?"8px 0":"0";
      const name=document.createElement("strong");name.textContent=row[0];block.append(name);
      const addr=document.createElement("div");addr.textContent=[row[3],row[4],row[5]].filter(Boolean).join(", ");
      block.append(addr);
      if(!row[3]&&!row[4]){const coords=document.createElement("small");coords.textContent=Number(row[1]).toFixed(4)+", "+Number(row[2]).toFixed(4);block.append(coords);}
      popup.append(block);
    }
    popup.hidden=false;
    popup.style.left=Math.max(5,Math.min(x+12,w-popup.offsetWidth-6))+"px";
    popup.style.top=Math.max(5,Math.min(y+10,h-popup.offsetHeight-6))+"px";
  }
  function hitAt(x,y){return hits.reduce((best,b)=>{const dist=Math.hypot(x-b.x,y-b.y);return dist<=Math.max(7,b.radius+2)&&(!best||dist<best.dist)?{b,dist}:best;},null)?.b;}
  function clickAt(x,y) {
    const b=hitAt(x,y);if(!b){closePopup();return;}
    if(b.rows.length>12&&zoom<2000) {
      const px=(b.x-w/2-tX)/scale(),py=(b.y-h/2-tY)/scale();
      zoom=Math.min(8192,zoom*3);center(px,py);closePopup();schedule();return;
    }
    showStores(b.rows,b.x,b.y);
  }
  const pointers=new Map();let down=null,dragged=false;
  function local(e){const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
  canvas.onpointerdown=e=>{if(e.button!==0)return;const pos=local(e);pointers.set(e.pointerId,pos);canvas.setPointerCapture(e.pointerId);if(pointers.size===1){down=pos;dragged=false;}else dragged=true;canvas.style.cursor="grabbing";};
  canvas.onpointermove=e=>{
    const pos=local(e),prev=pointers.get(e.pointerId);
    if(!prev){canvas.style.cursor=hitAt(...pos)?"pointer":"grab";return;}
    if(pointers.size===2){
      const other=[...pointers].find(([id])=>id!==e.pointerId)[1];
      const oldDist=Math.hypot(prev[0]-other[0],prev[1]-other[1]),newDist=Math.hypot(pos[0]-other[0],pos[1]-other[1]);
      if(oldDist>0) changeZoom(newDist/oldDist,(other[0]+prev[0])/2,(other[1]+prev[1])/2);
      tX+=(pos[0]-prev[0])/2;tY+=(pos[1]-prev[1])/2;
    }else {
      tX+=pos[0]-prev[0];tY+=pos[1]-prev[1];
      if(down&&Math.hypot(pos[0]-down[0],pos[1]-down[1])>3)dragged=true;
    }
    pointers.set(e.pointerId,pos);if(dragged)closePopup();schedule();
  };
  canvas.onpointerup=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(!dragged)clickAt(...local(e));canvas.style.cursor="grab";};
  canvas.onpointercancel=e=>{pointers.delete(e.pointerId);dragged=true;};
  canvas.addEventListener("wheel",e=>{e.preventDefault();changeZoom(Math.exp(-Math.max(-400,Math.min(400,e.deltaY))*.0018),...local(e));},{passive:false});
  canvas.onkeydown=e=>{
    const shifts={ArrowLeft:[55,0],ArrowRight:[-55,0],ArrowUp:[0,55],ArrowDown:[0,-55]};
    if(e.key in shifts){e.preventDefault();tX+=shifts[e.key][0];tY+=shifts[e.key][1];closePopup();schedule();}
    if(["+","=","-"].includes(e.key)){e.preventDefault();changeZoom(e.key==="-"?1/1.5:1.5);}
    if(e.key==="Home")reset();if(e.key==="Escape")closePopup();
  };
  const api=window.atlasMap={
    setData(rows,palette){
      colors=palette||{};data=rows.map(row=>{const [x,y]=project(Number(row[2]),Number(row[1]),stateCode(row[5]));return {x,y,row};});
      closePopup();schedule();
    },
    reset,zoomBy:changeZoom,
    focusState(state) {
      const code=stateCode(state);const f=features.find(f=>f.code===code);if(!f){reset();return;}
      const [x0,y0,x1,y1]=f.bounds;
      zoom=Math.max(1,Math.min(220,.77*Math.min(w/(x1-x0),h/(y1-y0))/base));
      center((x0+x1)/2,(y0+y1)/2);closePopup();schedule();
    },
    focusLocation(row){const p=project(Number(row[2]),Number(row[1]),stateCode(row[5]));zoom=70;center(...p);schedule();showStores([row],w/2,h/2);},
    onView:null
  };
  function resize(){
    const old=base;w=host.clientWidth||1;h=host.clientHeight||1;
    base=Math.min(w/875,h/540);tX*=base/old;tY*=base/old;
    const dpr=window.devicePixelRatio||1;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    schedule();
  }
  new ResizeObserver(resize).observe(host);resize();
})();

