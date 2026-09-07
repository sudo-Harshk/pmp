import { useEffect, useRef, useState } from 'react'
import type { RoomState } from '@/types/game'

type ToastTone = 'join' | 'leave' | 'host'

interface Toast {
  id: number
  text: string
  tone: ToastTone
}

let nextId = 0

export default function Toasts({
  room,
  myPlayerId,
}: {
  room: RoomState | null
  myPlayerId: string | null
}) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const prevPlayersRef = useRef<Record<string, { name: string }> | null>(null)
  const prevHostRef = useRef<string | null>(null)

  useEffect(() => {
    if (!room) {
      prevPlayersRef.current = null
      prevHostRef.current = null
      return
    }

    const currPlayers = room.players
    const prevPlayers = prevPlayersRef.current

    // Skip toasts on initial subscription — avoid N join toasts at once
    if (prevPlayers === null) {
      prevPlayersRef.current = currPlayers
      prevHostRef.current = room.hostId
      return
    }

    const next: Toast[] = []

    // Joins
    for (const [id, p] of Object.entries(currPlayers)) {
      if (!prevPlayers[id]) {
        const isMe = id === myPlayerId
        next.push({
          id: nextId++,
          text: isMe ? `You joined ${room.roomName}` : `🟢 ${p.name} joined`,
          tone: 'join',
        })
      }
    }

    // Leaves
    for (const [id, p] of Object.entries(prevPlayers)) {
      if (!currPlayers[id]) {
        next.push({
          id: nextId++,
          text: `🔴 ${p.name} left the room`,
          tone: 'leave',
        })
      }
    }

    // Host promotion — only toast the newly promoted player
    if (prevHostRef.current !== null && prevHostRef.current !== room.hostId) {
      if (room.hostId === myPlayerId) {
        next.push({
          id: nextId++,
          text: '👑 You are now the host',
          tone: 'host',
        })
      }
    }

    if (next.length > 0) {
      setToasts((prev) => [...prev, ...next])
      for (const t of next) {
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== t.id))
        }, 4000)
      }
    }

    prevPlayersRef.current = currPlayers
    prevHostRef.current = room.hostId
  }, [room, myPlayerId])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex max-w-sm -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg border px-4 py-2 text-center text-sm font-medium shadow-lg backdrop-blur ${
            t.tone === 'join'
              ? 'border-emerald-500/30 bg-slate-900/90 text-emerald-200'
              : t.tone === 'leave'
                ? 'border-amber-500/30 bg-slate-900/90 text-amber-200'
                : 'border-indigo-500/30 bg-slate-900/90 text-indigo-200'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}
