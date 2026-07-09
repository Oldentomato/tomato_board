"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChatRoom,
  deleteChatRoom,
  finalizeChatMessage,
  getChatAgents,
  getChatGraph,
  getChatRooms,
  prepareChatMessage,
  sendChatMessageStream,
  type ChatRoomsResponse,
} from "@/lib/api/chat";
import { buildAgUiMessages } from "@/lib/chat/agUiMessages";
import { parsePreviewDocumentToolOutput } from "@/lib/chat/documentPreview";
import { isMockMode } from "@/lib/config/env";
import { getDocuments } from "@/lib/api/documents";
import {
  DOCUMENTS_QUERY_KEY,
  shouldRefreshDocumentsForTool,
} from "@/hooks/useDocuments";
import {
  IDLE_AGENT_ACTIVITY,
  type AgentActivityState,
  type AgentToolActivity,
  type ChatBranchContext,
  type ChatGraph,
  type ChatMessageNode,
} from "@/lib/types/chat";
import type { DocumentPreviewPayload } from "@/lib/types/document";

const ROOMS_QUERY_KEY = ["chat", "rooms"] as const;

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

function upsertTool(
  tools: AgentToolActivity[],
  next: AgentToolActivity,
): AgentToolActivity[] {
  const index = tools.findIndex((tool) => tool.id === next.id);
  if (index === -1) return [...tools, next];
  const copy = [...tools];
  copy[index] = { ...copy[index], ...next };
  return copy;
}

export function useChatGraph() {
  const queryClient = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const activeAgentId = selectedAgentId ?? "general";
  const { agent } = useAgent({ agentId: activeAgentId });
  const [isSending, setIsSending] = useState(false);
  const [streamingNodeId, setStreamingNodeId] = useState<string | null>(null);
  const [agentActivity, setAgentActivity] = useState<AgentActivityState>(IDLE_AGENT_ACTIVITY);
  const [documentPreviewsByMessageId, setDocumentPreviewsByMessageId] = useState<
    Record<string, DocumentPreviewPayload[]>
  >({});

  const attachPreviewToMessage = useCallback((messageId: string, output: string | null | undefined) => {
    const payload = parsePreviewDocumentToolOutput(output);
    if (!payload || payload.error || !payload.preview_mode) return;
    setDocumentPreviewsByMessageId((prev) => ({
      ...prev,
      [messageId]: [...(prev[messageId] ?? []), payload],
    }));
  }, []);

  const roomsQuery = useQuery({
    queryKey: ROOMS_QUERY_KEY,
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

  const rooms = useMemo(() => roomsQuery.data?.rooms ?? [], [roomsQuery.data?.rooms]);
  const agents = agentsQuery.data?.agents ?? [];
  const specializedAgents = agents.filter((agentInfo) => agentInfo.id !== "general");
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
    await queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEY });
    if (selectedRoomId) {
      await queryClient.invalidateQueries({ queryKey: ["chat", "graph", selectedRoomId] });
    }
  }, [queryClient, selectedRoomId]);

  const invalidateDocumentsIfNeeded = useCallback(
    (toolName: string) => {
      if (shouldRefreshDocumentsForTool(toolName)) {
        void queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
      }
    },
    [queryClient],
  );

  const createRoomMutation = useMutation({
    mutationFn: createChatRoom,
    onSuccess: (data) => {
      setSelectedRoomId(data.room.id);
      setActiveNodeId(data.graph.rootId);
      queryClient.setQueryData(["chat", "graph", data.room.id], data.graph);
      void queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEY });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: deleteChatRoom,
    onSuccess: (_, deletedRoomId) => {
      queryClient.removeQueries({ queryKey: ["chat", "graph", deletedRoomId] });
      queryClient.setQueryData<ChatRoomsResponse>(ROOMS_QUERY_KEY, (old) =>
        old ? { rooms: old.rooms.filter((room) => room.id !== deletedRoomId) } : old,
      );

      if (selectedRoomId === deletedRoomId) {
        const remaining =
          queryClient.getQueryData<ChatRoomsResponse>(ROOMS_QUERY_KEY)?.rooms ?? [];
        const nextRoomId = remaining[0]?.id ?? null;
        setSelectedRoomId(nextRoomId);
        setActiveNodeId(null);
      }
    },
  });

  const updateAssistantNode = useCallback(
    (
      roomId: string,
      assistantNodeId: string,
      patch: Partial<Pick<ChatMessageNode, "content" | "thought">>,
    ) => {
      queryClient.setQueryData<ChatGraph>(["chat", "graph", roomId], (old) => {
        if (!old) return old;
        const node = old.nodes[assistantNodeId];
        if (!node) return old;
        return {
          ...old,
          nodes: {
            ...old.nodes,
            [assistantNodeId]: { ...node, ...patch },
          },
        };
      });
    },
    [queryClient],
  );

  const sendMessageViaStream = useCallback(
    async (roomId: string, parentId: string, trimmed: string) => {
      let assistantNodeId: string | null = null;
      let tools: AgentToolActivity[] = [];

      await sendChatMessageStream(
        roomId,
        {
          parentId,
          content: trimmed,
          ...(selectedAgentId ? { agentId: selectedAgentId } : {}),
        },
        {
          onInit: (data) => {
            assistantNodeId = data.assistantNodeId;
            setStreamingNodeId(data.assistantNodeId);
            queryClient.setQueryData(["chat", "graph", roomId], data.graph);
            setActiveNodeId(data.assistantNodeId);
          },
          onDelta: (delta) => {
            if (!assistantNodeId) return;
            queryClient.setQueryData<ChatGraph>(["chat", "graph", roomId], (old) => {
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
          onThoughtDelta: (delta) => {
            if (!assistantNodeId) return;
            queryClient.setQueryData<ChatGraph>(["chat", "graph", roomId], (old) => {
              if (!old) return old;
              const node = old.nodes[assistantNodeId!];
              if (!node) return old;
              return {
                ...old,
                nodes: {
                  ...old.nodes,
                  [assistantNodeId!]: {
                    ...node,
                    thought: `${node.thought ?? ""}${delta}`,
                  },
                },
              };
            });
          },
          onToolStart: ({ toolName, input, runId }) => {
            const id = runId ?? `${toolName}-${tools.length}`;
            tools = upsertTool(tools, {
              id,
              toolName,
              status: "running",
              input: input ?? null,
            });
            setAgentActivity((prev) => ({
              ...prev,
              phase: "running",
              tools,
            }));
          },
          onToolEnd: ({ toolName, output, runId }) => {
            const id = runId ?? `${toolName}-${tools.length - 1}`;
            tools = upsertTool(tools, {
              id,
              toolName,
              status: "complete",
              output: output ?? null,
            });
            setAgentActivity((prev) => ({ ...prev, tools }));
            invalidateDocumentsIfNeeded(toolName);
            if (
              assistantNodeId &&
              (toolName === "preview_document" || parsePreviewDocumentToolOutput(output ?? null)?.preview_mode)
            ) {
              attachPreviewToMessage(assistantNodeId, output ?? null);
            }
          },
          onStepStart: ({ stepName }) => {
            setAgentActivity((prev) => ({
              ...prev,
              phase: "running",
              currentStep: stepName,
            }));
          },
          onDone: (data) => {
            queryClient.setQueryData(["chat", "graph", roomId], data.graph);
            setActiveNodeId(data.activeNodeId);
            setAgentActivity((prev) => ({
              ...prev,
              phase: "completed",
              currentStep: null,
              tools,
            }));
            void invalidateChat();
          },
        },
      );
    },
    [queryClient, selectedAgentId, invalidateChat, invalidateDocumentsIfNeeded, attachPreviewToMessage],
  );

  const sendMessageViaAgUi = useCallback(
    async (roomId: string, parentId: string, trimmed: string) => {
      setAgentActivity({
        phase: "running",
        currentStep: null,
        tools: [],
        error: null,
      });

      const prep = await prepareChatMessage(roomId, {
        parentId,
        content: trimmed,
        ...(selectedAgentId ? { agentId: selectedAgentId } : {}),
      });

      const assistantNodeId = prep.assistantNodeId;
      setStreamingNodeId(assistantNodeId);
      queryClient.setQueryData(["chat", "graph", roomId], prep.graph);
      setActiveNodeId(assistantNodeId);

      const messages = buildAgUiMessages(prep.graph, prep.userNodeId);
      agent.setMessages(messages);

      let fullContent = "";
      let fullThought = "";
      let tools: AgentToolActivity[] = [];

      await agent.runAgent(
        {},
        {
          onStepStartedEvent: ({ event }) => {
            setAgentActivity((prev) => ({
              ...prev,
              phase: "running",
              currentStep: event.stepName,
            }));
          },
          onTextMessageContentEvent: ({ textMessageBuffer }) => {
            fullContent = textMessageBuffer;
            updateAssistantNode(roomId, assistantNodeId, { content: fullContent });
          },
          onReasoningMessageContentEvent: ({ reasoningMessageBuffer }) => {
            fullThought = reasoningMessageBuffer;
            updateAssistantNode(roomId, assistantNodeId, { thought: fullThought });
          },
          onToolCallStartEvent: ({ event }) => {
            tools = upsertTool(tools, {
              id: event.toolCallId,
              toolName: String(event.toolCallName ?? "tool"),
              status: "running",
            });
            setAgentActivity((prev) => ({ ...prev, phase: "running", tools }));
          },
          onToolCallArgsEvent: ({ event, partialToolCallArgs }) => {
            tools = upsertTool(tools, {
              id: event.toolCallId,
              toolName: String(event.toolCallName ?? "tool"),
              status: "running",
              input: partialToolCallArgs as Record<string, unknown>,
            });
            setAgentActivity((prev) => ({ ...prev, tools }));
          },
          onToolCallEndEvent: ({ event, toolCallName, toolCallArgs }) => {
            tools = upsertTool(tools, {
              id: event.toolCallId,
              toolName: String(toolCallName ?? "tool"),
              status: "running",
              input: toolCallArgs as Record<string, unknown>,
            });
            setAgentActivity((prev) => ({ ...prev, tools }));
          },
          onToolCallResultEvent: ({ event }) => {
            const raw = "content" in event ? event.content : null;
            const content =
              typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
            const existing = tools.find((tool) => tool.id === event.toolCallId);
            const toolName = String(
              ("toolCallName" in event && event.toolCallName) ||
                existing?.toolName ||
                "tool",
            );
            tools = upsertTool(tools, {
              id: event.toolCallId,
              toolName,
              status: "complete",
              output: content,
            });
            setAgentActivity((prev) => ({ ...prev, tools }));
            invalidateDocumentsIfNeeded(toolName);
            if (toolName === "preview_document" || parsePreviewDocumentToolOutput(content)?.preview_mode) {
              attachPreviewToMessage(assistantNodeId, content);
            }
          },
          onRunErrorEvent: ({ event }) => {
            setAgentActivity((prev) => ({
              ...prev,
              phase: "error",
              error: event.message ?? "에이전트 실행 중 오류가 발생했습니다.",
            }));
          },
        },
      );

      if (!fullContent.trim()) {
        fullContent = "응답을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        updateAssistantNode(roomId, assistantNodeId, { content: fullContent });
      }

      const result = await finalizeChatMessage(roomId, assistantNodeId, {
        content: fullContent,
        thought: fullThought || null,
      });

      queryClient.setQueryData(["chat", "graph", roomId], result.graph);
      setActiveNodeId(result.activeNodeId);
      setAgentActivity({
        phase: "completed",
        currentStep: null,
        tools,
        error: null,
      });
      await invalidateChat();
    },
    [agent, queryClient, selectedAgentId, updateAssistantNode, invalidateChat, invalidateDocumentsIfNeeded, attachPreviewToMessage],
  );

  const ensureRoomContext = useCallback(async (): Promise<{ roomId: string; parentId: string }> => {
    if (selectedRoomId) {
      const cachedGraph =
        selectedGraph ?? queryClient.getQueryData<ChatGraph>(["chat", "graph", selectedRoomId]);
      const parentId =
        activeNodeId ??
        (cachedGraph ? getDeepestLeaf(cachedGraph, cachedGraph.rootId) : null);

      if (parentId) {
        return { roomId: selectedRoomId, parentId };
      }

      const graph = await getChatGraph(selectedRoomId);
      queryClient.setQueryData(["chat", "graph", selectedRoomId], graph);
      const resolvedParent = getDeepestLeaf(graph, graph.rootId);
      setActiveNodeId(resolvedParent);
      return { roomId: selectedRoomId, parentId: resolvedParent };
    }

    const created = await createRoomMutation.mutateAsync();
    return { roomId: created.room.id, parentId: created.graph.rootId };
  }, [
    activeNodeId,
    createRoomMutation,
    queryClient,
    selectedGraph,
    selectedRoomId,
  ]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return;

      setIsSending(true);
      try {
        const { roomId, parentId } = await ensureRoomContext();

        if (selectedAgentId === "document") {
          await queryClient.fetchQuery({
            queryKey: DOCUMENTS_QUERY_KEY,
            queryFn: getDocuments,
          });
        }

        if (isMockMode()) {
          await sendMessageViaStream(roomId, parentId, trimmed);
        } else {
          await sendMessageViaAgUi(roomId, parentId, trimmed);
        }
      } catch (error) {
        setAgentActivity((prev) => ({
          ...prev,
          phase: "error",
          error:
            error instanceof Error
              ? error.message
              : "메시지 전송 중 오류가 발생했습니다.",
        }));
        throw error;
      } finally {
        setIsSending(false);
        setStreamingNodeId(null);
      }
    },
    [
      isSending,
      ensureRoomContext,
      sendMessageViaStream,
      sendMessageViaAgUi,
      selectedAgentId,
      queryClient,
    ],
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
      setAgentActivity(IDLE_AGENT_ACTIVITY);
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
    agentActivity,
    documentPreviewsByMessageId,
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
