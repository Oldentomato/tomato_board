"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChatRoom,
  deleteChatRoom,
  getChatAgents,
  getChatGraph,
  getChatRooms,
  sendChatMessageStream,
  type ChatRoomsResponse,
} from "@/lib/api/chat";
import type { ChatBranchContext, ChatGraph, ChatMessageNode } from "@/lib/types/chat";

function getPathToRoot(graph: ChatGraph, nodeId: string): ChatMessageNode[] {
  const path: ChatMessageNode[] = [];
  let current: ChatMessageNode | undefined = graph.nodes[nodeId];
  while (current) {
    path.unshift(current);
    current = current.parentId ? graph.nodes[current.parentId] : undefined;
  }
  return path;
}

function getDeepestLeaf(graph: ChatGraph, startId: string): string {
  let currentId = startId;
  while (true) {
    const node = graph.nodes[currentId];
    if (!node || node.childIds.length === 0) return currentId;
    currentId = node.childIds[node.childIds.length - 1];
  }
}

export function useChatGraph() {
  const queryClient = useQueryClient();
  const roomsKey = ["chat", "rooms"];
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [streamingNodeId, setStreamingNodeId] = useState<string | null>(null);

  const roomsQuery = useQuery({
    queryKey: roomsKey,
    queryFn: getChatRooms,
    staleTime: 10 * 1000,
  });

  const agentsQuery = useQuery({
    queryKey: ["chat", "agents"],
    queryFn: getChatAgents,
    staleTime: 60 * 1000,
  });

  const graphKey = ["chat", "graph", selectedRoomId];
  const graphQuery = useQuery({
    queryKey: graphKey,
    queryFn: () => getChatGraph(selectedRoomId!),
    enabled: !!selectedRoomId,
    staleTime: 5 * 1000,
  });

  const rooms = roomsQuery.data?.rooms ?? [];
  const agents = agentsQuery.data?.agents ?? [];
  const specializedAgents = agents.filter((agent) => agent.id !== "general");
  const selectedGraph = graphQuery.data ?? null;

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (selectedGraph && !activeNodeId) {
      setActiveNodeId(getDeepestLeaf(selectedGraph, selectedGraph.rootId));
    }
  }, [selectedGraph, activeNodeId]);

  const invalidateChat = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: roomsKey });
    if (selectedRoomId) {
      await queryClient.invalidateQueries({ queryKey: ["chat", "graph", selectedRoomId] });
    }
  }, [queryClient, selectedRoomId]);

  const createRoomMutation = useMutation({
    mutationFn: createChatRoom,
    onSuccess: (data) => {
      setSelectedRoomId(data.room.id);
      setActiveNodeId(data.graph.rootId);
      queryClient.setQueryData(["chat", "graph", data.room.id], data.graph);
      void queryClient.invalidateQueries({ queryKey: roomsKey });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: deleteChatRoom,
    onSuccess: (_, deletedRoomId) => {
      queryClient.removeQueries({ queryKey: ["chat", "graph", deletedRoomId] });
      queryClient.setQueryData<ChatRoomsResponse>(roomsKey, (old) =>
        old ? { rooms: old.rooms.filter((room) => room.id !== deletedRoomId) } : old,
      );

      if (selectedRoomId === deletedRoomId) {
        const remaining =
          queryClient.getQueryData<ChatRoomsResponse>(roomsKey)?.rooms ?? [];
        const nextRoomId = remaining[0]?.id ?? null;
        setSelectedRoomId(nextRoomId);
        setActiveNodeId(null);
      }
    },
  });

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !selectedRoomId || !activeNodeId || isSending) return;

      setIsSending(true);
      let assistantNodeId: string | null = null;

      try {
        await sendChatMessageStream(
          selectedRoomId,
          {
            parentId: activeNodeId,
            content: trimmed,
            ...(selectedAgentId ? { agentId: selectedAgentId } : {}),
          },
          {
            onInit: (data) => {
              assistantNodeId = data.assistantNodeId;
              setStreamingNodeId(data.assistantNodeId);
              queryClient.setQueryData(["chat", "graph", selectedRoomId], data.graph);
              setActiveNodeId(data.assistantNodeId);
            },
            onDelta: (delta) => {
              if (!assistantNodeId) return;
              queryClient.setQueryData<ChatGraph>(["chat", "graph", selectedRoomId], (old) => {
                if (!old) return old;
                const node = old.nodes[assistantNodeId!];
                if (!node) return old;
                return {
                  ...old,
                  nodes: {
                    ...old.nodes,
                    [assistantNodeId!]: { ...node, content: node.content + delta },
                  },
                };
              });
            },
            onDone: (data) => {
              queryClient.setQueryData(["chat", "graph", selectedRoomId], data.graph);
              setActiveNodeId(data.activeNodeId);
              void invalidateChat();
            },
          },
        );
      } finally {
        setIsSending(false);
        setStreamingNodeId(null);
      }
    },
    [selectedRoomId, activeNodeId, selectedAgentId, isSending, queryClient, invalidateChat],
  );

  const activePath = useMemo(() => {
    if (!selectedGraph || !activeNodeId) return [];
    return getPathToRoot(selectedGraph, activeNodeId).filter((n) => n.role !== "system");
  }, [selectedGraph, activeNodeId]);

  const branchContext: ChatBranchContext | null = useMemo(() => {
    if (!selectedRoomId || !selectedGraph || !activeNodeId) return null;
    const pathNodeIds = getPathToRoot(selectedGraph, activeNodeId).map((n) => n.id);
    const parent = selectedGraph.nodes[activeNodeId]?.parentId;
    return {
      roomId: selectedRoomId,
      activeNodeId,
      pathNodeIds,
      branchPointId: parent,
    };
  }, [selectedRoomId, selectedGraph, activeNodeId]);

  const selectRoom = useCallback(
    (roomId: string) => {
      setSelectedRoomId(roomId);
      setActiveNodeId(null);
      const cached = queryClient.getQueryData<ChatGraph>(["chat", "graph", roomId]);
      if (cached) {
        setActiveNodeId(getDeepestLeaf(cached, cached.rootId));
      }
    },
    [queryClient],
  );

  const selectNode = useCallback((nodeId: string) => {
    setActiveNodeId(nodeId);
  }, []);

  const createRoom = useCallback(async () => {
    await createRoomMutation.mutateAsync();
  }, [createRoomMutation]);

  const deleteRoom = useCallback(
    async (roomId: string) => {
      await deleteRoomMutation.mutateAsync(roomId);
    },
    [deleteRoomMutation],
  );

  return {
    rooms,
    agents: specializedAgents,
    selectedAgentId,
    setSelectedAgentId,
    graphs: selectedRoomId && selectedGraph ? { [selectedRoomId]: selectedGraph } : {},
    selectedRoomId,
    selectedGraph,
    activeNodeId,
    activePath,
    branchContext,
    selectRoom,
    selectNode,
    createRoom,
    deleteRoom,
    sendMessage,
    isLoading: roomsQuery.isLoading || graphQuery.isLoading,
    isSending,
    streamingNodeId,
    isDeleting: deleteRoomMutation.isPending,
    deletingRoomId: deleteRoomMutation.isPending ? deleteRoomMutation.variables ?? null : null,
    isError: roomsQuery.isError || graphQuery.isError,
  };
}

export type ChatGraphContextValue = ReturnType<typeof useChatGraph>;
