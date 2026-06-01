import { Router, Request, Response } from 'express';
import Debt from '../models/Debt.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

// Get all debts
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const debts = await Debt.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(debts.map(d => ({ ...d.toObject(), id: d._id })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new debt
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, principalAmount, remainingBalance, interestRate, emi, dueDate } = req.body;
    if (!name || principalAmount === undefined || remainingBalance === undefined || interestRate === undefined || emi === undefined || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newDebt = new Debt({
      userId: req.user.id,
      name,
      principalAmount,
      remainingBalance,
      interestRate,
      emi,
      dueDate
    });

    await newDebt.save();
    res.status(201).json({ ...newDebt.toObject(), id: newDebt._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a debt
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const deleted = await Debt.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    res.json({ message: 'deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/debts/plan - Payoff projections (Snowball vs Avalanche)
router.get('/plan', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const debts = await Debt.find({ userId: req.user.id });
    if (debts.length === 0) {
      return res.json({ snowball: null, avalanche: null, hasDebts: false });
    }

    const extraPayment = parseFloat(req.query.extraPayment as string) || 0;

    // Run simulation helper
    const runSimulation = (strategy: 'snowball' | 'avalanche') => {
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
        monthsToDebtFree: months === maxMonths ? -1 : months, // -1 signals infinite/unpayable
        totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
        schedule
      };
    };

    const snowballResult = runSimulation('snowball');
    const avalancheResult = runSimulation('avalanche');

    res.json({
      hasDebts: true,
      extraPayment,
      snowball: snowballResult,
      avalanche: avalancheResult
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
