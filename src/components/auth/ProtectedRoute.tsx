import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // No session - redirect to login (when auth is implemented)
        // For now, allow access for demo purposes
        setIsAuthorized(true);
        return;
      }

      // If no specific roles required, just check authentication
      if (!allowedRoles || allowedRoles.length === 0) {
        setIsAuthorized(true);
        return;
      }

      // Check if user has any of the allowed roles
      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error checking user roles:", error);
        setIsAuthorized(false);
        return;
      }

      const userRoleValues = userRoles?.map((r) => r.role) || [];
      const hasRequiredRole = allowedRoles.some((role) => userRoleValues.includes(role));

      if (!hasRequiredRole) {
        // User doesn't have required role - redirect to dashboard
        navigate("/", { replace: true });
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);
    };

    checkAuthorization();
  }, [allowedRoles, navigate, location.pathname]);

  // Show nothing while checking authorization
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
