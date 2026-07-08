import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Plus, Target } from 'lucide-react';
import api from '@/lib/api';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [category, setCategory] = useState('Food');
  const [limit, setLimit] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const res = await api.get('/budgets/status');
      setBudgets(res.data);
    } catch (error) {
      console.error("Failed to fetch budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    if (!category || !limit) return;

    try {
      await api.post('/budgets', {
        category,
        monthly_limit: Number(limit)
      });
      setCategory('Food');
      setLimit('');
      fetchBudgets();
    } catch (error) {
      console.error("Failed to add budget:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
        <p className="text-muted-foreground mt-1">Set limits and track your spending</p>
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Add Budget Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="col-span-1">
          <Card className="shadow-md bg-card/50 backdrop-blur-sm sticky top-10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={20} className="text-primary" />
                Set New Budget
              </CardTitle>
              <CardDescription>Define a monthly limit for a category</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBudget} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-background border border-input border-border/80 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none cursor-pointer"
                  >
                    <option value="Food">Food</option>
                    <option value="Travel">Travel</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Bills">Bills</option>
                    <option value="Education">Education</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Investments">Investments</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit">Monthly Limit (₹)</Label>
                  <Input 
                    id="limit" 
                    type="number" 
                    placeholder="e.g. 5000" 
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Save Budget
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Budget Status List */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          {budgets.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No budgets set</h3>
                <p className="text-sm text-muted-foreground mt-1">Add your first budget to start tracking.</p>
              </CardContent>
            </Card>
          ) : (
            budgets.map((b, index) => {
              const percent = Math.min((b.spent / b.monthly_limit) * 100, 100);
              const isOver = b.spent > b.monthly_limit;
              
              return (
                <motion.div 
                  key={b.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{b.category}</CardTitle>
                        <span className="text-sm font-medium text-muted-foreground">
                          ₹{b.spent.toLocaleString()} / ₹{b.monthly_limit.toLocaleString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress 
                        value={percent} 
                        className={`h-2 ${isOver ? '[&>div]:bg-destructive' : percent > 80 ? '[&>div]:bg-amber-500' : ''}`}
                      />
                      <p className={`text-xs mt-2 text-right ${isOver ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {isOver 
                          ? `Exceeded by ₹${(b.spent - b.monthly_limit).toLocaleString()}` 
                          : `₹${(b.monthly_limit - b.spent).toLocaleString()} remaining`}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
