import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: 'landlord' | 'caretaker' | 'agent' | 'tenant' | 'admin' | 'superadmin' | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .limit(1)
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') {
        setError(fetchError.message);
      }
      setProfile(data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, isLoaded, isSignedIn]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { data: null, error: 'Not signed in' };
    const previous = profile;
    const optimistic = { ...profile, ...updates } as Profile;
    setProfile(optimistic);
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates })
        .select()
        .single();
      if (updateError) {
        setProfile(previous);
        return { data: null, error: updateError.message };
      }
      setProfile(data);
      return { data, error: null };
    } catch (err: any) {
      setProfile(previous);
      return { data: null, error: err.message };
    }
  }, [user, profile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
}
