import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const IDLE_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Track user activity
    const activities = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    activities.forEach(activity => {
      document.addEventListener(activity, updateActivity);
    });

    // Check for idle timeout every minute
    const interval = setInterval(async () => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      
      if (timeSinceLastActivity > IDLE_TIMEOUT) {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
      }
    }, 60000); // Check every minute

    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, updateActivity);
      });
      clearInterval(interval);
    };
  }, [lastActivity]);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
