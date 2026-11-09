"use client"

import type { ChatMessage as Message } from "@/types/chat-message"
import { MessageItem } from "./message-item"
import { LoadingIndicator } from "./loading-indicator"

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      {isLoading && messages[messages.length - 1]?.role === "user" && <LoadingIndicator />}
    </div>
  )
}
