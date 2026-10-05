"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { MessageList } from "./message-list"
import { MessageInput } from "./message-input"
import { ChatHeader } from "./chat-header"
import { WelcomeScreen } from "./welcome-screen"
import { apiUrl } from "@/lib/api-base"
import { track } from "@/lib/analytics/client"

import type { ChatMessage as Message } from "@/types/chat-message"

export function BibleChat() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleClearChat = () => {
    setMessages([])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          verseReference: 'General Bible study',
          verseText: '',
          history: messages.slice(-6).map((m) => ({ sender: m.role, text: m.content })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }
      track("question_sent", { channel: "chat" })

      const result = await response.json()
      if (typeof result.response !== 'string' || !result.response.trim()) throw new Error('No usable reply')
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: result.response }])
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    "What does the Bible say about love?",
    "Explain the Sermon on the Mount",
    "Who was King David?",
    "What are the Ten Commandments?",
  ]

  const handleSuggestionClick = (question: string) => {
    setInput(question)
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <ChatHeader onClearChat={handleClearChat} />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <WelcomeScreen suggestions={suggestedQuestions} onSuggestionClick={handleSuggestionClick} />
        ) : (
          <MessageList messages={messages} isLoading={isLoading} />
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
