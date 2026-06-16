import { useEffect, useRef, useState } from "react";
import {
  useGetMe,
  useGetMessages,
  useSendMessage,
  getGetMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_MESSAGES = [
  "Hi! Could you please share your resume?",
  "Can we schedule a quick call to discuss?",
  "Any update on my referral request?",
  "I can send my portfolio link if needed.",
  "Thanks for considering my request!",
];

type ReferralChatPanelProps = {
  conversationId: string;
  otherUserName: string;
  jobTitle?: string;
  defaultOpen?: boolean;
  compact?: boolean;
  className?: string;
};

export function ReferralChatPanel({
  conversationId,
  otherUserName,
  jobTitle,
  defaultOpen = true,
  compact = false,
  className,
}: ReferralChatPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();

  const { data: messages, isLoading } = useGetMessages(conversationId, {
    query: {
      enabled: open && Boolean(conversationId),
      queryKey: getGetMessagesQueryKey(conversationId),
      refetchInterval: open ? 5000 : false,
    },
  });

  const sendMessage = useSendMessage();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const handleSend = (content: string) => {
    const text = content.trim();
    if (!text || !conversationId) return;

    sendMessage.mutate(
      { conversationId, data: { content: text } },
      {
        onSuccess: () => {
          setDraft("");
          queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey(conversationId) });
        },
      },
    );
  };

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden shadow-sm", className)}>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm">Chat with {otherUserName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {jobTitle ? `${jobTitle} · ` : ""}Ask questions, request resume, share updates
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>

      {open && (
        <div className={cn("flex flex-col", compact ? "h-[220px]" : "h-[320px]")}>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-background">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : messages && messages.length > 0 ? (
              messages.map((msg) => {
                const isMe = me?.id === msg.senderId;
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted rounded-tl-sm",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={cn("text-[10px] mt-1 text-right opacity-70")}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                No messages yet. Say hello or use a quick message below.
              </p>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t p-2 space-y-2 bg-muted/20">
            <div className="flex flex-wrap gap-1">
              {QUICK_MESSAGES.map((text) => (
                <button
                  key={text}
                  type="button"
                  className="text-[10px] px-2 py-1 rounded-full border bg-background hover:bg-accent transition-colors"
                  onClick={() => handleSend(text)}
                  disabled={sendMessage.isPending}
                >
                  {text.length > 42 ? `${text.slice(0, 40)}…` : text}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(draft);
              }}
            >
              <Input
                placeholder="Type a message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-9 text-sm"
              />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!draft.trim() || sendMessage.isPending}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
