import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingDown, DollarSign, TrendingUp, Trash2, Download, Landmark, ArrowUpRight, ArrowDownLeft, Search, Filter, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { apiService, Transaction } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface ExpendituresTabProps {
  isAdmin: boolean;
}

const VAULT_RESERVE_TARGET = 50000;

export const ExpendituresTab = ({ isAdmin }: ExpendituresTabProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: "",
    type: "expense" as Transaction['type'],
    category: "operation"
  });

  useEffect(() => {
    let isCancelled = false;
    
    const safetyTimer = setTimeout(() => {
      if (!isCancelled) setLoading(false);
    }, 1500);

    const fetchData = async () => {
      try {
        const transactionsData = await apiService.getTransactions();
        if (!isCancelled) {
          setTransactions(prev => (Array.isArray(transactionsData) && transactionsData.length > 0 ? transactionsData : (prev.length > 0 ? prev : transactionsData)));
          setLoading(false);
          setLoadError(false);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        if (!isCancelled) {
          setLoading(false);
          setLoadError(true);
        }
      }
    };
    
    fetchData();

    const unsubscribe = apiService.subscribeToTransactions((updatedTxs) => {
      if (!isCancelled && Array.isArray(updatedTxs) && updatedTxs.length > 0) {
        setTransactions(updatedTxs);
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const addTransaction = async (override?: Partial<typeof newTransaction>) => {
    const desc = override?.description || newTransaction.description;
    const amt = override?.amount || newTransaction.amount;
    const type = override?.type || newTransaction.type;
    const category = override?.category || newTransaction.category;

    if (desc.trim() && amt) {
      const transaction = {
        description: desc.trim(),
        amount: parseFloat(amt as string),
        date: new Date().toISOString().split('T')[0],
        type: type as 'income' | 'expense',
        category: category
      };
      try {
        await apiService.addTransaction(transaction);
        soundFx.playCashSound();
        if (!override) {
          setNewTransaction({ description: "", amount: "", type: "expense", category: "operation" });
        }
        const updatedTransactions = await apiService.getTransactions();
        setTransactions(updatedTransactions);
      } catch (error) {
        console.error('Error adding transaction:', error);
      }
    }
  };

  const handleQuickPreset = (description: string, amount: number, type: 'income' | 'expense', category: string) => {
    addTransaction({
      description,
      amount: amount.toString(),
      type,
      category
    });
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
      await apiService.deleteTransaction(transactionId);
      const updatedTransactions = await apiService.getTransactions();
      setTransactions(updatedTransactions);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, inc) => sum + inc.amount, 0);
  const netAmount = totalIncome - totalSpent;
  const vaultProgress = Math.min(100, Math.max(0, Math.round((netAmount / VAULT_RESERVE_TARGET) * 100)));
  const profitMargin = totalIncome > 0 ? Math.round((netAmount / totalIncome) * 100) : 0;
  
  const getCategoryBadge = (category: string) => {
    const styles = {
      operation: "bg-red-950/60 text-red-300 border border-red-600/30",
      equipment: "bg-red-600 text-white font-bold shadow-md",
      maintenance: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40",
      contribution: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
      arsenal_order: "bg-blue-600 text-white font-bold shadow-md",
      syndicate_deal: "bg-purple-600 text-white font-bold shadow-md",
      other: "bg-gray-800 text-gray-300"
    };
    
    const labels = {
      operation: "🏠 Operations",
      equipment: "🔫 Equipment",
      maintenance: "🔧 Maintenance",
      contribution: "💵 Contribution",
      arsenal_order: "🎯 Arsenal Order",
      syndicate_deal: "🤝 Syndicate Deal",
      other: "📋 Other"
    };

    return (
      <Badge className={`font-orbitron text-[10px] uppercase tracking-wider px-2.5 py-1 ${styles[category as keyof typeof styles] || styles.other}`}>
        {labels[category as keyof typeof labels] || category.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  // Filtered Transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400 font-rajdhani font-semibold">Loading Treasury Transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/60 backdrop-blur-xl p-6 rounded-2xl border border-red-900/40 shadow-2xl">
        <div>
          <h2 className="text-2xl font-extrabold tracking-wider text-white font-orbitron flex items-center">
            <Landmark className="w-6 h-6 mr-3 text-emerald-400" />
            <span className="text-gang-glow">SYNDICATE TREASURY & VAULT LEDGER</span>
          </h2>
          <p className="text-red-300/80 text-sm font-rajdhani font-semibold mt-1">
            Real-time tracking of liquid vault capital reserves, Syndicate Deals & Arsenal cashflows
          </p>
        </div>

        <Button
          onClick={() => apiService.downloadTransactionsCsv()}
          className="btn-gang-outline flex items-center shrink-0"
        >
          <Download className="w-4 h-4 mr-2" /> Download Vault CSV
        </Button>
      </div>

      {/* Financial Overview Metrics & Vault Progress Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-emerald-400" /> Total Inflow / Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-orbitron font-extrabold text-emerald-400">
              ${totalIncome.toLocaleString()}
            </div>
            <p className="text-xs font-rajdhani text-gray-400 mt-1 font-semibold">Dues, Syndicate & Arsenal income</p>
          </CardContent>
        </Card>

        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <TrendingDown className="w-4 h-4 mr-2 text-red-500" /> Total Outflow / Spent
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-orbitron font-extrabold text-red-500">
              ${totalSpent.toLocaleString()}
            </div>
            <p className="text-xs font-rajdhani text-gray-400 mt-1 font-semibold">Operational equipment & stocking</p>
          </CardContent>
        </Card>

        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-yellow-400" /> Net Liquid Vault Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className={`text-3xl font-orbitron font-extrabold ${netAmount >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
              ${netAmount.toLocaleString()}
            </div>
            <div className="w-full bg-black/80 h-2 rounded-full mt-3 overflow-hidden border border-red-900/30">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${vaultProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-yellow-400" /> Profit Margin Ratio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-orbitron font-extrabold text-yellow-400">
              {profitMargin}%
            </div>
            <p className="text-xs font-rajdhani text-gray-400 mt-1 font-semibold">{transactions.length} total ledger records</p>
          </CardContent>
        </Card>
      </div>

      {/* Leader Quick Preset Action Bar */}
      {isAdmin && (
        <Card className="card-gang p-4 border-red-900/40">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="font-orbitron text-xs font-bold text-gray-300 uppercase">LEADER QUICK PRESETS:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleQuickPreset('🤝 Syndicate Deal Deposit', 1000, 'income', 'syndicate_deal')}
                className="bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 text-xs font-bold font-orbitron"
              >
                + $1,000 Syndicate Deal
              </Button>

              <Button
                size="sm"
                onClick={() => handleQuickPreset('🎯 Arsenal Weapon Sales', 500, 'income', 'arsenal_order')}
                className="bg-blue-950/60 hover:bg-blue-900/80 text-blue-200 border border-blue-500/40 text-xs font-bold font-orbitron"
              >
                + $500 Arsenal Order
              </Button>

              <Button
                size="sm"
                onClick={() => handleQuickPreset('💵 Member Weekly Dues', 100, 'income', 'contribution')}
                className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 text-xs font-bold font-orbitron"
              >
                + $100 Dues
              </Button>

              <Button
                size="sm"
                onClick={() => handleQuickPreset('🔫 Weapon Stocking Expense', 250, 'expense', 'equipment')}
                className="bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/40 text-xs font-bold font-orbitron"
              >
                - $250 Equipment
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add New Transaction Form (Admin Only) */}
      {isAdmin && (
        <Card className="card-gang p-6 border-red-600/40">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="font-orbitron text-gang-glow text-lg flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-yellow-400" />
              Record New Vault Transaction
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-orbitron text-red-400 mb-2 uppercase">Description</label>
                <Input
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  placeholder="e.g. Weaponry Stocking or Syndicate Deposit"
                  className="bg-black/60 border-red-900/40 text-white font-rajdhani font-semibold"
                />
              </div>
              
              <div>
                <label className="block text-xs font-orbitron text-red-400 mb-2 uppercase">Amount ($)</label>
                <Input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  placeholder="0.00"
                  className="bg-black/60 border-red-900/40 text-white font-rajdhani font-semibold"
                />
              </div>
              
              <div>
                <label className="block text-xs font-orbitron text-red-400 mb-2 uppercase">Transaction Type</label>
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value as any})}
                  className="w-full p-2.5 rounded-lg border border-red-900/40 bg-black/80 text-white font-rajdhani font-bold text-sm"
                >
                  <option value="expense">💸 Expense (Outflow)</option>
                  <option value="income">💰 Income (Inflow)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-orbitron text-red-400 mb-2 uppercase">Category</label>
                <select
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-red-900/40 bg-black/80 text-white font-rajdhani font-bold text-sm"
                >
                  <option value="operation">🏠 Operations</option>
                  <option value="arsenal_order">🎯 Arsenal Order</option>
                  <option value="syndicate_deal">🤝 Syndicate Deal</option>
                  <option value="equipment">🔫 Equipment</option>
                  <option value="maintenance">🔧 Maintenance</option>
                  <option value="contribution">💵 Contribution</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
            </div>
            
            <Button 
              onClick={() => addTransaction()}
              className="btn-gang w-full py-3"
              disabled={!newTransaction.description.trim() || !newTransaction.amount}
            >
              <Plus className="w-4 h-4 mr-2" /> Commit Transaction to Vault Ledger
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Interactive Search & Filter Controls */}
      <Card className="card-gang p-4 border-red-900/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search ledger description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/80 border-red-900/40 text-white pl-10 text-sm font-rajdhani font-semibold"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center space-x-2 bg-black/60 px-3 py-1.5 rounded-lg border border-red-900/30 text-xs text-gray-300 font-orbitron">
              <Filter className="w-3.5 h-3.5 text-red-400" />
              <span>TYPE:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-black text-white">All Cashflows</option>
                <option value="income" className="bg-black text-emerald-400">💰 Income (Inflow)</option>
                <option value="expense" className="bg-black text-red-400">💸 Expense (Outflow)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-black/60 px-3 py-1.5 rounded-lg border border-red-900/30 text-xs text-gray-300 font-orbitron">
              <span>CATEGORY:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-black text-white">All Categories</option>
                <option value="arsenal_order" className="bg-black text-blue-400">🎯 Arsenal Order</option>
                <option value="syndicate_deal" className="bg-black text-purple-400">🤝 Syndicate Deal</option>
                <option value="operation" className="bg-black text-red-400">🏠 Operations</option>
                <option value="equipment" className="bg-black text-white">🔫 Equipment</option>
                <option value="contribution" className="bg-black text-emerald-400">💵 Contribution</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Transactions List */}
      <Card className="card-gang p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="font-orbitron text-gang-glow text-lg">
            📜 Vault Financial Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          {filteredTransactions.length === 0 ? (
            <p className="text-gray-400 text-center py-8 font-rajdhani font-semibold">No transactions found matching filter criteria.</p>
          ) : (
            filteredTransactions.map((tx) => (
              <div 
                key={tx.id} 
                className="p-4 bg-black/40 rounded-xl border border-red-900/30 hover:border-red-600/40 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`p-2.5 rounded-xl border ${tx.type === 'income' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 border-red-600/30 text-red-500'}`}>
                    {tx.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-white font-rajdhani text-base">{tx.description}</span>
                    <span className="text-xs text-gray-400 font-rajdhani font-semibold mt-0.5">{tx.date}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {getCategoryBadge(tx.category)}

                  <span className={`text-xl font-orbitron font-extrabold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                  </span>

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTransaction(tx.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:bg-red-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};