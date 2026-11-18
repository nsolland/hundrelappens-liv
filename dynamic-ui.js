/* Standalone UI for the explicitly bounded three-sector yearly cash-flow scenario. */
(function(){
"use strict";
const values={wageGrowth:3,propensity:80,transferShare:25,procurementShare:25};
const labels={wageGrowth:"Nominell lønnsvekst",propensity:"Andel nettolønn brukt",transferShare:"Skatteinntekt til overføringer",procurementShare:"Skatteinntekt til offentlige kjøp"};
const units={wageGrowth:"%",propensity:"%",transferShare:"%",procurementShare:"%"};
const section=document.createElement("section");
section.className="panel";section.style.marginTop="1rem";
section.innerHTML='<h2>Flerårig samfunnsscenario</h2><p>Hvert år flyttes penger mellom de tre sektorene. Prisvekst deflaterer kjøpekraften, men oppretter eller fjerner ikke nominelle kroner. Modellen er et lukket illustrativt regnskap, ikke en nasjonaløkonomisk prognose.</p><div id="dynamicControls" class="controls"></div><div class="cards"><div class="card"><small>Husholdningens realkapital</small><strong id="dynamicHousehold"></strong></div><div class="card"><small>Bedriftens realkapital</small><strong id="dynamicBusiness"></strong></div><div class="card"><small>Offentlig realkapital</small><strong id="dynamicGovernment"></strong></div></div><p id="dynamicStatus" class="note" role="status"></p><div style="margin:1rem 0;border:1px solid #405470;border-radius:12px;padding:1rem"><label for="dynamicTime">Se år <output id="dynamicTimeLabel">1</output></label><input type="range" id="dynamicTime" min="1" max="20" value="20" step="1" style="width:100%;accent-color:#7dd3fc"><button type="button" id="dynamicPlay">Spill av</button><p id="dynamicFrame" aria-live="polite"></p><div id="dynamicSectorBars" aria-label="Andel av nominell likviditet hos sektorene" style="display:flex;height:25px;overflow:hidden;border-radius:8px;background:#233146"></div><p id="dynamicFlows" class="note"></p></div><div style="overflow-x:auto"><table><thead><tr><th>År</th><th>Reell nettolønn</th><th>Forbruk nominelt</th><th>Skatt + mva.</th><th>Offentlige utbetalinger</th><th>Sum nominelle balanser</th></tr></thead><tbody id="dynamicYears"></tbody></table></div><p class="note">Startbalanser: husholdning 10 000 kr, bedrift 30 000 kr og offentlig sektor 0 kr. Flat personskatt 24 %, arbeidsgiveravgift 14 % og mva. 25 % er antakelser for dette separate scenarioet. Årlig forbruk baseres på nettolønnen, ikke formue. Ingen låneopptak, investeringer, boligmarked, befolkningsvekst, produktivitetsendring eller tilførsel av penger utenfra. Alle tre sektorene holdes likvide; ellers stoppes simuleringen.</p><button id="downloadDynamic" type="button">Eksporter flerårig scenario (JSON)</button>';
document.querySelector("#sectorConservation").closest("section").after(section);
const controls=document.getElementById("dynamicControls");
for(const [key,value] of Object.entries(values)){
 const label=document.createElement("label");label.htmlFor="dynamic-"+key;
 const text=document.createElement("span");text.textContent=labels[key];
 const output=document.createElement("output");output.id="dynamic-"+key+"V";
 label.append(text,output);
 const input=document.createElement("input");input.id="dynamic-"+key;input.type="range";
 input.min=0;input.max=key==="wageGrowth"?10:key==="propensity"?100:50;
 input.step=key==="wageGrowth"?0.5:5;input.value=value;
 controls.append(label,input);
 input.addEventListener("input",render);
}
const money=n=>n.toLocaleString("nb-NO",{minimumFractionDigits:2,maximumFractionDigits:2})+" kr";
let last, timer=null;
const time=document.getElementById("dynamicTime");
const play=document.getElementById("dynamicPlay");
function pause(){if(timer!==null){clearInterval(timer);timer=null;}play.textContent="Spill av";}
function setFrame(year){
 if(!last||!last.years.length)return;
 const record=last.years[Math.max(0,Math.min(last.years.length-1,year-1))];
 time.value=record.year;
 document.getElementById("dynamicTimeLabel").textContent=String(record.year);
 document.getElementById("dynamicFrame").textContent="År "+record.year+" · reell nettolønn "+money(record.realNetWages)+" · prisindeks "+record.priceIndex.toFixed(3);
 const rows=[["Husholdning",record.balances.household,"#60a5fa"],["Bedrift",record.balances.business,"#34d399"],["Offentlig sektor",record.balances.government,"#e69b56"]];
 const panel=document.getElementById("dynamicSectorBars");
 panel.replaceChildren();
 for(const [name,amount,color] of rows){
  const span=document.createElement("span");
  span.style.width=(amount/record.nominalTotal*100)+"%";span.style.background=color;
  span.title=name+": "+money(amount);panel.append(span);
 }
 document.getElementById("dynamicFlows").textContent="Netto lønn "+money(record.netWages)+" · Forbruk "+money(record.consumptionGross)+" · Skatt og avgifter "+money(record.flows.governmentRevenue)+" · Offentlige utbetalinger "+money(record.flows.governmentSpending);
}
time.addEventListener("input",()=>{pause();setFrame(Number(time.value));});
play.addEventListener("click",()=>{
 if(timer!==null){pause();return;}
 if(!last?.years?.length)return;
 if(Number(time.value)>=last.years.length)setFrame(1);
 play.textContent="Pause";
 timer=setInterval(()=>{
  const next=Number(time.value)+1;
  if(next>last.years.length){pause();return;}
  setFrame(next);
 },550);
});
function render(){
 const assumptions={years:Number(document.getElementById("years").value),inflation:Number(document.getElementById("inflation").value)};
 for(const key of Object.keys(values)){
  const v=Number(document.getElementById("dynamic-"+key).value);
  assumptions[key]=v;document.getElementById("dynamic-"+key+"V").textContent=v+units[key];
 }
 // Controls have independent caps of 50%, so the total never exceeds 100%.
 pause();
 const result=HundrelappDynamic.simulate(assumptions);last=result;
 const status=document.getElementById("dynamicStatus");
 const rows=document.getElementById("dynamicYears");
 if(!result.years.length){
  status.textContent="Simuleringen stoppet i år "+result.haltYear+": "+result.reason;
  for(const id of ["dynamicHousehold","dynamicBusiness","dynamicGovernment"])document.getElementById(id).textContent="–";
  rows.replaceChildren();document.getElementById("dynamicFrame").textContent="Ingen gyldige år.";document.getElementById("dynamicSectorBars").replaceChildren();return;
 }
 const end=result.last;
 time.max=String(result.years.length);setFrame(result.years.length);
 document.getElementById("dynamicHousehold").textContent=money(end.realBalances.household);
 document.getElementById("dynamicBusiness").textContent=money(end.realBalances.business);
 document.getElementById("dynamicGovernment").textContent=money(end.realBalances.government);
 status.textContent=(result.status==="completed"?"Fullført "+result.years.length+" år.":"Stoppet i år "+result.haltYear+": "+result.reason+".")+" Nominell start- og slutsum: "+money(result.initialTotal)+" / "+money(end.nominalTotal)+".";
 const selected=result.years.length<=8?result.years:[...result.years.slice(0,3),null,...result.years.slice(-3)];
 rows.replaceChildren();
 for(const year of selected){
  const tr=document.createElement("tr");
  const values=year?[year.year,money(year.realNetWages),money(year.consumptionGross),money(year.flows.governmentRevenue),money(year.flows.governmentSpending),money(year.nominalTotal)]:["…","…","…","…","…","…"];
  for(const cell of values){const td=document.createElement("td");td.textContent=cell;tr.append(td);}
  rows.append(tr);
 }
 window.__dynamicScenario=result;
}
document.getElementById("years").addEventListener("input",render);
document.getElementById("inflation").addEventListener("input",render);
document.getElementById("reset").addEventListener("click",()=>{
 for(const [key,value] of Object.entries(values))document.getElementById("dynamic-"+key).value=value;
 render();
});
document.getElementById("downloadDynamic").addEventListener("click",()=>{
 const blob=new Blob([JSON.stringify(last,null,2)],{type:"application/json"});
 const uri=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=uri;link.download="hundrelapp-fleraarig.json";link.click();
 setTimeout(()=>URL.revokeObjectURL(uri),0);
});
render();
})();
