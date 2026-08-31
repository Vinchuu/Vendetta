import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Radio, 
  Tv, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Play, 
  Users, 
  Video, 
  Flame, 
  Sparkles, 
  CheckCircle2,
  Eye,
  Search,
  Filter
} from "lucide-react";
import { apiService, StreamChannel } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

interface StreamsTabProps {
  userMode: "admin" | "gangmember" | "viewer2";
}

export function StreamsTab({ userMode }: StreamsTabProps) {
  const [streams, setStreams] = useState<StreamChannel[]>([]);
  const [selectedStream, setSelectedStream] = useState<StreamChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Form State
  const [memberName, setMemberName] = useState("");
  const [platform, setPlatform] = useState<"kick" | "youtube" | "twitch">("kick");
  const [title, setTitle] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const canAdd = userMode === "admin" || userMode === "gangmember";
  const isLeader = userMode === "admin";

  const LOCAL_STORAGE_STREAMS_KEY = "vendetta_streams_registry_v2";

  // Helper: Read stored streams from localStorage
  const getStoredLocalStreams = (): StreamChannel[] => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_STREAMS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error reading localStorage streams:", e);
    }
    return [];
  };

  // Helper: Save streams list to localStorage
  const saveStoredLocalStreams = (list: StreamChannel[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_STREAMS_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Error writing localStorage streams:", e);
    }
  };

  // Helper: Merge API and Local streams safely without duplicates
  const mergeStreams = (apiList: StreamChannel[], localList: StreamChannel[]): StreamChannel[] => {
    const combined = [...localList, ...apiList];
    const seen = new Set<string>();
    const unique: StreamChannel[] = [];

    for (const item of combined) {
      if (!item || !item.channelSlug) continue;
      const key = `${item.platform}-${item.channelSlug.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    if (unique.length === 0) {
      return getInitialFallbackStreams();
    }
    return unique;
  };

  useEffect(() => {
    let isSubscribed = true;

    const timer = setTimeout(() => {
      if (isSubscribed) setLoading(false);
    }, 800);

    const loadStreams = async () => {
      try {
        const data = await apiService.getStreams().catch(() => []);
        if (isSubscribed) {
          const apiList = Array.isArray(data) ? data : [];
          const localList = getStoredLocalStreams();
          const merged = mergeStreams(apiList, localList);

          setStreams(merged);
          saveStoredLocalStreams(merged);

          if (merged.length > 0 && !selectedStream) {
            setSelectedStream(merged[0]);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading streams:", err);
        if (isSubscribed) {
          const localList = getStoredLocalStreams();
          const merged = mergeStreams([], localList);
          setStreams(merged);
          if (!selectedStream && merged.length > 0) setSelectedStream(merged[0]);
          setLoading(false);
        }
      }
    };

    loadStreams();

    const unsub = apiService.subscribeToStreams((newStreams) => {
      if (isSubscribed && Array.isArray(newStreams)) {
        const localList = getStoredLocalStreams();
        const merged = mergeStreams(newStreams, localList);
        setStreams(merged);
        saveStoredLocalStreams(merged);
        if (!selectedStream || !merged.some(s => s.id === selectedStream.id)) {
          if (merged.length > 0) setSelectedStream(merged[0]);
        }
        setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      unsub();
    };
  }, []);

  const getInitialFallbackStreams = (): StreamChannel[] => [
    {
      id: "stream_1",
      memberName: "Tatya Vinchu",
      platform: "kick",
      channelSlug: "vendetta",
      title: "🔴 VENDETTA LEADER | SoulCity GTA RP Patrol",
      isLive: true,
      addedBy: "Leader",
      createdAt: new Date().toISOString()
    },
    {
      id: "stream_2",
      memberName: "Baba Niranjana",
      platform: "youtube",
      channelSlug: "dQw4w9WgXcQ",
      title: "🗡️ SYNDICATE HEIST & PATROL",
      isLive: true,
      addedBy: "Underboss",
      createdAt: new Date().toISOString()
    }
  ];

  // Robust URL / Slug Parser for Kick, YouTube, Twitch
  const parseChannelSlug = (rawInput: string, targetPlatform: "kick" | "youtube" | "twitch"): string => {
    let str = rawInput.trim();
    if (!str) return "vendetta";

    try {
      if (targetPlatform === "kick") {
        // e.g. https://kick.com/xqc or kick.com/xqc or xqc
        const match = str.match(/kick\.com\/([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) return match[1].replace('@', '');
        return str.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^kick\.com\//i, '').replace(/\/.*/, '').replace('@', '');
      } else if (targetPlatform === "twitch") {
        // e.g. https://twitch.tv/shroud or twitch.tv/shroud or shroud
        const match = str.match(/twitch\.tv\/([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) return match[1];
        return str.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^twitch\.tv\//i, '').replace(/\/.*/, '');
      } else {
        // YouTube: https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID or @handle
        if (str.includes("v=")) {
          const params = new URLSearchParams(str.split("?")[1]);
          const v = params.get("v");
          if (v) return v;
        }
        if (str.includes("youtu.be/")) {
          const parts = str.split("youtu.be/");
          if (parts[1]) return parts[1].split("?")[0].split("/")[0];
        }
        if (str.includes("/embed/")) {
          const parts = str.split("/embed/");
          if (parts[1]) return parts[1].split("?")[0].split("/")[0];
        }
        return str.replace(/^https?:\/\//i, '').replace(/^www\.youtube\.com\//i, '').replace(/^youtube\.com\//i, '');
      }
    } catch {
      return str;
    }
  };

  // Action: Add Stream Channel (Optimistic UI Update)
  const handleAddStream = async () => {
    const alias = memberName.trim() || "Vendetta Operative";
    const rawUrl = urlInput.trim();

    if (!rawUrl) {
      alert("Please enter a stream link or channel username.");
      return;
    }

    setIsPublishing(true);
    const slug = parseChannelSlug(rawUrl, platform);

    const newStreamObj: StreamChannel = {
      id: `stream_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      memberName: alias,
      platform,
      channelSlug: slug || "vendetta",
      title: title.trim() || `${alias}'s Live Stream`,
      isLive: true,
      addedBy: userMode === "admin" ? "Leader" : "Gang Member",
      createdAt: new Date().toISOString()
    };

    // Optimistically update UI & localStorage so stream stays saved permanently across logouts/refreshes
    soundFx.playSuccessSound();
    setStreams(prev => {
      const updated = [newStreamObj, ...prev];
      saveStoredLocalStreams(updated);
      return updated;
    });
    setSelectedStream(newStreamObj);

    setMemberName("");
    setTitle("");
    setUrlInput("");
    setIsAddOpen(false);
    setIsPublishing(false);

    // Save to server in background
    try {
      await apiService.addStream({
        memberName: newStreamObj.memberName,
        platform: newStreamObj.platform,
        channelSlug: newStreamObj.channelSlug,
        title: newStreamObj.title,
        isLive: true,
        addedBy: newStreamObj.addedBy
      });
    } catch (err) {
      console.warn("Background stream save note:", err);
    }
  };

  // Action: Delete Stream Channel
  const handleDeleteStream = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}'s stream?`)) return;

    soundFx.playGunSound();
    setStreams(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveStoredLocalStreams(updated);
      if (selectedStream?.id === id) {
        setSelectedStream(updated[0] || null);
      }
      return updated;
    });

    try {
      await apiService.deleteStream(id);
    } catch (err) {
      console.warn("Error deleting stream:", err);
    }
  };

  // Generate Embed IFrame Source URL
  const getEmbedUrl = (stream: StreamChannel): string => {
    const slug = stream.channelSlug || "vendetta";
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";

    if (stream.platform === "kick") {
      return `https://player.kick.com/${slug}`;
    } else if (stream.platform === "twitch") {
      return `https://player.twitch.tv/?channel=${slug}&parent=${host}&autoplay=true&muted=false`;
    } else {
      // YouTube Embed
      if (slug.length === 11 && !slug.includes("/") && !slug.startsWith("@")) {
        return `https://www.youtube.com/embed/${slug}?autoplay=1&mute=0`;
      }
      return `https://www.youtube.com/embed/live_stream?channel=${slug}`;
    }
  };

  // External Direct Watch Link
  const getExternalUrl = (stream: StreamChannel): string => {
    const slug = stream.channelSlug || "vendetta";
    if (stream.platform === "kick") {
      return `https://kick.com/${slug}`;
    } else if (stream.platform === "twitch") {
      return `https://twitch.tv/${slug}`;
    } else {
      if (slug.length === 11 && !slug.includes("/")) {
        return `https://www.youtube.com/watch?v=${slug}`;
      }
      return `https://www.youtube.com/${slug.startsWith("@") ? slug : "@" + slug}`;
    }
  };

  // Filtered Streams
  const filteredStreams = streams.filter(s => {
    const matchesSearch = searchQuery === "" || 
      s.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesPlatform = platformFilter === "all" || s.platform === platformFilter;

    return matchesSearch && matchesPlatform;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400 font-rajdhani font-semibold">Loading Vendetta TV SoulCity Live Streams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner - SoulCity Live Theme */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/60 backdrop-blur-xl p-6 rounded-2xl border border-red-900/40 shadow-2xl">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="text-2xl font-extrabold tracking-wider text-white font-orbitron flex items-center">
              <span className="text-gang-glow">VENDETTA TV | SOULCITY LIVE STREAMS</span>
            </h2>
          </div>
          <p className="text-red-300/80 text-sm font-rajdhani font-semibold">
            Watch operative live broadcasts from Kick, YouTube & Twitch - {streams.length} channels registered
          </p>
        </div>

        {canAdd && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gang flex items-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                <Plus className="w-4 h-4 mr-2" /> Register My Live Channel
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/95 border border-red-600/50 text-white backdrop-blur-2xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-orbitron text-gang-glow text-xl">Register Operative Live Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="sMemberName" className="font-orbitron text-xs text-red-400 uppercase">OPERATIVE ALIAS / MEMBER NAME</Label>
                  <Input
                    id="sMemberName"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="e.g. Tatya Vinchu"
                    className="bg-black/60 border-red-900/40 text-white font-rajdhani font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sPlatform" className="font-orbitron text-xs text-red-400 uppercase">STREAM PLATFORM</Label>
                  <select
                    id="sPlatform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-lg border border-red-900/40 bg-black/80 text-white font-rajdhani font-bold"
                  >
                    <option value="kick">🟢 Kick.com</option>
                    <option value="youtube">🔴 YouTube.com</option>
                    <option value="twitch">🟣 Twitch.tv</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sTitle" className="font-orbitron text-xs text-red-400 uppercase">STREAM TITLE (OPTIONAL)</Label>
                  <Input
                    id="sTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. GTA RP SoulCity Live Patrol"
                    className="bg-black/60 border-red-900/40 text-white font-rajdhani font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sUrl" className="font-orbitron text-xs text-red-400 uppercase">CHANNEL URL / LINK / USERNAME</Label>
                  <Input
                    id="sUrl"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={
                      platform === "kick" ? "kick.com/your_username" : 
                      platform === "twitch" ? "twitch.tv/your_username" : 
                      "youtube.com/watch?v=VIDEO_ID"
                    }
                    className="bg-black/60 border-red-900/40 text-white font-rajdhani font-semibold"
                  />
                  <p className="text-[11px] text-gray-400 font-rajdhani">
                    Paste your Kick link, Twitch link, or YouTube live link. Operative channels go live instantly!
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddStream} 
                  disabled={isPublishing} 
                  className="btn-gang w-full py-3"
                >
                  {isPublishing ? "Publishing..." : "🔴 Publish Channel To Live"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Main SoulCity Style Hero Stage Video Player */}
      {selectedStream ? (
        <Card className="card-gang overflow-hidden border border-red-600/50 shadow-[0_0_35px_rgba(220,38,38,0.3)]">
          <div className="p-4 bg-black/90 border-b border-red-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <div>
                <h3 className="font-orbitron font-extrabold text-lg text-white flex items-center">
                  {selectedStream.title || `${selectedStream.memberName}'s Live Stream`}
                </h3>
                <p className="text-xs font-rajdhani text-gray-300 font-semibold mt-0.5">
                  Operative: <span className="text-red-400 font-bold">{selectedStream.memberName}</span> • Platform:{" "}
                  <span className={
                    selectedStream.platform === "kick" ? "text-emerald-400 font-bold uppercase" : 
                    selectedStream.platform === "twitch" ? "text-purple-400 font-bold uppercase" : 
                    "text-red-400 font-bold uppercase"
                  }>
                    {selectedStream.platform}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={getExternalUrl(selectedStream)}
                target="_blank"
                rel="noreferrer"
                className="btn-gang-outline text-xs flex items-center shrink-0"
              >
                Watch External <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </a>
            </div>
          </div>

          {/* IFrame Stage Player */}
          <div className="relative w-full aspect-video bg-black flex items-center justify-center">
            <iframe
              src={getEmbedUrl(selectedStream)}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title={selectedStream.title || "Live Stream"}
            />
          </div>
        </Card>
      ) : (
        <Card className="card-gang p-12 text-center text-gray-400">
          <Tv className="w-16 h-16 mx-auto mb-4 text-red-500 opacity-40" />
          <h3 className="font-orbitron text-xl text-white font-extrabold mb-2">No Live Streams Available</h3>
          <p className="text-sm font-rajdhani text-gray-400">
            {canAdd ? "Click 'Register My Live Channel' above to publish your stream!" : "Check back soon when Vendetta operatives go live!"}
          </p>
        </Card>
      )}

      {/* Filter Bar & Roster Grid */}
      <Card className="card-gang p-4 border-red-900/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search streamer or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/80 border-red-900/40 text-white pl-10 text-sm font-rajdhani font-semibold"
            />
          </div>

          <div className="flex items-center space-x-2 bg-black/60 px-3 py-1.5 rounded-lg border border-red-900/30 text-xs text-gray-300 font-orbitron">
            <Filter className="w-3.5 h-3.5 text-red-400" />
            <span>PLATFORM:</span>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-black text-white">All Platforms</option>
              <option value="kick" className="bg-black text-emerald-400">🟢 Kick</option>
              <option value="youtube" className="bg-black text-red-400">🔴 YouTube</option>
              <option value="twitch" className="bg-black text-purple-400">🟣 Twitch</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Operative Streams Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-orbitron font-extrabold text-lg text-white flex items-center">
            <Video className="w-5 h-5 mr-2 text-red-400" />
            LIVE OPERATIVES DIRECTORY ({filteredStreams.length})
          </h3>
        </div>

        {filteredStreams.length === 0 ? (
          <Card className="card-gang p-8 text-center text-gray-400">
            <Video className="w-12 h-12 mx-auto mb-3 text-red-500 opacity-40" />
            <p className="font-orbitron font-semibold text-lg text-white">No Operative Streams Match Filter</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStreams.map((s) => {
              const isSelected = selectedStream?.id === s.id;

              return (
                <Card
                  key={s.id}
                  className={`card-gang p-5 border transition-all duration-300 ${
                    isSelected
                      ? "border-red-500/80 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                      : "border-red-900/30 hover:border-red-600/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge
                      className={
                        s.platform === "kick"
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs uppercase"
                          : s.platform === "twitch"
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs uppercase"
                          : "bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs uppercase"
                      }
                    >
                      {s.platform === "kick" ? "🟢 Kick" : s.platform === "twitch" ? "🟣 Twitch" : "🔴 YouTube"}
                    </Badge>

                    <div className="flex items-center space-x-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                      <span className="text-xs font-orbitron font-bold text-red-400 uppercase">LIVE</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-orbitron font-extrabold text-white text-base truncate">{s.memberName}</h4>
                    <p className="text-xs font-rajdhani text-gray-400 font-semibold line-clamp-2 mt-1">
                      {s.title || "GTA RP Live Stream"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-red-900/30">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedStream(s);
                        soundFx.playGunSound();
                      }}
                      className={isSelected ? "btn-gang text-xs font-bold font-orbitron flex-1" : "btn-gang-outline text-xs font-bold font-orbitron flex-1"}
                    >
                      <Play className="w-3.5 h-3.5 mr-1" /> {isSelected ? "Now Playing" : "Switch Stage Player"}
                    </Button>

                    <a
                      href={getExternalUrl(s)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-black/60 hover:bg-black/90 border border-red-900/40 rounded-lg text-gray-300 hover:text-white transition-all"
                      title="Open External Stream"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {isLeader && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStream(s.id, s.memberName)}
                        className="h-8 w-8 p-0 text-red-400 hover:bg-red-950/40"
                        title="Remove Channel (Leader Only)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
