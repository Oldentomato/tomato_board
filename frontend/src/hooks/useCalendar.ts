"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvent,
  deleteEvent,
  getEvents,
  updateEvent,
} from "@/lib/api/calendar";
import type { CreateEventInput, UpdateEventInput } from "@/lib/types/calendar";

export function useCalendar(from: string, to: string) {
  const queryClient = useQueryClient();
  const queryKey = ["calendar", "events", from, to];

  const eventsQuery = useQuery({
    queryKey,
    queryFn: () => getEvents(from, to),
    staleTime: 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["calendar"] });

  const createMutation = useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEventInput }) =>
      updateEvent(id, input),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: invalidate,
  });

  return {
    events: eventsQuery.data?.events ?? [],
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    refetch: eventsQuery.refetch,
    createEvent: createMutation.mutateAsync,
    updateEvent: updateMutation.mutateAsync,
    deleteEvent: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
