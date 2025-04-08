"use client"

import { toast } from "@/components/ui/toast"
import type { Message } from "ai"
import { createContext, useContext, useEffect, useState } from "react"
import {
  addMessage,
  clearMessagesForChat,
  fetchAndCacheMessages,
  getCachedMessages,
  setMessages as saveMessages,
} from "./messages"
import { writeToIndexedDB } from "./persist"

interface ChatMessagesContextType {
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  refresh: () => Promise<void>
  reset: () => Promise<void>
  addMessage: (message: Message) => Promise<void>
  saveAllMessages: (messages: Message[]) => Promise<void>
  cacheAndAddMessage: (message: Message) => Promise<void>
}

const ChatMessagesContext = createContext<ChatMessagesContextType | null>(null)

export function useChatMessages() {
  const context = useContext(ChatMessagesContext)
  if (!context)
    throw new Error("useChatMessages must be used within ChatMessagesProvider")
  return context
}

export function ChatMessagesProvider({
  chatId,
  children,
}: {
  chatId?: string
  children: React.ReactNode
}) {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (!chatId) return

    const load = async () => {
      const cached = await getCachedMessages(chatId)
      setMessages(cached)

      try {
        const fresh = await fetchAndCacheMessages(chatId)
        setMessages(fresh)
      } catch (error) {
        console.error("Failed to fetch messages:", error)
      }
    }

    load()
  }, [chatId])

  const refresh = async () => {
    if (!chatId) return

    try {
      const fresh = await fetchAndCacheMessages(chatId)
      setMessages(fresh)
    } catch (e) {
      toast({ title: "Failed to refresh messages", status: "error" })
    }
  }

  const reset = async () => {
    if (!chatId) return

    setMessages([])
    await clearMessagesForChat(chatId)
  }

  const addSingleMessage = async (message: Message) => {
    if (!chatId) return

    try {
      await addMessage(chatId, message)
      setMessages((prev) => [...prev, message])
    } catch (e) {
      toast({ title: "Failed to add message", status: "error" })
    }
  }

  const cacheAndAddMessage = async (message: Message) => {
    if (!chatId) return

    try {
      const updated = [...messages, message]
      await writeToIndexedDB("messages", { id: chatId, messages: updated })
      setMessages(updated)
    } catch (e) {
      toast({ title: "Failed to save message", status: "error" })
    }
  }

  const saveAllMessages = async (newMessages: Message[]) => {
    if (!chatId) return

    try {
      await saveMessages(chatId, newMessages)
      setMessages(newMessages)
    } catch (e) {
      toast({ title: "Failed to save messages", status: "error" })
    }
  }

  return (
    <ChatMessagesContext.Provider
      value={{
        messages,
        setMessages,
        refresh,
        reset,
        addMessage: addSingleMessage,
        saveAllMessages,
        cacheAndAddMessage,
      }}
    >
      {children}
    </ChatMessagesContext.Provider>
  )
}
