"use client"

import type { ChatMessage as Message } from "@/types/chat-message"
import { User, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"

interface MessageItemProps {
  message: Message
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full",
          isUser ? "bg-secondary" : "bg-primary/10",
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-secondary-foreground" />
        ) : (
          <BookOpen className="w-4 h-4 text-primary" />
        )}
      </div>

      <div
        className={cn(
          "flex-1 max-w-[80%] rounded-2xl px-4 py-3",
          isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm",
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
