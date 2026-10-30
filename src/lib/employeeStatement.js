// El inicio de la liquidación limita el registro de pagos y saldo, no el
// total de actividad del mes. Las comisiones individuales vienen del servidor.
export function employeeStatementActivity(statement) {
  const works=statement.works || [];
  let earnedCents=0,missingPrices=0,estimated=0,beforeStart=0;
  for(const work of works){
    if(work.date<statement.employee.payroll_start_date)beforeStart++;
    if(work.commission_historical_estimate)estimated++;
    if(work.price==null || !Number.isFinite(Number(work.earned))){missingPrices++;continue;}
    earnedCents+=Math.round(Number(work.earned)*100);
  }
  return {
    count:works.length,earned:earnedCents/100,missingPrices,estimated,beforeStart,
    shared:works.filter(w=>Number(w.participants)>1).length,
    beforePayroll:statement.to<statement.employee.payroll_start_date,
    partialPayroll:statement.from<statement.employee.payroll_start_date && statement.to>=statement.employee.payroll_start_date,
  };
}
