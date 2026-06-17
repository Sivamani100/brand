"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import { getImpersonatedUserId } from "@/lib/utils/impersonation";

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [realProfile, setRealProfile] = useState<Tables<"profiles"> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const actualUser = session.user;
        const { data: actualProf } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", actualUser.id)
          .single();

        setRealProfile(actualProf);

        // Check if actual user is admin and is impersonating another user
        const impUserId = getImpersonatedUserId();
        if (actualProf?.role === "admin" && impUserId) {
          const { data: impProf } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", impUserId)
            .single();

          if (impProf) {
            setUser({ id: impUserId, email: "impersonated@brand.com" });
            setProfile(impProf);
            setIsImpersonating(true);
          } else {
            setUser(actualUser);
            setProfile(actualProf);
            setIsImpersonating(false);
          }
        } else {
          setUser(actualUser);
          setProfile(actualProf);
          setIsImpersonating(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setIsImpersonating(false);
      }
      setLoading(false);
    }

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const actualUser = session.user;
          const { data: actualProf } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", actualUser.id)
            .single();

          setRealProfile(actualProf);

          const impUserId = getImpersonatedUserId();
          if (actualProf?.role === "admin" && impUserId) {
            const { data: impProf } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", impUserId)
              .single();

            if (impProf) {
              setUser({ id: impUserId, email: "impersonated@brand.com" });
              setProfile(impProf);
              setIsImpersonating(true);
            } else {
              setUser(actualUser);
              setProfile(actualProf);
              setIsImpersonating(false);
            }
          } else {
            setUser(actualUser);
            setProfile(actualProf);
            setIsImpersonating(false);
          }
        } else {
          setUser(null);
          setProfile(null);
          setRealProfile(null);
          setIsImpersonating(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading, isImpersonating, realProfile };
}
