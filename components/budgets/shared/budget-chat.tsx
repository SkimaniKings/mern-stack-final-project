"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Send } from "lucide-react"

interface Message {
  id: string
  user_id: string
  user_email: string
  content: string
  created_at: string
}

interface BudgetChatProps {
  budgetId: string
}

export function BudgetChat({ budgetId }: BudgetChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("budget_chat_messages")
        .select(`
          id,
          user_id,
          users (email),
          content,
          created_at
        `)
        .eq("budget_id", budgetId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching messages:", error)
        return
      }

      setMessages(data.map(msg => ({
        ...msg,
        user_email: msg.users.email,
      })))
    }

    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel("budget_chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "budget_chat_messages",
          filter: `budget_id=eq.${budgetId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [...prev, newMsg])
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, budgetId])

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { error } = await supabase
        .from("budget_chat_messages")
        .insert({
          budget_id: budgetId,
          user_id: user.id,
          content: newMessage.trim(),
        })

      if (error) throw error

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Budget Discussion</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src={`https://avatar.vercel.sh/${message.user_id}`} />
                  <AvatarFallback>
                    {message.user_email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-medium">{message.user_email}</p>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>
        <div className="flex items-center gap-2 mt-4">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button
            variant="default"
            size="icon"
            onClick={sendMessage}
            disabled={isLoading || !newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
