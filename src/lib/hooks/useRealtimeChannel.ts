"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "error";

interface RealtimeChannelOptions {
  channelName: string;
  onInsertMessage?: (payload: any) => void;
  onUpdateRoom?: (payload: any) => void;
  onMilestoneChange?: (payload: any) => void;
  onPresenceSync?: (presenceState: any) => void;
  onPresenceJoin?: (key: string, newPres: any) => void;
  onPresenceLeave?: (key: string, leftPres: any) => void;
  onTypingBroadcast?: (payload: any) => void;
  userId: string;
}

export function useRealtimeChannel({
  channelName,
  onInsertMessage,
  onUpdateRoom,
  onMilestoneChange,
  onPresenceSync,
  onPresenceJoin,
  onPresenceLeave,
  onTypingBroadcast,
  userId,
}: RealtimeChannelOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxAttempts = 5;
  const supabase = createClient();

  const connectRef = useRef<() => void>(() => {});

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current + Math.random() * 100, 30000);
    reconnectAttemptsRef.current++;
    setTimeout(() => {
      connectRef.current();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    // Clean up old channel first if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // 1. Message inserts
    if (onInsertMessage) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        onInsertMessage
      );
    }

    // 2. Room updates
    if (onUpdateRoom) {
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms" },
        onUpdateRoom
      );
    }

    // 3. Milestones changes
    if (onMilestoneChange) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "milestones" },
        onMilestoneChange
      );
    }

    // 4. Presence listeners
    channel
      .on("presence", { event: "sync" }, () => {
        if (onPresenceSync) onPresenceSync(channel.presenceState());
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        if (onPresenceJoin) onPresenceJoin(key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        if (onPresenceLeave) onPresenceLeave(key, leftPresences);
      });

    // 5. Typing broadcast listener
    if (onTypingBroadcast) {
      channel.on("broadcast", { event: "typing" }, ({ payload }) => {
        onTypingBroadcast(payload);
      });
    }

    // 6. Subscribe connection monitoring
    channel.subscribe(async (status, err) => {
      if (status === "SUBSCRIBED") {
        setConnectionState("connected");
        reconnectAttemptsRef.current = 0;
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      } else if (status === "CLOSED") {
        if (reconnectAttemptsRef.current < maxAttempts) {
          setConnectionState("reconnecting");
          scheduleReconnect();
        } else {
          setConnectionState("error");
        }
      } else if (status === "CHANNEL_ERROR" || err) {
        console.error("Realtime channel error:", err);
        if (reconnectAttemptsRef.current < maxAttempts) {
          setConnectionState("reconnecting");
          scheduleReconnect();
        } else {
          setConnectionState("error");
        }
      }
    });

    channelRef.current = channel;
  }, [
    channelName,
    userId,
    onInsertMessage,
    onUpdateRoom,
    onMilestoneChange,
    onPresenceSync,
    onPresenceJoin,
    onPresenceLeave,
    onTypingBroadcast,
  ]);

  connectRef.current = connect;

  useEffect(() => {
    connect();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [connect]);

  const sendTypingStatus = (isTyping: boolean) => {
    if (channelRef.current && connectionState === "connected") {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId, isTyping },
      });
    }
  };

  const manualReconnect = () => {
    reconnectAttemptsRef.current = 0;
    setConnectionState("connecting");
    connect();
  };

  return {
    connectionState,
    sendTypingStatus,
    manualReconnect,
  };
}
