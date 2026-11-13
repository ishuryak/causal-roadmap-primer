import {COMPONENTS,assess} from './bleile-model.mjs';

// Equal-angle kite wedges have area valley * sin(pi/n) * radius^2.
// radius = maxRadius * sqrt(dings/10), so each wedge's area is linear in
// its own score, regardless of its neighbors. The full star represents 100.
export function starGeometry(profile, maxRadius=140) {
  const {total}=assess(profile);
  if(!Number.isFinite(maxRadius)||maxRadius<=0)throw new RangeError('Star radius must be positive');
  const half=Math.PI/COMPONENTS.length, valley=0.5;
  const areaPerPoint=valley*Math.sin(half)*maxRadius**2/10;
  const polar=(radius,angle)=>[radius*Math.cos(angle),radius*Math.sin(angle)];
  const wedges=COMPONENTS.map((c,i)=>{
    const angle=-Math.PI/2+i*2*half, value=profile[c.id];
    const radius=maxRadius*Math.sqrt(value/10);
    return {id:c.id,label:c.short,value,angle,radius,
      points:[[0,0],polar(valley*radius,angle-half),polar(radius,angle),polar(valley*radius,angle+half)],
      area:value*areaPerPoint};
  });
  return {total,wedges,areaPerPoint,area:total*areaPerPoint,fullArea:100*areaPerPoint};
}

export function renderStar(svg,profile) {
  const small=svg.getBoundingClientRect().width<=420;
  const [width,height,cx,cy,radius,labelRadius]=small?[400,400,200,200,87,120]:[600,500,300,250,140,190];
  const geometry=starGeometry(profile,radius),doc=svg.ownerDocument;
  const node=(tag,attrs={},text)=>{const el=doc.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;return el;};
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  svg.setAttribute('data-score',geometry.total);
  svg.setAttribute('data-area-fraction',geometry.total/100);
  const fragment=doc.createDocumentFragment();
  fragment.append(node('title',{id:'bleile-star-title'},'Where the Bleile dings come from'),
    node('desc',{id:'bleile-star-description'},`${geometry.total} dings occupy ${geometry.total}% of the full 100-ding star area. Each point and its wedge represent one component. Select a component to edit it. ${geometry.wedges.map(w=>`${w.label}: ${w.value}`).join('. ')}.`));
  const grid=node('g',{'aria-hidden':'true',class:'bleile-star-grid'});
  for(const level of [2,5,10]){
    grid.append(node('circle',{cx,cy,r:radius*Math.sqrt(level/10),class:'bleile-star-ring'}));
  }
  for(const wedge of geometry.wedges){
    grid.append(node('line',{x1:cx,y1:cy,x2:cx+radius*Math.cos(wedge.angle),y2:cy+radius*Math.sin(wedge.angle),class:'bleile-star-axis'}));
  }
  const full=starGeometry(Object.fromEntries(COMPONENTS.map(c=>[c.id,10])),radius);
  grid.append(node('polygon',{points:full.wedges.flatMap(w=>w.points.slice(2)).map(([x,y])=>`${cx+x},${cy+y}`).join(' '),class:'bleile-star-boundary'}));
  fragment.append(grid);
  for(const wedge of geometry.wedges){
    const link=node('a',{href:`#bleile-${wedge.id}`,'data-star-component':wedge.id,'aria-label':`${wedge.label}: ${wedge.value} of 10 dings. Edit this checkpoint.`});
    const points=wedge.points.map(([x,y])=>`${cx+x},${cy+y}`).join(' ');
    const polygon=node('polygon',{points,class:'bleile-star-wedge','data-dings':wedge.value});
    polygon.append(node('title',{},`${wedge.label}: ${wedge.value} dings (${wedge.value}% of the full star area)`));
    const x=cx+labelRadius*Math.cos(wedge.angle), y=cy+labelRadius*Math.sin(wedge.angle);
    const anchor=Math.cos(wedge.angle)>0.2?'start':Math.cos(wedge.angle)<-0.2?'end':'middle';
    const text=node('text',{x,y:y-5,'text-anchor':anchor,class:'bleile-star-label'});
    text.append(node('tspan',{x,dy:0},wedge.label),node('tspan',{x,dy:18,class:'bleile-star-value'},`${wedge.value} / 10`));
    link.append(polygon,text);fragment.append(link);
  }
  const scale=node('g',{'aria-hidden':'true',class:'bleile-star-scale'});
  for(const level of [2,5,10])scale.append(node('text',{x:cx+8,y:cy-radius*Math.sqrt(level/10)+4},level));
  fragment.append(scale);
  if(geometry.total===0)fragment.append(node('text',{x:cx,y:cy+22,'text-anchor':'middle',class:'bleile-star-zero'},'No shaded area'));
  svg.replaceChildren(fragment);
}
