/* Browser-only visual layer for a three-sector scenario. No monetary calculations.
 * Values always come from the reconciled HundrelappDynamic ledger.
 */
(function(){
"use strict";
const parent=document.getElementById("dynamicStatus")?.closest("section");
if(!parent||typeof HundrelappDynamic==="undefined")return;
const wrapper=document.createElement("section");
wrapper.id="economyScene";
wrapper.setAttribute("aria-label","Visualisering av årsstrømmer mellom sektorene");
wrapper.style.cssText="margin:1rem 0;padding:1rem;border:1px solid #405470;border-radius:12px;background:#0d1728";
const heading=document.createElement("h3");
heading.textContent="Pengestrømmene i valgt år";
const expl=document.createElement("p");
expl.className="note";expl.textContent="Pilene viser betalinger, ikke verdiskaping. Skatter, mva. og arbeidsgiveravgift er separate strømmer. Beløpene følger valgt simuleringsår.";
wrapper.append(heading,expl);
const namespace="http://www.w3.org/2000/svg";
const svg=document.createElementNS(namespace,"svg");
svg.setAttribute("viewBox","0 0 780 440");svg.setAttribute("width","100%");svg.setAttribute("role","img");
svg.setAttribute("aria-label","Husholdning, bedrift og offentlig sektor med pengeoverføringer");
svg.setAttribute("style","max-height:480px");
const positions={
 household:{x:90,y:80,label:"HUSHOLDNING",color:"#60a5fa"},
 business:{x:555,y:80,label:"BEDRIFT",color:"#34d399"},
 government:{x:323,y:335,label:"OFFENTLIG",color:"#e9a15e"}
};
const flows=[
 {key:"wages",start:"business",end:"household",shift:-26,label:"Nettolønn",color:"#60a5fa"},
 {key:"consumption",start:"household",end:"business",shift:35,label:"Forbruk eks. mva.",color:"#34d399"},
 {key:"incomeTax",start:"household",end:"government",shift:-30,label:"Personskatt",color:"#e9a15e"},
 {key:"vat",start:"household",end:"government",shift:35,label:"Mva. fra forbruk",color:"#f4c579"},
 {key:"employerTax",start:"business",end:"government",shift:-28,label:"Arbeidsgiveravgift",color:"#e9a15e"},
 {key:"transfers",start:"government",end:"household",shift:43,label:"Overføringer",color:"#a78bfa"},
 {key:"procurement",start:"government",end:"business",shift:34,label:"Offentlige kjøp",color:"#b7e3a1"}
];
function make(tag,attrs,text){
 const el=document.createElementNS(namespace,tag);
 for(const [name,value] of Object.entries(attrs||{}))el.setAttribute(name,String(value));
 if(text!==undefined)el.textContent=text;
 return el;
}
const defs=make("defs");
for(const item of flows){
 const marker=make("marker",{id:"arrow-"+item.key,markerWidth:8,markerHeight:8,refX:6,refY:3,orient:"auto"});
 marker.append(make("path",{d:"M0,0 L6,3 L0,6 Z",fill:item.color}));defs.append(marker);
}
svg.append(defs);
for(const [name,pos] of Object.entries(positions)){
 const group=make("g",{});
 group.append(make("rect",{x:pos.x,y:pos.y,width:140,height:64,rx:12,fill:"#17253b",stroke:pos.color,"stroke-width":2}));
 group.append(make("text",{x:pos.x+70,y:pos.y+25,"text-anchor":"middle",fill:"#f3f6ff","font-size":13,"font-weight":700},pos.label));
 const balance=make("text",{x:pos.x+70,y:pos.y+47,"text-anchor":"middle",fill:pos.color,"font-size":13});
 balance.setAttribute("id","scene-balance-"+name);group.append(balance);svg.append(group);
}
const flowValue={};
const sceneRows=document.createElement("div");
sceneRows.id="sceneLedger";
sceneRows.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.35rem;font-size:.86rem";
const fmt=n=>n.toLocaleString("nb-NO",{minimumFractionDigits:2,maximumFractionDigits:2})+" kr";
for(const item of flows){
 const from=positions[item.start],to=positions[item.end];
 const a={x:from.x+70,y:from.y+32},b={x:to.x+70,y:to.y+32};
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
 const start={x:a.x+dx/len*75+nx*item.shift,y:a.y+dy/len*75+ny*item.shift};
 const end={x:b.x-dx/len*75+nx*item.shift,y:b.y-dy/len*75+ny*item.shift};
 const d="M"+start.x.toFixed(2)+","+start.y.toFixed(2)+" L"+end.x.toFixed(2)+","+end.y.toFixed(2);
 const path=make("path",{d,stroke:item.color,"stroke-width":2.4,"stroke-dasharray":"6 4","marker-end":"url(#arrow-"+item.key+")",fill:"none",opacity:".9"});svg.insertBefore(path,svg.childNodes[1]);
 const chip=document.createElement("div");chip.style.cssText="display:flex;gap:.5rem;justify-content:space-between;border-bottom:1px solid #29364b;padding:.3rem";
 const label=document.createElement("span");label.textContent=item.label;label.style.color=item.color;
 const val=document.createElement("strong");val.id="scene-"+item.key;val.textContent="–";
 chip.append(label,val);sceneRows.append(chip);flowValue[item.key]=val;
 const pulse=make("circle",{r:4.5,fill:item.color});
 const motion=make("animateMotion",{dur:(3.5+flows.indexOf(item)*.45)+"s",repeatCount:"indefinite",path:d});
 pulse.append(motion);svg.append(pulse);
}
const summary=document.createElement("p");
summary.className="note";summary.id="sceneSummary";
wrapper.append(svg,sceneRows,summary);
parent.querySelector("#dynamicStatus").after(wrapper);
function frame(){
 const result=window.__dynamicScenario;
 if(!result?.years?.length)return;
 const slider=document.getElementById("dynamicTime");
 const record=result.years[Math.max(0,Math.min(result.years.length-1,Number(slider?.value||result.years.length)-1))];
 const values={
 wages:record.netWages,consumption:record.flows.consumptionNet,
 incomeTax:record.flows.incomeTax,vat:record.flows.vat,
 employerTax:record.flows.employerTax,transfers:record.publicTransfers,
 procurement:record.publicProcurement
 };
 for(const [key,value] of Object.entries(values))flowValue[key].textContent=fmt(value);
 for(const name of Object.keys(positions)){
  const value=record.balances[name==="household"?"household":name==="business"?"business":"government"];
  document.getElementById("scene-balance-"+name).textContent=fmt(value);
 }
 const ledgerTotal=Object.values(record.balances).reduce((sum,v)=>sum+v,0);
 summary.textContent="År "+record.year+" · nominell samlet likviditet "+fmt(ledgerTotal)+" · differanse mot start "+fmt(ledgerTotal-result.initialTotal);
}
for(const id of ["dynamicTime","years","inflation","reset","dynamic-wageGrowth","dynamic-propensity","dynamic-transferShare","dynamic-procurementShare"]){
 const input=document.getElementById(id);
 if(input)input.addEventListener(id==="reset"?"click":"input",frame);
}
const observer=new MutationObserver(frame);
observer.observe(document.getElementById("dynamicTimeLabel"),{childList:true,characterData:true,subtree:true});
const media=window.matchMedia?.("(prefers-reduced-motion: reduce)");
if(media?.matches){svg.querySelectorAll("animateMotion").forEach(n=>n.remove());}
frame();
})();
