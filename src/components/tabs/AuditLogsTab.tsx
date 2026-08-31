import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Download, 
  ShieldCheck, 
  History, 
  Search, 
  Filter, 
  CheckCircle2, 
  TrendingUp, 
  RefreshCw 
} from "lucide-react";
import { apiService, Member, WeeklyPaymentRecord } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface AuditLogsTabProps {
  isAdmin: boolean;
}

interface MemberLogItem {
  memberId: string;
  memberName: string;
  hasPaid: boolean;
  contribution: number;
  paymentDate?: string;
}

interface WeekAuditLog {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  members: MemberLogItem[];
  totalExpected: number;
  totalCollected: number;
  collectionRate: number;
}

export function AuditLogsTab({ isAdmin }: AuditLogsTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<WeeklyPaymentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [weeksToShow, setWeeksToShow] = useState<number>(12);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [rateFilter, setRateFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Initial Fetch & Realtime Subscriptions
  useEffect(() => {
    let isSubscribed = true;

    // Safety fallback timer to prevent infinite loading state
    const timer = setTimeout(() => {
      if (isSubscribed) setLoading(false);
    }, 800);

    const loadData = async () => {
      try {
        const [membersData, recordsData] = await Promise.all([
          apiService.getMembers().catch(() => []),
          apiService.getWeeklyPaymentRecords().catch(() => [])
        ]);

        if (isSubscribed) {
          setMembers(prev => (Array.isArray(membersData) && membersData.length > 0 ? membersData : (prev.length > 0 ? prev : membersData)));
          setWeeklyRecords(prev => (Array.isArray(recordsData) && recordsData.length > 0 ? recordsData : (prev.length > 0 ? prev : recordsData)));
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading audit data:", err);
        if (isSubscribed) setLoading(false);
      }
    };

    loadData();

    // Subscribe to realtime updates
    const unsubMembers = apiService.subscribeToMembers((newMembers) => {
      if (isSubscribed && Array.isArray(newMembers) && newMembers.length > 0) {
        setMembers(newMembers);
        setLoading(false);
      }
    });

    const unsubRecords = apiService.subscribeToWeeklyPaymentRecords((newRecords) => {
      if (isSubscribed && Array.isArray(newRecords) && newRecords.length > 0) {
        setWeeklyRecords(newRecords);
        setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      unsubMembers();
      unsubRecords();
    };
  }, []);

  // Safe Helper: Format Date String
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // Generate Weekly Audit Logs List
  const generateLogs = (): WeekAuditLog[] => {
    const safeMembers = Array.isArray(members) ? members : [];
    const safeRecords = Array.isArray(weeklyRecords) ? weeklyRecords : [];
    const currentDate = new Date();
    const result: WeekAuditLog[] = [];

    for (let i = 0; i < weeksToShow; i++) {
      const weekNumber = i + 1;
      
      const wStart = new Date(currentDate);
      wStart.setDate(currentDate.getDate() - (currentDate.getDay() + 7 * i));
      wStart.setHours(0, 0, 0, 0);

      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);
      wEnd.setHours(23, 59, 59, 999);

      const weekStartStr = wStart.toISOString().split("T")[0];
      const weekEndStr = wEnd.toISOString().split("T")[0];

      // Build member audit entries
      const memberLogs: MemberLogItem[] = safeMembers.map((m) => {
        const existingRecord = safeRecords.find(
          (r) => r && r.memberId === m.id && r.weekNumber === weekNumber
        );

        if (existingRecord) {
          return {
            memberId: m.id,
            memberName: m.name || "Operative",
            hasPaid: !!existingRecord.hasPaid,
            contribution: existingRecord.contribution || m.contribution || 0,
            paymentDate: existingRecord.paymentDate
          };
        }

        // Default week 1 to member's current status, older weeks default to unpaid
        const isPaid = weekNumber === 1 ? !!m.hasPaid : false;
        return {
          memberId: m.id,
          memberName: m.name || "Operative",
          hasPaid: isPaid,
          contribution: m.contribution || 0,
          paymentDate: isPaid ? weekStartStr : undefined
        };
      });

      const totalExpected = memberLogs.reduce((sum, item) => sum + (item.contribution || 0), 0);
      const totalCollected = memberLogs
        .filter((item) => item.hasPaid)
        .reduce((sum, item) => sum + (item.contribution || 0), 0);

      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

      result.push({
        weekNumber,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        members: memberLogs,
        totalExpected,
        totalCollected,
        collectionRate
      });
    }

    return result;
  };

  const logsList = generateLogs();

  // Grand Overview Totals
  const grandExpected = logsList.reduce((sum, l) => sum + l.totalExpected, 0);
  const grandCollected = logsList.reduce((sum, l) => sum + l.totalCollected, 0);
  const grandEfficiency = grandExpected > 0 ? Math.round((grandCollected / grandExpected) * 100) : 0;

  // Filtered Logs List
  const filteredLogs = logsList.filter((log) => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch =
      searchLower === "" ||
      log.weekNumber.toString().includes(searchLower) ||
      log.members.some((m) => m.memberName.toLowerCase().includes(searchLower));

    const matchesRate =
      rateFilter === "all" ||
      (rateFilter === "high" && log.collectionRate >= 80) ||
      (rateFilter === "low" && log.collectionRate < 80);

    return matchesSearch && matchesRate;
  });

  // Action: Toggle Member Payment Status for specific week
  const handleTogglePayment = async (memberId: string, weekNumber: number, currentPaidStatus: boolean) => {
    const key = `${memberId}-${weekNumber}`;
    setProcessingId(key);

    try {
      const member = members.find((m) => m.id === memberId);
      const newPaid = !currentPaidStatus;

      const currentDate = new Date();
      const wStart = new Date(currentDate);
      wStart.setDate(currentDate.getDate() - (currentDate.getDay() + 7 * (weekNumber - 1)));

      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);

      await apiService.upsertWeeklyPaymentRecord({
        memberId,
        memberName: member?.name || "Operative",
        weekStart: wStart.toISOString().split("T")[0],
        weekEnd: wEnd.toISOString().split("T")[0],
        weekNumber,
        contribution: member?.contribution || 100,
        hasPaid: newPaid,
        paymentDate: newPaid ? new Date().toISOString().split("T")[0] : undefined,
        markedBy: "admin",
        markedAt: new Date().toISOString()
      });

      if (weekNumber === 1 && member) {
        await apiService.updateMember(memberId, { hasPaid: newPaid });
      }

      if (newPaid) soundFx.playCashSound();
    } catch (err) {
      console.error("Error toggling payment:", err);
    } finally {
      setProcessingId(null);
    }
  };

  // Action: Batch Mark Entire Week Paid
  const handleBatchMarkWeekPaid = async (weekNumber: number) => {
    const targetLog = logsList.find((l) => l.weekNumber === weekNumber);
    if (!targetLog) return;

    soundFx.playCashSound();
    for (const m of targetLog.members) {
      if (!m.hasPaid) {
        await handleTogglePayment(m.memberId, weekNumber, false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400 font-rajdhani font-semibold">Loading Operations Audit Trail...</p>
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
            <ShieldCheck className="w-6 h-6 mr-3 text-red-500" />
            <span className="text-gang-glow">HISTORICAL OPERATIONAL AUDIT TRAIL</span>
          </h2>
          <p className="text-red-300/80 text-sm font-rajdhani font-semibold mt-1">
            Weekly dues collection records & historical audit logs - Showing {logsList.length} weeks
          </p>
        </div>

        <Button
          onClick={() => apiService.downloadAuditLogsCsv()}
          className="btn-gang-outline flex items-center shrink-0"
        >
          <Download className="w-4 h-4 mr-2" /> Export Audit CSV Report
        </Button>
      </div>

      {/* Summary Metrics & Historical Efficiency Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-red-400" /> Weeks Tracked
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-orbitron font-extrabold text-white">
              {logsList.length}
            </div>
            <p className="text-xs font-rajdhani text-gray-400 mt-1 font-semibold">Tracked weekly cycles</p>
          </CardContent>
        </Card>

        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-yellow-400" /> Historical Expected
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-orbitron font-extrabold text-yellow-400">
              ${grandExpected.toLocaleString()}
            </div>
            <p className="text-xs font-rajdhani text-gray-400 mt-1 font-semibold">Total expected dues target</p>
          </CardContent>
        </Card>

        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" /> Total Dues Collected
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-orbitron font-extrabold text-emerald-400">
              ${grandCollected.toLocaleString()}
            </div>
            <p className="text-xs font-rajdhani text-gray-400 mt-1 font-semibold">Total collected dues sum</p>
          </CardContent>
        </Card>

        <Card className="card-gang p-5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-orbitron uppercase text-gray-400 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-emerald-400" /> Collection Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-orbitron font-extrabold text-emerald-400">
              {grandEfficiency}%
            </div>
            <div className="w-full bg-black/80 h-2 rounded-full mt-3 overflow-hidden border border-red-900/30">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${grandEfficiency}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Control Bar */}
      <Card className="card-gang p-4 border-red-900/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search member or week..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/80 border-red-900/40 text-white pl-10 text-sm font-rajdhani font-semibold"
            />
          </div>

          <div className="flex items-center space-x-2 bg-black/60 px-3 py-1.5 rounded-lg border border-red-900/30 text-xs text-gray-300 font-orbitron">
            <Filter className="w-3.5 h-3.5 text-red-400" />
            <span>COLLECTION RATE:</span>
            <select
              value={rateFilter}
              onChange={(e) => setRateFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-black text-white">All Rates</option>
              <option value="high" className="bg-black text-emerald-400">Target Met (80%+)</option>
              <option value="low" className="bg-black text-red-400">Needs Attention (&lt;80%)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Weekly Audit Cards List */}
      <div className="space-y-6">
        {filteredLogs.length === 0 ? (
          <Card className="card-gang p-8 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 text-red-500 opacity-40" />
            <p className="font-orbitron font-semibold text-lg text-white">No Audit Logs Match Criteria</p>
            <p className="text-sm font-rajdhani text-gray-400 mt-1">Try clearing your search terms or filter selection</p>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.weekNumber} className="card-gang p-5 border border-red-900/30 hover:border-red-600/40 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-red-900/30 gap-3 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-950/60 rounded-lg border border-red-600/30 text-red-400">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-orbitron font-extrabold text-white text-base flex items-center">
                      WEEK {log.weekNumber}{" "}
                      <span className="text-gray-400 text-sm font-rajdhani ml-2">
                        ({formatDate(log.weekStart)} - {formatDate(log.weekEnd)})
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-emerald-400 font-orbitron font-bold text-sm">
                    ${log.totalCollected.toLocaleString()}{" "}
                    <span className="text-gray-400 font-normal">/ ${log.totalExpected.toLocaleString()}</span>
                  </div>

                  <Badge
                    className={
                      log.collectionRate >= 80
                        ? "bg-emerald-600 text-white font-bold font-orbitron px-3 py-1"
                        : "bg-red-600 text-white font-bold font-orbitron px-3 py-1"
                    }
                  >
                    {log.collectionRate}% COLLECTED
                  </Badge>

                  {isAdmin && log.collectionRate < 100 && (
                    <Button
                      size="sm"
                      onClick={() => handleBatchMarkWeekPaid(log.weekNumber)}
                      className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-orbitron"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark All Paid
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-black/80 h-1.5 rounded-full mb-4 overflow-hidden border border-red-900/20">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, log.collectionRate)}%` }}
                />
              </div>

              {/* Member Dues Rows */}
              <div className="space-y-2">
                {log.members.map((m) => {
                  const key = `${m.memberId}-${log.weekNumber}`;
                  const isProcessing = processingId === key;

                  return (
                    <div
                      key={m.memberId}
                      className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-red-900/20 hover:border-red-600/30 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        {m.hasPaid ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <div>
                          <h4 className="font-rajdhani font-extrabold text-white text-base">{m.memberName}</h4>
                          {m.paymentDate && (
                            <p className="text-xs text-gray-400 font-semibold font-rajdhani">
                              Paid: {formatDate(m.paymentDate)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-orbitron font-bold text-red-400 text-sm">
                            ${m.contribution.toLocaleString()}
                          </div>
                        </div>

                        {isAdmin ? (
                          <Button
                            size="sm"
                            onClick={() => handleTogglePayment(m.memberId, log.weekNumber, m.hasPaid)}
                            disabled={isProcessing}
                            className={
                              m.hasPaid
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                                : "btn-gang-outline hover:bg-emerald-950/40 text-xs"
                            }
                          >
                            {isProcessing ? "Updating..." : m.hasPaid ? "✅ Mark Unpaid" : "💰 Mark Paid"}
                          </Button>
                        ) : (
                          <Badge
                            className={
                              m.hasPaid
                                ? "bg-emerald-600 text-white font-bold text-xs"
                                : "bg-red-600 text-white font-bold text-xs"
                            }
                          >
                            {m.hasPaid ? "Paid" : "Pending"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Load More Button */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={() => setWeeksToShow((prev) => prev + 12)}
          className="btn-gang-outline"
        >
          Load More Audit History
        </Button>
      </div>
    </div>
  );
}
