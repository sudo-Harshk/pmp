import { useCallback, useEffect, useRef, useState } from 'react'
import {
  get,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
  type DataSnapshot,
} from 'firebase/database'
import { db } from '@/lib/firebase'
import { extractVideoId, processSubmissions } from '@/lib/youtube'
import { calculateRoundScores } from '@/lib/scoring'
import {
  INTERMISSION_DURATION_SECONDS,
  JUKEBOX_MAX_SECONDS,
  navigateJukebox,
  shuffleFisherYates,
  SNIPPET_DURATION_SECONDS,
} from '@/lib/playerLogic'
import { clearSession, getSession } from '@/lib/storage'
import type {
  GameMode,
  PlaylistTrack,
  Player,
  RoomState,
  ScoreDelta,
  Submission,
} from '@/types/game'

const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return code
}

function generateId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeUrl(url: string): string | null {
  const videoId = extractVideoId(url)
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null
}

function computeTracks(
  submissions: Record<string, string[]>,
  players: Record<string, Player>,
): PlaylistTrack[] {
  const raw: Submission[] = []
  for (const [playerId, urls] of Object.entries(submissions)) {
    const name = players[playerId]?.name ?? playerId
    for (const url of urls) {
      raw.push({ youtubeUrl: url, submittedBy: name })
    }
  }
  return processSubmissions(raw)
}

function fromFirestoreRoom(value: unknown | null, roomCode: string): RoomState | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>

  const rawPlayers = (data.players as Record<string, unknown>) ?? {}
  const players: Record<string, Player> = {}
  for (const [id, p] of Object.entries(rawPlayers)) {
    const player = p as Partial<Player>
    players[id] = {
      id: player.id ?? id,
      name: player.name ?? 'Unknown',
      score: typeof player.score === 'number' ? player.score : 0,
      hasSubmitted: player.hasSubmitted ?? false,
      bestRound: typeof player.bestRound === 'number' ? player.bestRound : 0,
    }
  }

  return {
    roomCode,
    status: (data.status as RoomState['status']) ?? 'LOBBY',
    hostId: (data.hostId as string) ?? '',
    mode: (data.mode as GameMode) ?? 'GUESSING',
    players,
    tracks: Array.isArray(data.tracks) ? (data.tracks as PlaylistTrack[]) : [],
    currentTrackIndex:
      typeof data.currentTrackIndex === 'number' ? data.currentTrackIndex : 0,
    timerSeconds:
      typeof data.timerSeconds === 'number' ? data.timerSeconds : SNIPPET_DURATION_SECONDS,
    roundStartTime: typeof data.roundStartTime === 'number' ? data.roundStartTime : undefined,
    guesses: (data.guesses as Record<string, string>) ?? {},
    scoreDeltas: Array.isArray(data.scoreDeltas) ? (data.scoreDeltas as ScoreDelta[]) : undefined,
    playbackPaused: data.playbackPaused === true,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : undefined,
  }
}

export interface UseRoomResult {
  room: RoomState | null
  myPlayerId: string | null
  isHost: boolean
  serverOffset: number
  createRoom: (hostName: string) => Promise<{ roomCode: string; playerId: string }>
  joinRoom: (roomCode: string, playerName: string) => Promise<string>
  submitSongs: (roomCode: string, playerId: string, youtubeUrls: string[]) => Promise<void>
  submitGuess: (roomCode: string, playerId: string, guessedName: string) => Promise<void>
  startSubmission: (roomCode: string) => Promise<void>
  hostReveal: (roomCode: string) => Promise<void>
  hostNext: (roomCode: string) => Promise<void>
  setMode: (roomCode: string, mode: GameMode) => Promise<void>
  jukeboxNavigate: (
    roomCode: string,
    nav: { type: 'PREV' } | { type: 'NEXT' },
  ) => Promise<void>
  jukeboxJump: (roomCode: string, index: number) => Promise<void>
  jukeboxSeek: (roomCode: string, seconds: number) => Promise<void>
  setPlaybackPaused: (roomCode: string, paused: boolean) => Promise<void>
  updateGameState: (roomCode: string, updates: Partial<RoomState>) => Promise<void>
  leaveRoom: (roomCode: string, playerId: string) => Promise<void>
}

interface UseRoomOptions {
  onInvalidSession?: () => void
}

export function useRoom(roomCode?: string, options?: UseRoomOptions): UseRoomResult {
  const { onInvalidSession } = options ?? {}
  const onInvalidSessionRef = useRef(onInvalidSession)
  onInvalidSessionRef.current = onInvalidSession

  const [room, setRoom] = useState<RoomState | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [serverOffset, setServerOffset] = useState(0)
  const roomRef = useRef(room)

  roomRef.current = room

  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset')
    const unsub = onValue(offsetRef, (snap) => setServerOffset(snap.val() ?? 0))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!roomCode) {
      setRoom(null)
      return
    }
    const roomRefInstance = ref(db, `rooms/${roomCode}`)
    const unsubscribe = onValue(
      roomRefInstance,
      (snapshot: DataSnapshot) => {
        setRoom(fromFirestoreRoom(snapshot.val(), roomCode))
      },
      (error: Error) => {
        console.error('Room listener error:', error)
        setRoom(null)
      },
    )
    return () => unsubscribe()
  }, [roomCode])

  useEffect(() => {
    if (!room || myPlayerId !== null) return
    const session = getSession()
    if (session && session.roomCode === room.roomCode && room.players[session.playerId]) {
      setMyPlayerId(session.playerId)
    } else {
      clearSession()
      onInvalidSessionRef.current?.()
    }
  }, [room, myPlayerId])

  // Host failover — if hostId not in players, promote first remaining player
  useEffect(() => {
    if (!room) return
    if (room.players[room.hostId]) return
    const remainingIds = Object.keys(room.players)
    if (remainingIds.length === 0) return
    const newHostId = remainingIds[0]
    void update(ref(db, `rooms/${room.roomCode}`), { hostId: newHostId })
  }, [room?.hostId, room?.players])

  const createRoom = useCallback(
    async (hostName: string): Promise<{ roomCode: string; playerId: string }> => {
      let code = generateRoomCode()
      let exists = (await get(ref(db, `rooms/${code}`))).exists()
      while (exists) {
        code = generateRoomCode()
        exists = (await get(ref(db, `rooms/${code}`))).exists()
      }

      const hostId = generateId()
      const createdAt = Date.now()
      const roomState: RoomState = {
        roomCode: code,
        status: 'LOBBY',
        hostId,
        mode: 'GUESSING',
        players: { [hostId]: { id: hostId, name: hostName, score: 0, hasSubmitted: false, bestRound: 0 } },
        tracks: [],
        currentTrackIndex: 0,
        timerSeconds: SNIPPET_DURATION_SECONDS,
        guesses: {},
        createdAt,
      }

      await set(ref(db, `rooms/${code}`), roomState)
      setMyPlayerId(hostId)
      return { roomCode: code, playerId: hostId }
    },
    [],
  )

  const joinRoom = useCallback(
    async (roomCodeInput: string, playerName: string): Promise<string> => {
      const code = roomCodeInput.trim().toUpperCase()
      const playerId = generateId()
      const snapshot = await get(ref(db, `rooms/${code}`))
      const current = fromFirestoreRoom(snapshot.val(), code)
      if (!current) {
        throw new Error('Room not found')
      }
      if (current.status !== 'LOBBY') {
        throw new Error('Room already in progress')
      }
      const player: Player = {
        id: playerId,
        name: playerName,
        score: 0,
        hasSubmitted: false,
        bestRound: 0,
      }
      await update(ref(db, `rooms/${code}/players`), { [playerId]: player })
      setMyPlayerId(playerId)
      return playerId
    },
    [],
  )

  const submitSongs = useCallback(
    async (code: string, playerId: string, youtubeUrls: string[]): Promise<void> => {
      const normalized = youtubeUrls
        .map(normalizeUrl)
        .filter((url): url is string => url !== null)

      await runTransaction(ref(db, `rooms/${code}`), (currentVal) => {
        if (currentVal === null) return currentVal
        const data = currentVal as Record<string, unknown>
        const submissions = (data.submissions as Record<string, string[]>) ?? {}
        submissions[playerId] = normalized
        const playersData = (data.players as Record<string, Player>) ?? {}
        const tracks = computeTracks(submissions, playersData)
        return {
          ...data,
          submissions,
          tracks,
          players: {
            ...playersData,
            [playerId]: { ...playersData[playerId], hasSubmitted: true },
          },
        }
      })
    },
    [],
  )

  const submitGuess = useCallback(
    async (code: string, playerId: string, guessedName: string): Promise<void> => {
      await update(ref(db, `rooms/${code}/guesses`), { [playerId]: guessedName })
    },
    [],
  )

  const startSubmission = useCallback(
    async (code: string): Promise<void> => {
      await update(ref(db, `rooms/${code}`), { status: 'SUBMISSION' })
    },
    [],
  )

  const hostReveal = useCallback(async (code: string): Promise<void> => {
    if (!room || room.hostId !== myPlayerId) return
    const callerId = myPlayerId
    await runTransaction(ref(db, `rooms/${code}`), (currentVal) => {
      if (currentVal === null) return currentVal
      const data = currentVal as Record<string, unknown>
      if ((data.hostId as string) !== callerId) return currentVal
      if ((data.status as RoomState['status']) !== 'PLAYING') return currentVal
      const players = (data.players as Record<string, Player>) ?? {}
      const tracks = Array.isArray(data.tracks) ? (data.tracks as PlaylistTrack[]) : []
      const currentIndex = (data.currentTrackIndex as number) ?? 0
      const currentTrack = tracks[currentIndex]
      const guesses = (data.guesses as Record<string, string>) ?? {}

      if (!currentTrack) return currentVal

      const currentScores: Record<string, number> = {}
      for (const [id, player] of Object.entries(players)) {
        currentScores[id] = player.score ?? 0
      }

      const { scores, deltas } = calculateRoundScores(currentTrack, guesses, currentScores, players)

      const submitterNames = new Set(currentTrack.submittedBy)
      const scoreDeltas: ScoreDelta[] = Object.entries(deltas).map(([playerId, delta]) => {
        const isSubmitter = submitterNames.has(players[playerId]?.name ?? playerId)
        const reason =
          delta <= 0 ? 'none' : isSubmitter ? 'submitter-bonus' : 'correct-guess'
        return {
          playerId,
          playerName: players[playerId]?.name ?? playerId,
          delta,
          reason,
        }
      })

      const updatedPlayers: Record<string, Player> = {}
      for (const [id, player] of Object.entries(players)) {
        const roundDelta = deltas[id] ?? 0
        updatedPlayers[id] = {
          ...player,
          score: scores[id] ?? player.score ?? 0,
          bestRound: Math.max(player.bestRound ?? 0, roundDelta),
        }
      }

      const updatedTracks = tracks.map((t, i) =>
        i === currentIndex ? { ...t, played: true } : t,
      )

      return {
        ...data,
        status: 'REVEAL',
        players: updatedPlayers,
        tracks: updatedTracks,
        scoreDeltas,
        guesses,
      }
    })
  }, [room, myPlayerId])

  const hostNext = useCallback(async (code: string): Promise<void> => {
    if (!room || room.hostId !== myPlayerId) return
    const callerId = myPlayerId
    await runTransaction(ref(db, `rooms/${code}`), (currentVal) => {
      if (currentVal !== null) {
        const hostId = (currentVal as Record<string, unknown>).hostId as string | undefined
        if (hostId !== callerId) return currentVal
      }
      if (currentVal === null) return currentVal
      const data = currentVal as Record<string, unknown>
      const tracks = Array.isArray(data.tracks) ? (data.tracks as PlaylistTrack[]) : []
      const currentIndex = (data.currentTrackIndex as number) ?? 0
      const status = data.status as RoomState['status']

      if (status === 'SUBMISSION' || (status === 'PLAYING' && (data.mode as GameMode) === 'JUKEBOX' && tracks.length === 0)) {
        // Begin playback at the first track once submissions are in — shuffle once for engagement.
        const mode = (data.mode as GameMode) ?? 'GUESSING'
        const shuffled = shuffleFisherYates(tracks)
        const tracksWithPlayed =
          shuffled.length > 0 ? shuffled.map((t, i) => (i === 0 ? { ...t, played: true } : t)) : shuffled
        return {
          ...data,
          status: 'PLAYING',
          currentTrackIndex: 0,
          timerSeconds: mode === 'JUKEBOX' ? JUKEBOX_MAX_SECONDS : SNIPPET_DURATION_SECONDS,
          roundStartTime: Date.now() + serverOffset,
          tracks: tracksWithPlayed,
          guesses: {},
          scoreDeltas: null,
          playbackPaused: false,
        }
      }

      // Skip unplayable track during PLAYING (host override)
      if (status === 'PLAYING') {
        const mode = (data.mode as GameMode) ?? 'GUESSING'
        const updatedTracks = tracks.map((t, i) => (i === currentIndex ? { ...t, played: true } : t))
        if (currentIndex + 1 < tracks.length) {
          return {
            ...data,
            status: 'PLAYING',
            currentTrackIndex: currentIndex + 1,
            timerSeconds: mode === 'JUKEBOX' ? JUKEBOX_MAX_SECONDS : SNIPPET_DURATION_SECONDS,
            roundStartTime: Date.now() + serverOffset,
            tracks: updatedTracks,
            guesses: {},
            scoreDeltas: null,
            playbackPaused: false,
          }
        }
        return { ...data, status: 'GAMEOVER', tracks: updatedTracks, scoreDeltas: null }
      }

      if (status === 'REVEAL') {
        if (currentIndex + 1 < tracks.length) {
          return {
            ...data,
            status: 'INTERMISSION',
            currentTrackIndex: currentIndex + 1,
            timerSeconds: INTERMISSION_DURATION_SECONDS,
            roundStartTime: Date.now() + serverOffset,
            guesses: {},
            scoreDeltas: null,
            playbackPaused: false,
          }
        }
        return { ...data, status: 'GAMEOVER', scoreDeltas: null }
      }

      if (status === 'INTERMISSION') {
        return {
          ...data,
          status: 'PLAYING',
          timerSeconds: SNIPPET_DURATION_SECONDS,
          roundStartTime: Date.now() + serverOffset,
          guesses: {},
          scoreDeltas: null,
          playbackPaused: false,
        }
      }

      return currentVal
    })
  }, [room, myPlayerId, serverOffset])

  const setMode = useCallback(
    async (code: string, mode: GameMode): Promise<void> => {
      if (!room || room.hostId !== myPlayerId) return
      await update(ref(db, `rooms/${code}`), { mode })
    },
    [room, myPlayerId],
  )

  const jukeboxNavigate = useCallback(
    async (code: string, nav: { type: 'PREV' } | { type: 'NEXT' }): Promise<void> => {
      if (!room) return
      await runTransaction(ref(db, `rooms/${code}`), (currentVal) => {
        if (currentVal === null) return currentVal
        const data = currentVal as Record<string, unknown>
        const tracks = Array.isArray(data.tracks) ? (data.tracks as PlaylistTrack[]) : []
        const currentIndex = (data.currentTrackIndex as number) ?? 0

        if (tracks.length === 0) return currentVal

        const { currentTrackIndex, finished } = navigateJukebox(currentIndex, tracks.length, nav)
        if (finished) {
          return { ...data, status: 'GAMEOVER', scoreDeltas: null, playbackPaused: false }
        }

        const updatedTracks = tracks.map((t, i) =>
          i === currentTrackIndex ? { ...t, played: true } : t,
        )
        return {
          ...data,
          currentTrackIndex,
          timerSeconds: JUKEBOX_MAX_SECONDS,
          roundStartTime: Date.now() + serverOffset,
          tracks: updatedTracks,
          scoreDeltas: null,
          playbackPaused: false,
        }
      })
    },
    [room, myPlayerId, serverOffset],
  )

  const jukeboxJump = useCallback(
    async (code: string, index: number): Promise<void> => {
      if (!room) return
      await runTransaction(ref(db, `rooms/${code}`), (currentVal) => {
        if (currentVal === null) return currentVal
        const data = currentVal as Record<string, unknown>
        const tracks = Array.isArray(data.tracks) ? (data.tracks as PlaylistTrack[]) : []
        if (index < 0 || index >= tracks.length) return currentVal
        const updatedTracks = tracks.map((t, i) => (i === index ? { ...t, played: true } : t))
        return {
          ...data,
          currentTrackIndex: index,
          timerSeconds: JUKEBOX_MAX_SECONDS,
          roundStartTime: Date.now() + serverOffset,
          tracks: updatedTracks,
          scoreDeltas: null,
          playbackPaused: false,
        }
      })
    },
    [room, serverOffset],
  )

  const jukeboxSeek = useCallback(
    async (code: string, seconds: number): Promise<void> => {
      if (!room) return
      const clamped = Math.max(0, Math.min(JUKEBOX_MAX_SECONDS, Math.floor(seconds)))
      await update(ref(db, `rooms/${code}`), {
        roundStartTime: Date.now() + serverOffset - clamped * 1000,
        timerSeconds: Math.max(0, JUKEBOX_MAX_SECONDS - clamped),
      })
    },
    [room, serverOffset],
  )

  const setPlaybackPaused = useCallback(
    async (code: string, paused: boolean): Promise<void> => {
      if (!room) return
      if (paused) {
        const elapsed = room.roundStartTime ? Math.floor((Date.now() + serverOffset - room.roundStartTime) / 1000) : 0
        await update(ref(db, `rooms/${code}`), {
          playbackPaused: true,
          timerSeconds: Math.max(0, JUKEBOX_MAX_SECONDS - elapsed),
        })
      } else {
        // Resume — reset roundStartTime so elapsed continues from pause point
        const pausedElapsed = room.roundStartTime
          ? Math.floor((Date.now() + serverOffset - room.roundStartTime) / 1000)
          : 0
        const remaining = Math.max(0, JUKEBOX_MAX_SECONDS - pausedElapsed)
        await update(ref(db, `rooms/${code}`), {
          playbackPaused: false,
          roundStartTime: Date.now() + serverOffset - pausedElapsed * 1000,
          timerSeconds: remaining,
        })
      }
    },
    [room, serverOffset],
  )

  const updateGameState = useCallback(
    async (code: string, updates: Partial<RoomState>): Promise<void> => {
      await update(ref(db, `rooms/${code}`), updates as Record<string, unknown>)
    },
    [],
  )

  const leaveRoom = useCallback(
    async (code: string, playerId: string): Promise<void> => {
      const playerRef = ref(db, `rooms/${code}/players/${playerId}`)
      await remove(playerRef)
    },
    [],
  )

  // Absolute timestamp synchronization — host drives timer via roundStartTime delta
  useEffect(() => {
    if (!room) return
    const isHostNow = room.hostId === myPlayerId && myPlayerId !== null
    if (!isHostNow) return
    if (room.status !== 'PLAYING' && room.status !== 'INTERMISSION') return

    const duration =
      room.status === 'INTERMISSION'
        ? INTERMISSION_DURATION_SECONDS
        : room.mode === 'JUKEBOX'
          ? JUKEBOX_MAX_SECONDS
          : SNIPPET_DURATION_SECONDS

    if (typeof room.roundStartTime !== 'number') {
      void update(ref(db, `rooms/${room.roomCode}`), {
        roundStartTime: Date.now() + serverOffset,
        timerSeconds: duration,
      })
      return
    }

    const code = room.roomCode
    const tick = () => {
      const elapsed = Math.floor((Date.now() + serverOffset - (room.roundStartTime as number)) / 1000)
      const remaining = Math.max(0, duration - elapsed)
      if (remaining !== room.timerSeconds) {
        void update(ref(db, `rooms/${code}`), { timerSeconds: remaining })
      }
      if (remaining <= 0) {
        if (room.status === 'PLAYING' && room.mode !== 'JUKEBOX') {
          void hostReveal(code)
        } else if (room.status === 'INTERMISSION') {
          void hostNext(code)
        }
      }
    }

    tick()
    const id = window.setInterval(tick, 500)
    return () => window.clearInterval(id)
  }, [room, myPlayerId, hostReveal, hostNext, serverOffset])

  const isHost = room !== null && myPlayerId !== null && room.hostId === myPlayerId

  return {
    room,
    myPlayerId,
    isHost,
    serverOffset,
    createRoom,
    joinRoom,
    submitSongs,
    submitGuess,
    startSubmission,
    hostReveal,
    hostNext,
    setMode,
    jukeboxNavigate,
    jukeboxJump,
    jukeboxSeek,
    setPlaybackPaused,
    updateGameState,
    leaveRoom,
  }
}
