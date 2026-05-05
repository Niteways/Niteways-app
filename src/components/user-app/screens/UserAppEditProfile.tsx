import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Camera, User, Mail, Phone, Calendar, Save, Trash2, Users, Instagram, Linkedin, Facebook, Link, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserAppEditProfileProps {
  onBack: () => void;
}

// Complete list of country codes with flags
const countryCodes = [
  { code: "+46", country: "SE", flag: "🇸🇪", name: "Sweden" },
  { code: "+1", country: "US", flag: "🇺🇸", name: "United States" },
  { code: "+44", country: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+49", country: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "+33", country: "FR", flag: "🇫🇷", name: "France" },
  { code: "+34", country: "ES", flag: "🇪🇸", name: "Spain" },
  { code: "+39", country: "IT", flag: "🇮🇹", name: "Italy" },
  { code: "+31", country: "NL", flag: "🇳🇱", name: "Netherlands" },
  { code: "+47", country: "NO", flag: "🇳🇴", name: "Norway" },
  { code: "+45", country: "DK", flag: "🇩🇰", name: "Denmark" },
  { code: "+358", country: "FI", flag: "🇫🇮", name: "Finland" },
  { code: "+41", country: "CH", flag: "🇨🇭", name: "Switzerland" },
  { code: "+43", country: "AT", flag: "🇦🇹", name: "Austria" },
  { code: "+32", country: "BE", flag: "🇧🇪", name: "Belgium" },
  { code: "+351", country: "PT", flag: "🇵🇹", name: "Portugal" },
  { code: "+30", country: "GR", flag: "🇬🇷", name: "Greece" },
  { code: "+48", country: "PL", flag: "🇵🇱", name: "Poland" },
  { code: "+420", country: "CZ", flag: "🇨🇿", name: "Czech Republic" },
  { code: "+36", country: "HU", flag: "🇭🇺", name: "Hungary" },
  { code: "+353", country: "IE", flag: "🇮🇪", name: "Ireland" },
  { code: "+7", country: "RU", flag: "🇷🇺", name: "Russia" },
  { code: "+380", country: "UA", flag: "🇺🇦", name: "Ukraine" },
  { code: "+90", country: "TR", flag: "🇹🇷", name: "Turkey" },
  { code: "+971", country: "AE", flag: "🇦🇪", name: "UAE" },
  { code: "+966", country: "SA", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+972", country: "IL", flag: "🇮🇱", name: "Israel" },
  { code: "+91", country: "IN", flag: "🇮🇳", name: "India" },
  { code: "+86", country: "CN", flag: "🇨🇳", name: "China" },
  { code: "+81", country: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "+82", country: "KR", flag: "🇰🇷", name: "South Korea" },
  { code: "+65", country: "SG", flag: "🇸🇬", name: "Singapore" },
  { code: "+60", country: "MY", flag: "🇲🇾", name: "Malaysia" },
  { code: "+66", country: "TH", flag: "🇹🇭", name: "Thailand" },
  { code: "+62", country: "ID", flag: "🇮🇩", name: "Indonesia" },
  { code: "+63", country: "PH", flag: "🇵🇭", name: "Philippines" },
  { code: "+84", country: "VN", flag: "🇻🇳", name: "Vietnam" },
  { code: "+61", country: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "+64", country: "NZ", flag: "🇳🇿", name: "New Zealand" },
  { code: "+55", country: "BR", flag: "🇧🇷", name: "Brazil" },
  { code: "+52", country: "MX", flag: "🇲🇽", name: "Mexico" },
  { code: "+54", country: "AR", flag: "🇦🇷", name: "Argentina" },
  { code: "+57", country: "CO", flag: "🇨🇴", name: "Colombia" },
  { code: "+56", country: "CL", flag: "🇨🇱", name: "Chile" },
  { code: "+51", country: "PE", flag: "🇵🇪", name: "Peru" },
  { code: "+20", country: "EG", flag: "🇪🇬", name: "Egypt" },
  { code: "+27", country: "ZA", flag: "🇿🇦", name: "South Africa" },
  { code: "+234", country: "NG", flag: "🇳🇬", name: "Nigeria" },
  { code: "+254", country: "KE", flag: "🇰🇪", name: "Kenya" },
  { code: "+212", country: "MA", flag: "🇲🇦", name: "Morocco" },
];

const genderOptions = [
  { value: "mr", label: "Mr" },
  { value: "ms", label: "Ms" },
  { value: "mrs", label: "Mrs" },
  { value: "other", label: "Other" },
];

interface SocialAccount {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  placeholder: string;
  urlPrefix: string;
}

const socialAccounts: SocialAccount[] = [
  { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-500", placeholder: "@username", urlPrefix: "instagram.com/" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "text-blue-500", placeholder: "linkedin.com/in/username", urlPrefix: "linkedin.com/in/" },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-600", placeholder: "facebook.com/username", urlPrefix: "facebook.com/" },
];

export function UserAppEditProfile({ onBack }: UserAppEditProfileProps) {
  const { profile, updateProfile } = useUserProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [selectedSocial, setSelectedSocial] = useState<SocialAccount | null>(null);
  const [socialInput, setSocialInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const selectedCountry = countryCodes.find(c => c.code === profile.countryCode);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateProfile({ avatarUrl: event.target.result as string });
          toast.success("Profile picture updated!");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    }
  };

  const handleRemovePhoto = () => {
    updateProfile({ avatarUrl: "" });
    toast.success("Profile picture removed");
  };

  const handleSave = () => {
    toast.success("Profile updated successfully!");
    onBack();
  };

  const handleConnectSocial = (account: SocialAccount) => {
    setSelectedSocial(account);
    // Pre-fill with existing value if any
    const existingValue = profile[account.id as keyof typeof profile] as string || "";
    setSocialInput(existingValue);
    setSocialDialogOpen(true);
  };

  const handleSaveSocial = () => {
    if (!selectedSocial) return;
    
    setIsConnecting(true);
    
    // Simulate connection delay
    setTimeout(() => {
      updateProfile({ [selectedSocial.id]: socialInput });
      toast.success(`${selectedSocial.name} connected!`);
      setSocialDialogOpen(false);
      setIsConnecting(false);
      setSocialInput("");
      setSelectedSocial(null);
    }, 800);
  };

  const handleDisconnectSocial = (accountId: string) => {
    updateProfile({ [accountId]: "" });
    toast.success("Account disconnected");
  };

  const getSocialValue = (accountId: string): string => {
    return (profile[accountId as keyof typeof profile] as string) || "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full w-full bg-black flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0 bg-black border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Edit Profile</h1>
        </div>
      </div>
      
      {/* Content - Scrollable */}
      <div className="flex-1 flex flex-col px-4 py-3 overflow-y-auto">
        {/* Avatar - Slightly bigger */}
        <div className="flex flex-col items-center mb-3 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-border bg-muted flex items-center justify-center hover:ring-primary/50 transition-all cursor-pointer"
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <div className="absolute bottom-0 right-0 p-1 bg-primary rounded-full text-primary-foreground shadow-lg pointer-events-none">
              <Camera className="w-3 h-3" />
            </div>
          </div>
          
          {profile.avatarUrl && (
            <button
              onClick={handleRemovePhoto}
              className="text-xs text-destructive hover:text-destructive/80 mt-1 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </button>
          )}
        </div>

        {/* Form - Compact spacing */}
        <div className="flex flex-col gap-2.5">
          {/* Gender Selection */}
          <div>
            <Label className="text-muted-foreground text-[10px] uppercase tracking-wide flex items-center gap-1 mb-1">
              <Users className="w-3 h-3" /> Title
            </Label>
            <Select value={profile.gender} onValueChange={(v) => updateProfile({ gender: v })}>
              <SelectTrigger className="h-9 bg-muted border-border text-foreground rounded-lg w-full">
                <SelectValue placeholder="Select title" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {genderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-foreground">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-muted-foreground text-[10px] uppercase tracking-wide flex items-center gap-1 mb-1">
              <User className="w-3 h-3" /> Full Name
            </Label>
            <Input
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              className="h-9 bg-muted border-border text-foreground rounded-lg w-full"
              placeholder="Your name"
            />
          </div>

          <div>
            <Label className="text-muted-foreground text-[10px] uppercase tracking-wide flex items-center gap-1 mb-1">
              <Mail className="w-3 h-3" /> Email
            </Label>
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => updateProfile({ email: e.target.value })}
              className="h-9 bg-muted border-border text-foreground rounded-lg w-full"
              placeholder="your@email.com"
            />
          </div>

          {/* Phone with Country Code */}
          <div>
            <Label className="text-muted-foreground text-[10px] uppercase tracking-wide flex items-center gap-1 mb-1">
              <Phone className="w-3 h-3" /> Phone
            </Label>
            <div className="flex gap-2 w-full">
              <Select value={profile.countryCode} onValueChange={(v) => updateProfile({ countryCode: v })}>
                <SelectTrigger className="w-20 h-9 bg-muted border-border text-foreground rounded-lg flex-shrink-0">
                  <span className="flex items-center gap-0.5 truncate text-xs">
                    {selectedCountry && (
                      <>
                        <span>{selectedCountry.flag}</span>
                        <span>{selectedCountry.code}</span>
                      </>
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-[200px]">
                  {countryCodes.map((country) => (
                    <SelectItem 
                      key={country.code + country.country} 
                      value={country.code}
                      className="text-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span className="text-sm">{country.code}</span>
                        <span className="text-xs text-muted-foreground">{country.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="tel"
                value={profile.phone}
                onChange={(e) => updateProfile({ phone: e.target.value })}
                className="flex-1 h-9 bg-muted border-border text-foreground rounded-lg min-w-0"
                placeholder="70 123 4567"
              />
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground text-[10px] uppercase tracking-wide flex items-center gap-1 mb-1">
              <Calendar className="w-3 h-3" /> Birthday
            </Label>
            <Input
              type="date"
              value={profile.birthday}
              onChange={(e) => updateProfile({ birthday: e.target.value })}
              className="h-9 bg-muted border-border text-foreground rounded-lg w-full [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

          {/* Connected Accounts Section */}
          <div className="mt-2">
            <Label className="text-muted-foreground text-[10px] uppercase tracking-wide flex items-center gap-1 mb-2">
              <Link className="w-3 h-3" /> Connected Accounts
            </Label>
            <div className="space-y-2">
              {socialAccounts.map((account) => {
                const Icon = account.icon;
                const isConnected = !!getSocialValue(account.id);
                
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-2.5 bg-muted rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${account.color}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{account.name}</p>
                        {isConnected && (
                          <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {getSocialValue(account.id)}
                          </p>
                        )}
                      </div>
                    </div>
                    {isConnected ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-teal flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Connected
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => handleDisconnectSocial(account.id)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-xs"
                        onClick={() => handleConnectSocial(account)}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save Button - Always visible at bottom */}
        <div className="flex-shrink-0 pt-4 pb-2 mt-auto">
          <Button
            onClick={handleSave}
            className="w-full h-10 bg-primary text-primary-foreground rounded-xl font-semibold"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Social Connect Dialog */}
      <Dialog open={socialDialogOpen} onOpenChange={setSocialDialogOpen}>
        <DialogContent className="bg-background border-border max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSocial && (
                <>
                  <selectedSocial.icon className={`w-5 h-5 ${selectedSocial.color}`} />
                  Connect {selectedSocial.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">
                {selectedSocial?.id === "instagram" ? "Username" : "Profile URL"}
              </Label>
              <Input
                value={socialInput}
                onChange={(e) => setSocialInput(e.target.value)}
                placeholder={selectedSocial?.placeholder}
                className="h-10 bg-muted border-border"
              />
            </div>
            <Button
              onClick={handleSaveSocial}
              disabled={!socialInput.trim() || isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Account"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}