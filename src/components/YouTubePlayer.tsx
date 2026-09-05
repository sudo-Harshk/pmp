import { useEffect, useRef } from 'react'
import YouTube, { type YouTubeEvent, type YouTubeProps } from 'react-youtube'

export interface YouTubePlayerHandle {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
}

export const YOUTUBE_EMBED_ERROR_CODES = new Set([101, 150])
export const YOUTUBE_INVALID_ERROR_CODES = new Set([2, 100])

export function isEmbedRestrictedError(errorCode: number): boolean {
  return YOUTUBE_EMBED_ERROR_CODES.has(errorCode)
}

export function isInvalidVideoError(errorCode: number): boolean {
  return YOUTUBE_INVALID_ERROR_CODES.has(errorCode)
}

interface YouTubePlayerProps {
  videoId: string
  isPlaying: boolean
  onEnded?: () => void
  onError?: (errorCode: number) => void
  onReady?: (handle: YouTubePlayerHandle) => void
  onStateChange?: (event: YouTubeEvent<number>) => void
}

export default function YouTubePlayer({
  videoId,
  isPlaying,
  onEnded,
  onError,
  onReady,
  onStateChange,
}: YouTubePlayerProps) {
  const targetRef = useRef<YouTubePlayerHandle | null>(null)

  const opts: YouTubeProps['opts'] = {
    height: '360',
    width: '640',
    playerVars: {
      autoplay: 0,
      rel: 0,
    },
  }

  function handleReady(event: YouTubeEvent<number>): void {
    const target = event.target
    const handle: YouTubePlayerHandle = {
      playVideo: () => target.playVideo(),
      pauseVideo: () => target.pauseVideo(),
      seekTo: (seconds: number, allowSeekAhead: boolean) => target.seekTo(seconds, allowSeekAhead),
      getCurrentTime: () => target.getCurrentTime(),
      getDuration: () => target.getDuration(),
      getPlayerState: () => target.getPlayerState(),
    }
    targetRef.current = handle
    onReady?.(handle)
  }

  useEffect(() => {
    const handle = targetRef.current
    if (!handle) return
    if (isPlaying) {
      handle.playVideo()
    } else {
      handle.pauseVideo()
    }
  }, [isPlaying])

  const playerProps: YouTubeProps = {
    videoId,
    opts,
    onReady: handleReady,
    onStateChange: onStateChange,
    onEnd: onEnded,
    onError: (event: YouTubeEvent<number>) => {
      const code = typeof event.data === 'number' ? event.data : Number(event.data)
      onError?.(code)
    },
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-700 bg-black aspect-video">
      <YouTube key={videoId} {...playerProps} className="h-full w-full" />
    </div>
  )
}
