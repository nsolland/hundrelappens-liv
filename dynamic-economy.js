/* Multi-year scenario extension for the three-sector transfer ledger.
 * NOMINAL cash flows are conserved. Real terms are reporting only.
 * Behavioral coefficients are assumptions, not estimated elasticities.
 */
(function(root){
"use strict";
const base = typeof module !== "undefined" && module.exports ? require("./economy-model.js") : root.HundrelappEconomy;
function finite(name,value,min,max){
 if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(name+" out of range");
}
function simulate(settings={}){
 const s={years:20,inflation:3.6,wageGrowth:3,propensity:80,transferShare:25,procurementShare:25,
  wage:500,incomeTaxRate:.24,employerTaxRate:.14,vatRate:.25,
  householdInitial:10000,businessInitial:30000,governmentInitial:0,...settings};
 for(const name of ["years","inflation","wageGrowth","propensity","transferShare","procurementShare","wage","householdInitial","businessInitial","governmentInitial"]) finite(name,s[name],0,100000000);
 if(!Number.isInteger(s.years)||s.years<1||s.years>40)throw new RangeError("years must be 1..40");
 for(const name of ["propensity","transferShare","procurementShare"])finite(name,s[name],0,100);
 if(s.transferShare+s.procurementShare>100)throw new RangeError("public spending shares exceed available receipts");
 for(const name of ["incomeTaxRate","employerTaxRate"])finite(name,s[name],0,1);
 finite("vatRate",s.vatRate,0,5);
 let balances={household:s.householdInitial,business:s.businessInitial,government:s.governmentInitial};
 const initialTotal=balances.household+balances.business+balances.government;
 let priceIndex=1,wages=s.wage,years=[];
 for(let year=1;year<=s.years;year++){
  priceIndex*=1+s.inflation/100;
  if(year>1)wages*=1+s.wageGrowth/100;
  const incomeTax=wages*s.incomeTaxRate, employerTax=wages*s.employerTaxRate;
  const netWages=wages-incomeTax;
  // Government budget is computed from wages plus consumption, without feeding transfers
  // recursively into consumption inside the same year.
  const consumptionGross=netWages*s.propensity/100;
  const vat=consumptionGross*s.vatRate/(1+s.vatRate);
  const revenue=incomeTax+employerTax+vat;
  const publicTransfers=revenue*s.transferShare/100;
  const publicProcurement=revenue*s.procurementShare/100;
  let outcome;
  try {
   outcome=base.step({
    householdInitial:balances.household,businessInitial:balances.business,governmentInitial:balances.government,
    wages,incomeTaxRate:s.incomeTaxRate,employerTaxRate:s.employerTaxRate,
    consumptionGross,vatRate:s.vatRate,publicTransfers,publicProcurement
   });
  }catch(error){
   return {status:"halted",haltYear:year,reason:error.message,years,initialTotal,parameters:s};
  }
  balances=outcome.balances;
  const row={
   year,priceIndex,wages,netWages,consumptionGross,publicTransfers,publicProcurement,
   balances:{...balances},realBalances:{
    household:balances.household/priceIndex,
    business:balances.business/priceIndex,
    government:balances.government/priceIndex},
   realNetWages:netWages/priceIndex,flows:outcome.flows,
   nominalTotal:outcome.ending,nominalConservationDelta:outcome.ending-initialTotal
  };
  if(Math.abs(row.nominalConservationDelta)>1e-6)throw new Error("multi-year monetary conservation failure");
  years.push(row);
 }
 return {status:"completed",years,initialTotal,last:years[years.length-1],parameters:s};
}
function selfTest(){
 const r=simulate();
 if(r.status!=="completed"||r.years.length!==20)throw Error("baseline 20-year simulation");
 const one=simulate({years:1,inflation:0});
 if(one.status!=="completed")throw Error("one year");
 const x=one.last;
 if(Math.abs(x.nominalTotal-40000)>1e-7)throw Error("sector conservation");
 if(Math.abs(x.realNetWages-380)>1e-8)throw Error("net wages");
 if(Math.abs(x.consumptionGross-304)>1e-8)throw Error("consumption");
 if(Math.abs(x.flows.vat-60.8)>1e-8)throw Error("VAT from gross");
 if(Math.abs(x.flows.governmentSpending-x.flows.governmentRevenue*.5)>1e-8)throw Error("spending");
 const flat=simulate({years:2,inflation:0,wageGrowth:0});
 if(Math.abs(flat.years[0].realNetWages-flat.years[1].realNetWages)>1e-9)throw Error("flat real wages");
 const rising=simulate({years:2,inflation:5,wageGrowth:0});
 if(!(rising.years[1].realNetWages<rising.years[0].realNetWages))throw Error("inflation should erode real wages");
 const halted=simulate({businessInitial:0,householdInitial:0,governmentInitial:0});
 if(halted.status!=="halted"||halted.haltYear!==1)throw Error("insolvent simulation not halted");
 let rejected=false;try{simulate({transferShare:70,procurementShare:50})}catch(e){rejected=e instanceof RangeError}
 if(!rejected)throw Error("invalid fiscal split");
 return "9 dynamic checks passed";
}
const api={simulate,selfTest};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
else root.HundrelappDynamic=api;
})(typeof globalThis!=="undefined"?globalThis:this);
