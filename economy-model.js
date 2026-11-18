/* Scenario model: a closed, illustrative three-sector monetary transfer circuit.
 * All values in NOK per step. This is NOT a GDP model or behavioral forecast.
 * No implicit tax on transfers. Government spends only what it receives.
 */
(function(root){
"use strict";
function assertFiniteNonnegative(value,name) {
 if (!Number.isFinite(value)||value<0) throw new RangeError(name+" must be finite and >= 0");
}
function step(input){
 const {householdInitial=1000,businessInitial=1000,governmentInitial=0,wages=500,incomeTaxRate=.24,employerTaxRate=.14,consumptionGross=200,vatRate=.25,publicTransfers=0,publicProcurement=0}=input||{};
 for(const [k,v] of Object.entries({householdInitial,businessInitial,governmentInitial,wages,incomeTaxRate,employerTaxRate,consumptionGross,vatRate,publicTransfers,publicProcurement}))assertFiniteNonnegative(v,k);
 if(incomeTaxRate>1||employerTaxRate>1)throw new RangeError("invalid tax rate");
 const starting=householdInitial+businessInitial+governmentInitial;
 const incomeTax=wages*incomeTaxRate,employerTax=wages*employerTaxRate;
 const vat=consumptionGross*vatRate/(1+vatRate);
 const consumptionNet=consumptionGross-vat;
 const payrollCost=wages+employerTax;
 const governmentRevenue=incomeTax+employerTax+vat;
 const govtSpent=publicTransfers+publicProcurement;
 if(governmentInitial+governmentRevenue+1e-9<govtSpent)throw new RangeError("government requires funding");
 if(businessInitial+consumptionNet+publicProcurement+1e-9<payrollCost)throw new RangeError("business requires funding");
 const household=householdInitial+(wages-incomeTax)+publicTransfers-consumptionGross;
 if(household< -1e-9)throw new RangeError("household requires funding");
 const business=businessInitial+consumptionNet+publicProcurement-payrollCost;
 const government=governmentInitial+governmentRevenue-govtSpent;
 const final=household+business+government;
 const flows={incomeTax,employerTax,vat,governmentRevenue,governmentSpending:govtSpent,consumptionNet,payrollCost};
 if(Math.abs(starting-final)>1e-7)throw new Error("CONSERVATION_FAILURE: "+(starting-final));
 return {starting,ending:final,balances:{household,business,government},flows};
}
function run(input,steps){
 if(!Number.isInteger(steps)||steps<0||steps>1000)throw new RangeError("invalid steps");
 let state={...input},ledger=[];
 for(let i=0;i<steps;i++){
  const outcome=step(state);ledger.push(outcome);
  state={...state,householdInitial:outcome.balances.household,businessInitial:outcome.balances.business,governmentInitial:outcome.balances.government};
 }
 return {ledger,last:ledger[ledger.length-1]||null};
}
function selfTest(){
 const one=step({});
 if(Math.abs(one.starting-one.ending)>1e-7)throw Error("conservation");
 if(Math.abs(one.flows.vat-40)>1e-9)throw Error("VAT");
 if(Math.abs(one.flows.incomeTax-120)>1e-9)throw Error("income tax");
 if(Math.abs(one.flows.employerTax-70)>1e-9)throw Error("employer tax");
 if(Math.abs(one.balances.household-1180)>1e-9)throw Error("household");
 if(Math.abs(one.balances.business-590)>1e-9)throw Error("business");
 if(Math.abs(one.balances.government-230)>1e-9)throw Error("government");
 const longer=run({wages:100,incomeTaxRate:.2,employerTaxRate:.1,consumptionGross:100,vatRate:.25,businessInitial:10000,householdInitial:10000,governmentInitial:0,publicTransfers:20,publicProcurement:0},10);
 if(Math.abs(longer.last.starting-longer.last.ending)>1e-7)throw Error("multistep conservation");
 let failed=false;try{step({businessInitial:0,governmentInitial:0,householdInitial:0,wages:100})}catch(e){failed=e instanceof RangeError}
 if(!failed)throw Error("insolvency must fail");
 return "9 checks passed";
}
const api={step,run,selfTest};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
else root.HundrelappEconomy=api;
})(typeof globalThis!=="undefined"?globalThis:this);
