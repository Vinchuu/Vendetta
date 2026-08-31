import { useState, useEffect } from 'react';
import { Users, DollarSign, ShoppingCart, Shield, Lock, FileText, Volume2, VolumeX, Megaphone, Edit, Save, X, Radio } from 'lucide-react';
import { LoginModal } from './components/auth/LoginScreen';
import { MembersTab } from './components/tabs/MembersTab';
import { ExpendituresTab } from './components/tabs/ExpendituresTab';
import { OrdersTab } from './components/tabs/OrdersTab';
import { AuditLogsTab } from './components/tabs/AuditLogsTab';
import { StreamsTab } from './components/tabs/StreamsTab';
import { Toaster } from './components/ui/toaster';
import { apiService, Announcement } from './lib/apiService';
import { soundFx } from './lib/soundEffects';
import './styles/globals.css';

export type UserMode = 'admin' | 'gangmember' | 'viewer2';

function App() {
  const [userMode, setUserMode] = useState<UserMode>('viewer2');
  const [discordUser, setDiscordUser] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState('members');
  const [isMuted, setIsMuted] = useState(soundFx.isMuted());

  // Announcement State
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementInput, setAnnouncementInput] = useState("");

  // System status metrics
  const [fundBalance, setFundBalance] = useState<number>(0);
  const [membersCount, setMembersCount] = useState<number>(0);

  // Handle Discord OAuth Callback (URL Hash or query params) on page load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Process Discord OAuth2 Implicit Grant from URL Hash (#access_token=...&state=...)
      if (window.location.hash.includes('access_token')) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const targetMode = (hashParams.get('state') || 'gangmember') as UserMode;

        if (accessToken) {
          fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
            .then(res => res.json())
            .then(userData => {
              const username = userData.global_name || userData.username || 'DiscordUser';
              const discordId = userData.id;

              const adminIds = ['879604109366394880'];
              const memberIds = ['879604109366394880'];

              const isAdmin = adminIds.includes(discordId);
              const isMember = memberIds.includes(discordId);

              let finalMode: UserMode = 'gangmember';
              if (targetMode === 'admin') {
                if (!isAdmin) {
                  alert(`Access Denied: Discord ID ${discordId} (${username}) is not authorized for Leader access.`);
                  window.history.replaceState({}, document.title, window.location.pathname);
                  return;
                }
                finalMode = 'admin';
              } else {
                if (!isMember && !isAdmin) {
                  alert(`Access Denied: Discord ID ${discordId} (${username}) is not authorized for Member access.`);
                  window.history.replaceState({}, document.title, window.location.pathname);
                  return;
                }
                finalMode = 'gangmember';
              }

              setUserMode(finalMode);
              setDiscordUser(username);
              window.history.replaceState({}, document.title, window.location.pathname);
              soundFx.playSuccessSound();
            })
            .catch(err => {
              console.error('Discord Auth fetch failed:', err);
              window.history.replaceState({}, document.title, window.location.pathname);
            });
        }
      }

      // 2. Process query params fallback (?token=...&mode=...&username=...)
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const mode = params.get('mode') as UserMode | null;
      const username = params.get('username');
      const authError = params.get('auth_error');

      if (authError) {
        alert(authError);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (token && mode && (mode === 'admin' || mode === 'gangmember')) {
        setUserMode(mode);
        if (username) setDiscordUser(username);
        window.history.replaceState({}, document.title, window.location.pathname);
        soundFx.playSuccessSound();
      }
    }

    // Fetch initial metrics
    apiService.getGangFund().then(fund => {
      if (fund) setFundBalance(fund.totalAmount || fund.baseAmount || 0);
    }).catch(console.error);

    apiService.getMembers().then(m => setMembersCount(m.length)).catch(console.error);

    // Fetch and subscribe to live Gang Announcements
    apiService.getAnnouncement().then(data => {
      setAnnouncement(data);
      if (data) setAnnouncementInput(data.text);
    }).catch(console.error);

    const unsubAnnouncement = apiService.subscribeToAnnouncement((newAnnouncement) => {
      setAnnouncement(newAnnouncement);
      if (newAnnouncement) setAnnouncementInput(newAnnouncement.text);
    });

    const unsubFund = apiService.subscribeToGangFund((fund) => {
      if (fund) setFundBalance(fund.totalAmount || fund.baseAmount || 0);
    });

    const unsubMembers = apiService.subscribeToMembers((m) => {
      setMembersCount(m.length);
    });

    return () => {
      unsubAnnouncement();
      unsubFund();
      unsubMembers();
    };
  }, []);

  const toggleSound = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
    if (!muted) soundFx.playSuccessSound();
  };

  const handleLogin = (mode: UserMode) => {
    setUserMode(mode);
    setShowLoginModal(false);
    soundFx.playSuccessSound();
  };

  const handleLogout = () => {
    setUserMode('viewer2');
    setDiscordUser(null);
    setShowLoginModal(false);
    setActiveTab('members');
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementInput.trim()) return;
    try {
      const updated = await apiService.updateAnnouncement(
        announcementInput.trim(), 
        discordUser ? `Leader (${discordUser})` : 'Leader'
      );
      setAnnouncement(updated);
      setIsEditingAnnouncement(false);
      soundFx.playSuccessSound();
    } catch (err) {
      console.error('Error saving announcement:', err);
      alert('Failed to save announcement.');
    }
  };

  const getAllTabs = () => [
    { id: 'members', label: 'Crew & Ranks', icon: Users },
    { id: 'expenditures', label: 'Treasury & Vault', icon: DollarSign },
    { id: 'orders', label: 'Arsenal & Syndicate Deals', icon: ShoppingCart },
    { id: 'streams', label: 'Live Streams 🔴', icon: Radio },
    { id: 'audit-logs', label: 'Operations Log', icon: FileText },
  ];

  const getVisibleTabs = () => {
    const allTabs = getAllTabs();
    if (userMode === 'admin' || userMode === 'gangmember') {
      return allTabs;
    } else {
      return allTabs.filter(tab => tab.id !== 'orders');
    }
  };

  const tabs = getVisibleTabs();
  const isAdmin = userMode === 'admin';

  return (
    <>
      <div className="min-h-screen bg-cyber-grid bg-black text-white relative selection:bg-red-600 selection:text-white">
        {/* Ambient Top Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-red-600/10 blur-[120px] pointer-events-none rounded-full" />

        {/* Login Modal */}
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)} 
          onLogin={handleLogin} 
        />

        {/* Top Studio Header Bar */}
        <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-red-900/40 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              
              {/* Brand Logo & Name */}
              <div className="flex items-center space-x-4">
                <div className="relative group cursor-pointer">
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl blur opacity-70 group-hover:opacity-100 transition duration-300"></div>
                  <img
                    src="/logo.png"
                    alt="Vendetta Logo"
                    className="relative w-12 h-12 rounded-xl object-cover border border-red-500/50 shadow-md"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-wider font-orbitron text-gang-glow">
                    VENDETTA
                  </h1>
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <p className="text-xs font-rajdhani font-semibold text-red-400 tracking-[0.2em] uppercase">
                      Welcome to paradise
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Right Side Tools & Auth Controls */}
              <div className="flex items-center space-x-3">
                {/* Live Real-time Status Badge */}
                <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-black/60 rounded-lg border border-red-900/30 text-xs font-orbitron text-gray-300">
                  <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span className="text-red-400">SSE LIVE</span>
                </div>

                {/* Sound FX Controller */}
                <button
                  onClick={toggleSound}
                  className="p-2.5 bg-red-950/40 hover:bg-red-900/60 rounded-xl border border-red-600/40 text-red-300 hover:text-white transition-all duration-200 shadow-md hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                  title={isMuted ? "Unmute Sound FX" : "Mute Sound FX"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                </button>

                {/* User Mode Pill */}
                <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-red-950/60 rounded-xl border border-red-600/40 backdrop-blur-md shadow-md">
                  {userMode === 'admin' ? (
                    <>
                      <Shield className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-bold font-rajdhani text-yellow-400">
                        {discordUser ? `Leader (${discordUser})` : 'Leader'}
                      </span>
                    </>
                  ) : userMode === 'gangmember' ? (
                    <>
                      <Users className="w-4 h-4 text-red-300" />
                      <span className="text-sm font-bold font-rajdhani text-red-300">
                        {discordUser ? `Member (${discordUser})` : 'Gang Member'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-400">Guest Viewer</span>
                    </>
                  )}
                </div>
                
                {/* Auth CTAs */}
                {userMode === 'viewer2' ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.location.href = apiService.getDiscordLoginUrl('gangmember')}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#5865F2] to-[#4752C4] hover:from-[#4752C4] hover:to-[#3b44a9] text-white rounded-xl transition-all duration-200 shadow-lg font-rajdhani font-bold text-sm"
                      title="Login with Discord"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      <span>Discord Login</span>
                    </button>
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="px-3.5 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-xl border border-red-600/40 transition-all text-xs font-bold font-rajdhani"
                      title="Leader Login"
                    >
                      Leader Key
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-red-950/60 hover:bg-red-900/80 text-red-400 rounded-xl border border-red-600/50 transition-all duration-200 shadow-md"
                    title="Switch to Guest Mode"
                  >
                    <Lock className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-bold font-rajdhani">Dip Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Live Tactical Command Directive Ticker */}
        <div className="bg-gradient-to-r from-red-950/90 via-black/90 to-red-950/90 border-b border-red-600/50 text-white px-4 py-3 backdrop-blur-xl shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 flex-1 overflow-hidden">
              <div className="p-1.5 bg-red-600/30 rounded-lg border border-red-500/50 shrink-0">
                <Megaphone className="w-4 h-4 text-yellow-400 animate-pulse" />
              </div>
              
              {isEditingAnnouncement && isAdmin ? (
                <div className="flex items-center space-x-2 flex-1">
                  <input
                    type="text"
                    value={announcementInput}
                    onChange={(e) => setAnnouncementInput(e.target.value)}
                    className="bg-black/80 border border-red-500 text-white px-3 py-1.5 rounded-lg text-sm flex-1 font-rajdhani font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter live command directive..."
                  />
                  <button
                    onClick={handleSaveAnnouncement}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center shadow-md"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" /> Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingAnnouncement(false);
                      if (announcement) setAnnouncementInput(announcement.text);
                    }}
                    className="px-2.5 py-1.5 bg-gray-800 text-white rounded-lg text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="truncate flex items-center">
                  <span className="font-orbitron font-extrabold text-yellow-400 text-xs tracking-wider uppercase mr-3 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">
                    COMMAND DIRECTIVE:
                  </span>
                  <span className="font-rajdhani font-bold text-sm text-red-100 tracking-wide">
                    {announcement?.text || "🔥 VENDETTA GANG ORDERS: Pay weekly dues & prepare for Syndicate meeting!"}
                  </span>
                  {announcement?.updatedBy && (
                    <span className="text-xs text-red-300/70 ml-2 italic font-semibold shrink-0">
                      - {announcement.updatedBy}
                    </span>
                  )}
                </div>
              )}
            </div>

            {isAdmin && !isEditingAnnouncement && (
              <button
                onClick={() => setIsEditingAnnouncement(true)}
                className="px-3.5 py-1.5 bg-red-900/60 hover:bg-red-800/80 text-red-200 rounded-lg text-xs font-bold border border-red-600/50 flex items-center shrink-0 shadow-sm transition-all"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Directive
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Operational Quick Stats Strip */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/60 border border-red-900/30 rounded-xl p-4 flex items-center space-x-4 backdrop-blur-md">
              <div className="p-3 bg-red-950/60 rounded-xl border border-red-600/30 text-red-400">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 font-orbitron">Treasury Vault</p>
                <p className="text-xl font-extrabold font-orbitron text-emerald-400">${fundBalance.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-black/60 border border-red-900/30 rounded-xl p-4 flex items-center space-x-4 backdrop-blur-md">
              <div className="p-3 bg-red-950/60 rounded-lg border border-red-600/30 text-red-400">
                <Users className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 font-orbitron">Active Crew</p>
                <p className="text-xl font-extrabold font-orbitron text-white">{membersCount} Members</p>
              </div>
            </div>
          </div>
        </div>

        {/* Studio Tactical Pill Navigation Bar */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-black/70 backdrop-blur-xl p-1.5 rounded-2xl border border-red-900/40 flex space-x-2 overflow-x-auto shadow-2xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    soundFx.playGunSound();
                  }}
                  className={`flex items-center space-x-2.5 px-6 py-3 rounded-xl transition-all duration-300 font-rajdhani text-base font-bold whitespace-nowrap flex-1 justify-center ${
                    isActive
                      ? 'bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-red-500/50'
                      : 'text-gray-400 hover:text-white hover:bg-red-950/30'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-red-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Operational Workspace */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {activeTab === 'members' && (
            <MembersTab
              isAdmin={isAdmin}
            />
          )}
          
          {activeTab === 'expenditures' && (
            <ExpendituresTab
              isAdmin={isAdmin}
            />
          )}
          
          {activeTab === 'orders' && (userMode === 'admin' || userMode === 'gangmember') && (
            <OrdersTab
              userMode={userMode}
            />
          )}
          
          {activeTab === 'streams' && (
            <StreamsTab
              userMode={userMode}
            />
          )}

          {activeTab === 'audit-logs' && (
            <AuditLogsTab
              isAdmin={isAdmin}
            />
          )}
        </main>

        {/* Studio Footer Bar */}
        <footer className="bg-black/90 border-t border-red-900/40 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400 gap-3">
            <div className="flex items-center space-x-3">
              <span className="font-orbitron text-xs font-bold text-red-500 uppercase tracking-widest">
                VENDETTA SYSTEM
              </span>
              <span className="text-gray-600">•</span>
              <p className="font-rajdhani font-semibold text-gray-300">Welcome to Paradise 🔴</p>
            </div>
            <p className="text-gray-400 text-right font-rajdhani font-semibold">
              Created By Tatya Vinchu <span className="text-red-400">(@Om006)</span>
            </p>
          </div>
        </footer>
      </div>

      <Toaster />
    </>
  );
}

export default App;
