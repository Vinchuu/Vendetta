import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Shield, Users } from "lucide-react";
import { apiService } from "@/lib/apiService";

export type UserMode = "admin" | "gangmember" | "viewer2";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (mode: UserMode) => void;
}

export const LoginModal = ({ isOpen, onClose, onLogin }: LoginModalProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedMode, setSelectedMode] = useState<UserMode>("gangmember");

  const handleDiscordLogin = () => {
    window.location.href = apiService.getDiscordLoginUrl(selectedMode);
  };

  const handleLocalLogin = async () => {
    try {
      const res = await apiService.login(selectedMode, password);
      if (res.success) {
        onLogin(selectedMode);
        onClose();
      } else {
        alert(res.message || "Kyaa bee Shaane!! Nikal yaha se");
      }
    } catch (err: any) {
      const adminPassword = "YK789";
      const gangMemberPassword = "takla";

      if (
        (selectedMode === "admin" && password === adminPassword) ||
        (selectedMode === "gangmember" && password === gangMemberPassword)
      ) {
        onLogin(selectedMode);
        onClose();
      } else {
        alert(err.message || "Kyaa bee Shaane!! Nikal yaha se");
      }
    }
    setPassword("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gang-card border-border/50">
        <DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-2">
            <img src="/logo.png" alt="Vendetta Logo" className="w-14 h-14 rounded-xl border border-red-500/50 shadow-lg object-cover" />
            <DialogTitle className="text-2xl font-orbitron text-center text-gang-glow">
              Vendetta Access Control
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="text-center text-muted-foreground text-sm">
            <p>Select your access level to authenticate via Discord 🔴</p>
          </div>

          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-4">
            {/* Gang Member */}
            <Card
              className={`p-4 cursor-pointer transition-all duration-300 ${
                selectedMode === "gangmember"
                  ? "card-gang border-primary ring-2 ring-primary/50"
                  : "bg-muted hover:bg-muted/80"
              }`}
              onClick={() => setSelectedMode("gangmember")}
            >
              <div className="text-center space-y-2">
                <Users className="w-8 h-8 mx-auto text-accent" />
                <h3 className="font-rajdhani font-bold">Gang Member</h3>
                <p className="text-xs text-muted-foreground">Order & View Access</p>
              </div>
            </Card>

            {/* Admin Leader */}
            <Card
              className={`p-4 cursor-pointer transition-all duration-300 ${
                selectedMode === "admin"
                  ? "card-gang border-primary ring-2 ring-primary/50"
                  : "bg-muted hover:bg-muted/80"
              }`}
              onClick={() => setSelectedMode("admin")}
            >
              <div className="text-center space-y-2">
                <Shield className="w-8 h-8 mx-auto text-warning" />
                <h3 className="font-rajdhani font-bold">Leader</h3>
                <p className="text-xs text-muted-foreground">Full Control</p>
              </div>
            </Card>
          </div>

          {/* Primary Discord Login Button */}
          <Button 
            onClick={handleDiscordLogin} 
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-rajdhani font-bold py-3 text-base flex items-center justify-center space-x-2 shadow-lg transition-all"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>Login with Discord as {selectedMode === "admin" ? "Leader" : "Gang Member"}</span>
          </Button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border/50"></div>
            <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase font-rajdhani">or dev key</span>
            <div className="flex-grow border-t border-border/50"></div>
          </div>

          {/* Dev/Fallback Passcode Input */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={`Enter ${selectedMode === "admin" ? "Leader" : "Gang Member"} key...`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-input border-border pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Continue as Guest 🕶️
            </Button>
            <Button onClick={handleLocalLogin} className="flex-1 btn-gang" disabled={!password}>
              Dev Passcode Login
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
