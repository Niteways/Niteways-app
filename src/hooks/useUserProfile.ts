import { useState, useEffect, useCallback } from "react";

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  birthday: string;
  gender: string;
  avatarUrl: string;
  guestId: string;
  instagram: string;
  linkedin: string;
  facebook: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Michael Chen",
  email: "michael.chen@email.com",
  phone: "70 123 4567",
  countryCode: "+46",
  birthday: "1990-05-15",
  gender: "mr",
  avatarUrl: "",
  guestId: "USR-084",
  instagram: "",
  linkedin: "",
  facebook: "",
};

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("userAppProfile");
      if (saved) {
        try {
          return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
        } catch {
          return DEFAULT_PROFILE;
        }
      }
    }
    return DEFAULT_PROFILE;
  });

  // Listen for profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = () => {
      const saved = localStorage.getItem("userAppProfile");
      if (saved) {
        try {
          setProfile(prev => ({ ...prev, ...JSON.parse(saved) }));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("userProfileUpdated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);

    return () => {
      window.removeEventListener("userProfileUpdated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const newProfile = { ...prev, ...updates };
      localStorage.setItem("userAppProfile", JSON.stringify(newProfile));
      window.dispatchEvent(new CustomEvent("userProfileUpdated"));
      return newProfile;
    });
  }, []);

  const saveProfile = useCallback(() => {
    localStorage.setItem("userAppProfile", JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent("userProfileUpdated"));
  }, [profile]);

  return {
    profile,
    updateProfile,
    saveProfile,
  };
}