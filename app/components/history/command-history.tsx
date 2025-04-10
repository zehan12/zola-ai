"use client"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Chats } from "@/lib/chat-store/types"
import { cn } from "@/lib/utils"
import { Check, PencilSimple, TrashSimple, X } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

type CommandHistoryProps = {
  chatHistory: Chats[]
  onSaveEdit: (id: string, newTitle: string) => Promise<void>
  onConfirmDelete: (id: string) => Promise<void>
  trigger: React.ReactNode
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

type TimeGroup = {
  name: string
  chats: Chats[]
}

export function CommandHistory({
  chatHistory,
  onSaveEdit,
  onConfirmDelete,
  trigger,
  isOpen,
  setIsOpen,
}: CommandHistoryProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setSearchQuery("")
      setEditingId(null)
      setEditTitle("")
      setDeletingId(null)
    }
  }

  const handleEdit = useCallback((chat: Chats) => {
    setEditingId(chat.id)
    setEditTitle(chat.title || "")
  }, [])

  const handleSaveEdit = useCallback(
    async (id: string) => {
      setEditingId(null)
      await onSaveEdit(id, editTitle)
    },
    [editTitle, onSaveEdit]
  )

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditTitle("")
  }, [])

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id)
  }, [])

  const handleConfirmDelete = useCallback(
    async (id: string) => {
      setDeletingId(null)
      await onConfirmDelete(id)
    },
    [onConfirmDelete]
  )

  const handleCancelDelete = useCallback(() => {
    setDeletingId(null)
  }, [])

  // Memoize filtered chats to avoid recalculating on every render
  const filteredChat = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return query
      ? chatHistory.filter((chat) =>
          (chat.title || "").toLowerCase().includes(query)
        )
      : chatHistory
  }, [chatHistory, searchQuery])

  // Group chats by time periods - memoized to avoid recalculation
  const groupedChats = useMemo(() => {
    if (searchQuery) return null // Don't group when searching

    const now = new Date()
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime()
    const weekAgo = today - 7 * 24 * 60 * 60 * 1000
    const monthAgo = today - 30 * 24 * 60 * 60 * 1000
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime()

    const todayChats: Chats[] = []
    const last7DaysChats: Chats[] = []
    const last30DaysChats: Chats[] = []
    const thisYearChats: Chats[] = []
    const olderChats: Record<number, Chats[]> = {}

    chatHistory.forEach((chat) => {
      if (!chat.created_at) {
        todayChats.push(chat)
        return
      }

      const chatTimestamp = new Date(chat.created_at).getTime()

      if (chatTimestamp >= today) {
        todayChats.push(chat)
      } else if (chatTimestamp >= weekAgo) {
        last7DaysChats.push(chat)
      } else if (chatTimestamp >= monthAgo) {
        last30DaysChats.push(chat)
      } else if (chatTimestamp >= yearStart) {
        thisYearChats.push(chat)
      } else {
        const year = new Date(chat.created_at).getFullYear()
        if (!olderChats[year]) {
          olderChats[year] = []
        }
        olderChats[year].push(chat)
      }
    })

    const result: TimeGroup[] = []

    if (todayChats.length > 0) {
      result.push({ name: "Today", chats: todayChats })
    }

    if (last7DaysChats.length > 0) {
      result.push({ name: "Last 7 days", chats: last7DaysChats })
    }

    if (last30DaysChats.length > 0) {
      result.push({ name: "Last 30 days", chats: last30DaysChats })
    }

    if (thisYearChats.length > 0) {
      result.push({ name: "This year", chats: thisYearChats })
    }

    Object.entries(olderChats)
      .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
      .forEach(([year, yearChats]) => {
        result.push({ name: year, chats: yearChats })
      })

    return result
  }, [chatHistory, searchQuery])

  // Render chat item with useCallback to avoid recreating function on every render
  const renderChatItem = useCallback(
    (chat: Chats) => (
      <div key={chat.id} className="px-0 py-1">
        {editingId === chat.id ? (
          <div className="bg-accent flex items-center justify-between rounded-lg px-2 py-2">
            <form
              className="flex w-full items-center justify-between"
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveEdit(chat.id)
              }}
            >
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="border-input h-8 flex-1 rounded border bg-transparent px-3 py-1 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSaveEdit(chat.id)
                  }
                }}
              />
              <div className="ml-2 flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground size-8"
                  type="submit"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground size-8"
                  type="button"
                  onClick={handleCancelEdit}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </form>
          </div>
        ) : deletingId === chat.id ? (
          <div className="bg-accent flex items-center justify-between rounded-lg px-2 py-2">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleConfirmDelete(chat.id)
              }}
              className="flex w-full items-center justify-between"
            >
              <div className="flex flex-1 items-center">
                <span className="line-clamp-1 text-base font-normal">
                  {chat.title}
                </span>
                <input
                  type="text"
                  className="sr-only hidden"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault()
                      handleCancelDelete()
                    } else if (e.key === "Enter") {
                      e.preventDefault()
                      handleConfirmDelete(chat.id)
                    }
                  }}
                />
              </div>
              <div className="ml-2 flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive-foreground hover:bg-destructive-foreground/10 size-8"
                  type="submit"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground size-8"
                  onClick={handleCancelDelete}
                  type="button"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <CommandItem
            onSelect={() => {
              if (!editingId && !deletingId) {
                router.push(`/c/${chat.id}`)
              }
            }}
            className={cn(
              "group group data-[selected=true]:bg-accent flex w-full items-center justify-between rounded-md",
              Boolean(editingId || deletingId) &&
                "data-[selected=true]:bg-transparent"
            )}
            value={chat.id}
            data-value-id={chat.id}
          >
            <div className="min-w-0 flex-1">
              <span className="line-clamp-1 text-base font-normal">
                {chat?.title || "Untitled Chat"}
              </span>
            </div>

            {/* Date and actions container */}
            <div className="relative flex min-w-[120px] flex-shrink-0 justify-end">
              {/* Date that shows by default but hides on selection */}
              <span
                className={cn(
                  "text-muted-foreground text-base font-normal opacity-100 transition-opacity duration-0",
                  "group-data-[selected=true]:opacity-0",
                  Boolean(editingId || deletingId) &&
                    "group-data-[selected=true]:opacity-100"
                )}
              >
                {chat?.created_at
                  ? new Date(chat.created_at).toLocaleDateString()
                  : "No date"}
              </span>

              {/* Action buttons that appear on selection, positioned over the date */}
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-end gap-1 opacity-0 transition-opacity duration-0",
                  "group-data-[selected=true]:opacity-100",
                  Boolean(editingId || deletingId) &&
                    "group-data-[selected=true]:opacity-0"
                )}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground size-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (chat) handleEdit(chat)
                  }}
                  type="button"
                >
                  <PencilSimple className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive size-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (chat?.id) handleDelete(chat.id)
                  }}
                  type="button"
                >
                  <TrashSimple className="size-4" />
                </Button>
              </div>
            </div>
          </CommandItem>
        )}
      </div>
    ),
    [
      editingId,
      deletingId,
      editTitle,
      handleSaveEdit,
      handleCancelEdit,
      handleConfirmDelete,
      handleCancelDelete,
      handleEdit,
      handleDelete,
      router,
    ]
  )

  // Prefetch chat pages
  useEffect(() => {
    if (!isOpen) return

    // Simply prefetch all the chat routes when dialog opens
    chatHistory.forEach((chat) => {
      router.prefetch(`/c/${chat.id}`)
    })
  }, [isOpen, chatHistory, router])

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent>History</TooltipContent>
      </Tooltip>
      <CommandDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        title="Chat History"
        description="Search through your past conversations"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search history..."
            value={searchQuery}
            onValueChange={(value) => setSearchQuery(value)}
          />
          <CommandList className="max-h-[480px] min-h-[480px] flex-1">
            {filteredChat.length === 0 && (
              <CommandEmpty>No chat history found.</CommandEmpty>
            )}

            {searchQuery ? (
              // When searching, display a flat list without grouping
              <CommandGroup className="p-1.5">
                {filteredChat.map((chat) => renderChatItem(chat))}
              </CommandGroup>
            ) : (
              // When not searching, display grouped by date
              groupedChats?.map((group) => (
                <CommandGroup
                  key={group.name}
                  heading={group.name}
                  className="p-1.5"
                >
                  {group.chats.map((chat) => renderChatItem(chat))}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
