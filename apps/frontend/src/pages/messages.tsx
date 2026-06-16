import { useState, useRef, useEffect } from "react";
import { useListConversations, useGetMessages, useSendMessage, getGetMessagesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";

export default function Messages() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const { data: conversations, isLoading: isConvsLoading } = useListConversations();
  const { data: me } = useGetMe();

  const { data: messages, isLoading: isMessagesLoading } = useGetMessages(
    selectedConvId || "", 
    { query: { enabled: !!selectedConvId, queryKey: getGetMessagesQueryKey(selectedConvId || "") } }
  );

  const sendMessage = useSendMessage();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversations?.length) return;
    const c = new URLSearchParams(window.location.search).get("c");
    if (c && conversations.some((conv) => conv.id === c)) {
      setSelectedConvId(c);
    }
  }, [conversations]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvId) return;

    sendMessage.mutate({ conversationId: selectedConvId, data: { content: newMessage } }, {
      onSuccess: () => {
        setNewMessage("");
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey(selectedConvId) });
      }
    });
  };

  const selectedConv = conversations?.find(c => c.id === selectedConvId);

  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full bg-card border-t">
      {/* Conversations List */}
      <div className={`w-full md:w-1/3 border-r bg-muted/10 flex flex-col ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b bg-background sticky top-0 z-10">
          <h2 className="font-semibold text-lg">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isConvsLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-4 border-b flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))
          ) : conversations && conversations.length > 0 ? (
            conversations.map(conv => (
              <div 
                key={conv.id} 
                className={`p-4 border-b cursor-pointer transition-colors flex gap-3 ${selectedConvId === conv.id ? 'bg-accent' : 'hover:bg-accent/50'}`}
                onClick={() => setSelectedConvId(conv.id)}
              >
                <Avatar className="w-10 h-10 border">
                  <AvatarImage src={conv.otherUser.avatarUrl || undefined} />
                  <AvatarFallback>{conv.otherUser.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm truncate">{conv.otherUser.fullName}</span>
                    {conv.lastMessageAt && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(conv.lastMessageAt))}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{conv.lastMessage || "No messages yet"}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No conversations yet</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Message Thread */}
      <div className={`flex-1 flex-col bg-background ${selectedConvId ? 'flex' : 'hidden md:flex'}`}>
        {selectedConvId && selectedConv ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur z-10">
              <Button variant="ghost" size="icon" className="md:hidden mr-1" onClick={() => setSelectedConvId(null)}>
                <span className="sr-only">Back</span>
                &larr;
              </Button>
              <Avatar className="w-8 h-8 border">
                <AvatarImage src={selectedConv.otherUser.avatarUrl || undefined} />
                <AvatarFallback>{selectedConv.otherUser.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-sm">{selectedConv.otherUser.fullName}</h3>
                <p className="text-xs text-muted-foreground">{selectedConv.otherUser.headline}</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isMessagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="w-8 h-8 rounded-full" />
                </div>
              ) : messages && messages.length > 0 ? (
                messages.map(msg => {
                  const isMe = me?.id === msg.senderId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Send a message to start the conversation
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 border-t bg-background">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input 
                  placeholder="Type a message..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMessage.isPending}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
