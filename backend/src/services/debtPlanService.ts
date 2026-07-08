export interface PayoffResult {
  monthsToDebtFree: number; // -1 signals unpayable within the 30-year cap
  totalInterestPaid: number;
  schedule: any[];
}

// Simulate month-by-month payoff of all debts under a given strategy:
// "snowball" pays smallest balances first, "avalanche" pays highest interest first.
function runSimulation(debts: any[], strategy: 'snowball' | 'avalanche', extraPayment: number): PayoffResult {
  // Clone debts for simulation
  let activeDebts = debts.map(d => ({
    id: d._id.toString(),
    name: d.name,
    balance: d.remainingBalance,
    interestRate: d.interestRate,
    emi: d.emi
  }));

  let months = 0;
  let totalInterestPaid = 0;
  const schedule: any[] = [];
  const maxMonths = 360; // 30-year limit to avoid infinite loops

  while (activeDebts.some(d => d.balance > 0) && months < maxMonths) {
    months++;
    let monthlyInterest = 0;

    // 1. Accrue interest first
    activeDebts.forEach(d => {
      if (d.balance > 0) {
        const interest = d.balance * (d.interestRate / 100 / 12);
        monthlyInterest += interest;
        d.balance += interest;
      }
    });
    totalInterestPaid += monthlyInterest;

    // 2. Sort debts by strategy
    if (strategy === 'snowball') {
      // Smallest balance first
      activeDebts.sort((a, b) => a.balance - b.balance);
    } else {
      // Highest interest rate first
      activeDebts.sort((a, b) => b.interestRate - a.interestRate);
    }

    // 3. Determine payment pool
    const sumEMIs = activeDebts.reduce((sum, d) => sum + (d.balance > 0 ? d.emi : 0), 0);
    let paymentPool = sumEMIs + extraPayment;
    let paymentsThisMonth: { [key: string]: number } = {};

    // 4. Pay minimums first
    activeDebts.forEach(d => {
      if (d.balance > 0) {
        const minPay = Math.min(d.emi, d.balance, paymentPool);
        paymentsThisMonth[d.id] = minPay;
        d.balance -= minPay;
        paymentPool -= minPay;
      }
    });

    // 5. Apply any leftover pool as extra payment to the target debt
    if (paymentPool > 0) {
      for (let d of activeDebts) {
        if (d.balance > 0) {
          const extraPay = Math.min(paymentPool, d.balance);
          paymentsThisMonth[d.id] = (paymentsThisMonth[d.id] || 0) + extraPay;
          d.balance -= extraPay;
          paymentPool -= extraPay;
          if (paymentPool <= 0) break;
        }
      }
    }

    // Save progress for schedule (limit to first 24 months to keep payload small)
    if (months <= 24) {
      schedule.push({
        month: months,
        debts: activeDebts.map(d => ({
          name: d.name,
          remainingBalance: Math.round(d.balance * 100) / 100,
          paymentMade: Math.round((paymentsThisMonth[d.id] || 0) * 100) / 100
        }))
      });
    }
  }

  return {
    monthsToDebtFree: months === maxMonths ? -1 : months,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    schedule
  };
}

// Compare both payoff strategies for the same debt set and extra payment.
export function buildPayoffPlan(debts: any[], extraPayment: number): { snowball: PayoffResult; avalanche: PayoffResult } {
  return {
    snowball: runSimulation(debts, 'snowball', extraPayment),
    avalanche: runSimulation(debts, 'avalanche', extraPayment)
  };
}
