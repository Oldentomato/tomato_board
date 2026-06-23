"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, logout } from "@/lib/api/auth";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["auth"] });
      window.location.href = "/login";
    },
  });

  return {
    user: isError ? undefined : user,
    isLoading,
    isAuthenticated: !!user && !isError,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
