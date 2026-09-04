import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  DotsVerticalIcon, 
  Pencil1Icon, 
  TrashIcon,
  PlusIcon
} from "@radix-ui/react-icons";
import { Shield, Flame, AlertCircle, Users, CheckCircle2, TrendingUp, Search, Filter, ArrowUpRight, ArrowDownRight, Award, Crown, Zap } from "lucide-react";
import { apiService as firestoreService, Member } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface MembersTabProps {
  isAdmin: boolean;
}

const RANK_HIERARCHY = ['recruit', 'hustler', 'enforcer', 'underboss', 'leader'];

export function MembersTab({ isAdmin }: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [rankFilter, setRankFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form State
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberContribution, setNewMemberContribution] = useState(100);
  const [newMemberRank, setNewMemberRank] = useState<string>("recruit");

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState("");
  const [editContribution, setEditContribution] = useState(100);
  const [editRank, setEditRank] = useState<string>("recruit");
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const safetyTimer = setTimeout(() => {
      if (!isCancelled) setLoading(false);
    }, 1500);

    const fetchMembers = async () => {
      try {
        const data = await firestoreService.getMembers();
        if (!isCancelled) {
          setMembers(prev => (Array.isArray(data) && data.length > 0 ? data : (prev.length > 0 ? prev : data)));
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching members:", error);
        if (!isCancelled) {
          setLoading(false);
          setLoadError(true);
        }
      }
    };

    fetchMembers();

    const unsubscribe = firestoreService.subscribeToMembers((newMembers) => {
      if (!isCancelled && Array.isArray(newMembers)) {
        setMembers(newMembers);
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const totalMembers = members.length;
  const totalPaid = members.filter(m => m.hasPaid).length;
  const totalWeeklyAmount = members.reduce((sum, member) => sum + member.contribution, 0);
  const collectionPercentage = totalMembers > 0 ? Math.round((totalPaid / totalMembers) * 100) : 0;

  // Rank Counts
  const leadersCount = members.filter(m => (m.rank || 'recruit').toLowerCase() === 'leader').length;
  const underbossCount = members.filter(m => (m.rank || 'recruit').toLowerCase() === 'underboss').length;
  const enforcerCount = members.filter(m => (m.rank || 'recruit').toLowerCase() === 'enforcer').length;
  const soldiersCount = members.filter(m => ['hustler', 'recruit'].includes((m.rank || 'recruit').toLowerCase())).length;

  const getRankBadge = (rank?: string) => {
    const r = (rank || 'recruit').toLowerCase();
    switch (r) {
      case 'leader':
        return (
          <Badge className="bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-black font-extrabold shadow-[0_0_15px_rgba(234,179,8,0.5)] border border-yellow-300 flex items-center gap-1.5 px-3 py-1 font-orbitron text-xs">
            <Crown className="w-3.5 h-3.5 fill-black" /> LEADER
          </Badge>
        );
      case 'underboss':
        return (
          <Badge className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-extrabold shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-400 flex items-center gap-1.5 px-3 py-1 font-orbitron text-xs">
            🗡️ UNDERBOSS
          </Badge>
        );
      case 'enforcer':
        return (
          <Badge className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 text-white font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-1.5 px-3 py-1 font-orbitron text-xs">
            🔫 ENFORCER
          </Badge>
        );
      case 'hustler':
        return (
          <Badge className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400 flex items-center gap-1.5 px-3 py-1 font-orbitron text-xs">
            💵 HUSTLER
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-300 border-gray-600/60 flex items-center gap-1.5 bg-black/60 px-3 py-1 font-orbitron text-xs">
            🔰 RECRUIT
          </Badge>
        );
    }
  };

  const getRankCardBorder = (rank?: string) => {
    const r = (rank || 'recruit').toLowerCase();
    switch (r) {
      case 'leader': return 'border-yellow-500/50 hover:border-yellow-400 hover:shadow-[0_0_25px_rgba(234,179,8,0.3)]';
      case 'underboss': return 'border-red-600/50 hover:border-red-500 hover:shadow-[0_0_25px_rgba(220,38,38,0.3)]';
      case 'enforcer': return 'border-blue-600/40 hover:border-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.3)]';
      case 'hustler': return 'border-emerald-600/40 hover:border-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]';
      default: return 'border-red-900/30 hover:border-red-600/40';
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;

    try {
      const newMember = {
        name: newMemberName.trim(),
        contribution: newMemberContribution,
        rank: newMemberRank,
        hasPaid: false,
        joinDate: new Date().toISOString().split('T')[0],
        order: members.length
      };

      await firestoreService.addMember(newMember);
      setNewMemberName("");
      setNewMemberContribution(100);
      setNewMemberRank("recruit");
      setIsAddDialogOpen(false);
      soundFx.playSuccessSound();
      
      const updatedMembers = await firestoreService.getMembers();
      setMembers(updatedMembers);
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Failed to add member. Please try again.");
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember || !editName.trim()) return;

    try {
      const updates = {
        name: editName.trim(),
        contribution: editContribution,
        rank: editRank
      };

      await firestoreService.updateMember(editingMember.id, updates);
      setIsEditDialogOpen(false);
      setEditingMember(null);
      soundFx.playSuccessSound();
      
      const updatedMembers = await firestoreService.getMembers();
      setMembers(updatedMembers);
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member. Please try again.");
    }
  };

  const handleQuickRankChange = async (member: Member, direction: 'promote' | 'demote') => {
    const currentRank = (member.rank || 'recruit').toLowerCase();
    const currentIndex = RANK_HIERARCHY.indexOf(currentRank);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    if (direction === 'promote' && currentIndex < RANK_HIERARCHY.length - 1) {
      newIndex = currentIndex + 1;
    } else if (direction === 'demote' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    }

    if (newIndex === currentIndex) return;

    const newRank = RANK_HIERARCHY[newIndex];
    try {
      await firestoreService.updateMember(member.id, { rank: newRank });
      soundFx.playGunSound();
      setMembers(members.map(m => m.id === member.id ? { ...m, rank: newRank } : m));
    } catch (error) {
      console.error("Error changing rank:", error);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the gang?`)) return;

    try {
      await firestoreService.deleteMember(id);
      setMembers(members.filter(m => m.id !== id));
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member. Please try again.");
    }
  };

  const handlePaymentStatusChange = async (id: string, hasPaid: boolean) => {
    try {
      const targetMember = members.find(m => m.id === id);
      await firestoreService.updateMember(id, { hasPaid });

      if (hasPaid && targetMember) {
        soundFx.playCashSound();
        // Auto-log Treasury Dues Income
        await firestoreService.addTransaction({
          description: `💵 Member Dues: ${targetMember.name}`,
          amount: targetMember.contribution || 100,
          type: 'income',
          category: 'contribution',
          date: new Date().toISOString().split('T')[0]
        }).catch(err => console.error("Error logging dues transaction:", err));
      }

      setMembers(members.map(m => 
        m.id === id ? { ...m, hasPaid } : m
      ));
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Failed to update payment status. Please try again.");
    }
  };

  const moveMemberUp = async (index: number) => {
    if (index <= 0) return;
    const newMembers = [...members];
    [newMembers[index], newMembers[index - 1]] = [newMembers[index - 1], newMembers[index]];
    
    try {
      await firestoreService.batchUpdateMembers([
        { id: newMembers[index].id, updates: { order: index } },
        { id: newMembers[index - 1].id, updates: { order: index - 1 } }
      ]);
      setMembers(newMembers);
    } catch (error) {
      console.error("Error moving member up:", error);
    }
  };

  const moveMemberDown = async (index: number) => {
    if (index >= members.length - 1) return;
    const newMembers = [...members];
    [newMembers[index], newMembers[index + 1]] = [newMembers[index + 1], newMembers[index]];
    
    try {
      await firestoreService.batchUpdateMembers([
        { id: newMembers[index].id, updates: { order: index } },
        { id: newMembers[index + 1].id, updates: { order: index + 1 } }
      ]);
      setMembers(newMembers);
    } catch (error) {
      console.error("Error moving member down:", error);
    }
  };

  const openEditDialog = (member: Member) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditContribution(member.contribution);
    setEditRank(member.rank || "recruit");
    setIsEditDialogOpen(true);
  };

  // Filter Members
  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRank = rankFilter === 'all' || (m.rank || 'recruit').toLowerCase() === rankFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'paid' && m.hasPaid) || 
      (statusFilter === 'unpaid' && !m.hasPaid);
    
    return matchesSearch && matchesRank && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400 font-rajdhani font-semibold">Loading Syndicate Roster...</p>
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
            <Shield className="w-6 h-6 mr-3 text-red-500" />
            <span className="text-gang-glow">CREW ROSTER & STREET HIERARCHY</span>
          </h2>
          <p className="text-red-300/80 text-sm font-rajdhani font-semibold mt-1">
            Manage street rank promotions, weekly dues contributions, and member loyalty streaks
          </p>
        </div>

        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gang">
                <PlusIcon className="mr-2 h-4 w-4" />
                Recruit Operative
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/95 border border-red-600/50 text-white backdrop-blur-2xl">
              <DialogHeader>
                <DialogTitle className="font-orbitron text-gang-glow text-xl">Recruit New Operative</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="memberName" className="font-orbitron text-xs text-red-400">OPERATIVE ALIAS</Label>
                  <Input
                    id="memberName"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Enter member alias"
                    className="bg-black/60 border-red-900/40 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rank" className="font-orbitron text-xs text-red-400">STREET HIERARCHY RANK</Label>
                  <select
                    id="rank"
                    value={newMemberRank}
                    onChange={(e) => setNewMemberRank(e.target.value)}
                    className="w-full px-3 py-2 bg-black/80 border border-red-900/40 rounded-lg text-white font-rajdhani font-bold"
                  >
                    <option value="leader">👑 Leader</option>
                    <option value="underboss">🗡️ Underboss</option>
                    <option value="enforcer">🔫 Enforcer</option>
                    <option value="hustler">💵 Hustler</option>
                    <option value="recruit">🔰 Recruit</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contribution" className="font-orbitron text-xs text-red-400">WEEKLY DUES TARGET ($)</Label>
                  <Input
                    id="contribution"
                    type="number"
                    value={newMemberContribution}
                    onChange={(e) => setNewMemberContribution(Number(e.target.value))}
                    placeholder="Enter contribution amount"
                    className="bg-black/60 border-red-900/40 text-white"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddMember} className="btn-gang w-full">Confirm Recruitment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Roster Metrics & Hierarchy Composition Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <Users className="w-4 h-4 mr-2 text-red-400" /> Active Crew Members
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-orbitron font-extrabold text-white">{totalMembers}</div>
            <p className="text-xs font-rajdhani text-gray-400 mt-1 font-semibold">
              👑 {leadersCount} Leader | 🗡️ {underbossCount} Underboss | 🔫 {enforcerCount} Enforcers
            </p>
          </CardContent>
        </Card>

        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Dues Collection Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div className="text-3xl font-orbitron font-extrabold text-emerald-400">{collectionPercentage}%</div>
              <span className="text-xs font-orbitron text-gray-300 font-bold bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
                {totalPaid} / {totalMembers} Paid
              </span>
            </div>
            {/* Visual Dues Progress Bar */}
            <div className="w-full bg-black/80 h-2 rounded-full mt-3 overflow-hidden border border-red-900/30">
              <div 
                className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${collectionPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-yellow-400" /> Expected Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-orbitron font-extrabold text-yellow-400">${totalWeeklyAmount.toLocaleString()}</div>
            <p className="text-xs font-rajdhani text-gray-400 mt-1 font-semibold">Weekly dues target sum</p>
          </CardContent>
        </Card>

        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-red-500" /> Soldiers & Recruits
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-orbitron font-extrabold text-white">{soldiersCount}</div>
            <p className="text-xs font-rajdhani text-gray-400 mt-1 font-semibold">Street hustlers & new recruits</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Search & Filter Controls */}
      <Card className="card-gang p-4 border-red-900/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search member alias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/80 border-red-900/40 text-white pl-10 text-sm font-rajdhani font-semibold"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center space-x-2 bg-black/60 px-3 py-1.5 rounded-lg border border-red-900/30 text-xs text-gray-300 font-orbitron">
              <Filter className="w-3.5 h-3.5 text-red-400" />
              <span>RANK:</span>
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-black text-white">All Ranks</option>
                <option value="leader" className="bg-black text-yellow-400">👑 Leader</option>
                <option value="underboss" className="bg-black text-red-400">🗡️ Underboss</option>
                <option value="enforcer" className="bg-black text-blue-400">🔫 Enforcer</option>
                <option value="hustler" className="bg-black text-emerald-400">💵 Hustler</option>
                <option value="recruit" className="bg-black text-gray-300">🔰 Recruit</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-black/60 px-3 py-1.5 rounded-lg border border-red-900/30 text-xs text-gray-300 font-orbitron">
              <span>STATUS:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-black text-white">All Statuses</option>
                <option value="paid" className="bg-black text-emerald-400">Paid Dues Only</option>
                <option value="unpaid" className="bg-black text-red-400">Overdue Dues Only</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Roster Cards List */}
      <div className="space-y-4">
        {filteredMembers.length === 0 ? (
          <Card className="card-gang p-8 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-red-500 opacity-40" />
            <p className="font-orbitron font-semibold">No crew members found matching filter criteria.</p>
          </Card>
        ) : (
          filteredMembers.map((member, index) => {
            const rankStr = (member.rank || 'recruit').toLowerCase();
            const rankIdx = RANK_HIERARCHY.indexOf(rankStr);
            const canPromote = rankIdx < RANK_HIERARCHY.length - 1;
            const canDemote = rankIdx > 0;

            return (
              <Card key={member.id} className={`card-gang p-5 border ${getRankCardBorder(member.rank)} transition-all duration-300`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Member Name & Rank Details */}
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-3">
                        <span className="font-extrabold text-xl text-white font-rajdhani tracking-wide">{member.name}</span>
                        {getRankBadge(member.rank)}
                      </div>
                      
                      <div className="flex items-center space-x-3 text-sm text-red-300/80 mt-1.5 font-rajdhani font-semibold">
                        <span className="text-gray-300 font-bold">${member.contribution.toLocaleString()} / week</span>
                        <span>•</span>
                        <span className="text-xs text-gray-400 font-mono">Joined: {member.joinDate || 'Active'}</span>
                        <span>•</span>
                        {member.hasPaid ? (
                          <span className="text-emerald-400 font-bold flex items-center text-xs bg-emerald-950/40 px-2.5 py-0.5 rounded border border-emerald-500/30">
                            <Flame className="w-3.5 h-3.5 mr-1 text-orange-400 fill-orange-400 animate-pulse" />
                            4-Week Paid Streak
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold flex items-center text-xs bg-red-950/40 px-2.5 py-0.5 rounded border border-red-500/30">
                            <AlertCircle className="w-3.5 h-3.5 mr-1 text-red-400" />
                            Overdue Dues Warning
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Action Controls */}
                  <div className="flex items-center space-x-3">
                    
                    {/* Leader Promotion / Demotion Shortcuts */}
                    {isAdmin && (
                      <div className="flex items-center space-x-1 bg-black/60 p-1 rounded-lg border border-red-900/30">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickRankChange(member, 'promote')}
                          disabled={!canPromote}
                          className="h-8 px-2 text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-30 text-xs font-bold font-orbitron"
                          title="Promote Member Rank"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Promote
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickRankChange(member, 'demote')}
                          disabled={!canDemote}
                          className="h-8 px-2 text-red-400 hover:bg-red-900/30 disabled:opacity-30 text-xs font-bold font-orbitron"
                          title="Demote Member Rank"
                        >
                          <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Demote
                        </Button>
                      </div>
                    )}

                    {/* Dues Status Badge & Toggle */}
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={member.hasPaid ? "bg-emerald-600 text-white font-bold font-orbitron px-3 py-1 text-xs shadow-md" : "bg-red-600 text-white font-bold font-orbitron px-3 py-1 text-xs shadow-md"}
                      >
                        {member.hasPaid ? "✅ PAID" : "⚠️ UNPAID"}
                      </Badge>

                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePaymentStatusChange(member.id, !member.hasPaid)}
                          className="border-red-600/40 text-red-200 hover:bg-red-900/30 font-bold text-xs"
                        >
                          {member.hasPaid ? "Mark Unpaid" : "Mark Paid"}
                        </Button>
                      )}
                    </div>
                    
                    {/* Roster Reordering Buttons */}
                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveMemberUp(index)}
                          disabled={index === 0}
                          className="h-8 w-8 p-0 bg-black/40 border-red-900/40"
                        >
                          <ChevronUpIcon className="h-4 w-4 text-gray-300" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveMemberDown(index)}
                          disabled={index === members.length - 1}
                          className="h-8 w-8 p-0 bg-black/40 border-red-900/40"
                        >
                          <ChevronDownIcon className="h-4 w-4 text-gray-300" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Context Dropdown Menu */}
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-950/40">
                            <DotsVerticalIcon className="h-4 w-4 text-gray-300" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black/95 border-red-600/40 text-white backdrop-blur-xl">
                          <DropdownMenuItem onClick={() => openEditDialog(member)}>
                            <Pencil1Icon className="mr-2 h-4 w-4" />
                            Edit Member & Rank
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteMember(member.id, member.name)}
                            className="text-red-400 focus:text-red-400 focus:bg-red-950/40"
                          >
                            <TrashIcon className="mr-2 h-4 w-4" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-black/95 border border-red-600/50 text-white backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-gang-glow text-xl">Edit Member & Rank</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName" className="font-orbitron text-xs text-red-400">OPERATIVE ALIAS</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter member name"
                className="bg-black/60 border-red-900/40 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRank" className="font-orbitron text-xs text-red-400">STREET HIERARCHY RANK</Label>
              <select
                id="editRank"
                value={editRank}
                onChange={(e) => setEditRank(e.target.value)}
                className="w-full px-3 py-2 bg-black/80 border border-red-900/40 rounded-lg text-white font-rajdhani font-bold"
              >
                <option value="leader">👑 Leader</option>
                <option value="underboss">🗡️ Underboss</option>
                <option value="enforcer">🔫 Enforcer</option>
                <option value="hustler">💵 Hustler</option>
                <option value="recruit">🔰 Recruit</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editContribution" className="font-orbitron text-xs text-red-400">WEEKLY DUES TARGET ($)</Label>
              <Input
                id="editContribution"
                type="number"
                value={editContribution}
                onChange={(e) => setEditContribution(Number(e.target.value))}
                placeholder="Enter contribution amount"
                className="bg-black/60 border-red-900/40 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateMember} className="btn-gang w-full">Update Member Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}