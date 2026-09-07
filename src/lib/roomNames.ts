const ADJECTIVES = [
  'Dhoom',
  'Gully',
  'Masala',
  'Filmy',
  'Disco',
  'Dil',
  'Mast',
  'Bindaas',
  'Jhakaas',
  'Desi',
  'Bombay',
  'Dilli',
  'Punjabi',
  'Bandra',
  'Neon',
  'Retro',
  'Indie',
  'Sufi',
  'Bollywood',
  'Rangeela',
  'Jazbaati',
  'Zabardast',
  'Zindagi',
  'Rockstar',
  'Andheri',
  'Colaba',
] as const

const NOUNS = [
  'Beats',
  'Groovers',
  'Jukebox',
  'Mehfil',
  'Adda',
  'Mixtape',
  'Vibes',
  'Dhun',
  'Raag',
  'Taal',
  'Dhol',
  'Express',
  'Junction',
  'Playlist',
  'Symphony',
  'Records',
  'Collective',
  'Anthem',
  'Echoes',
  'Waves',
  'Circuit',
  'Baithak',
  'Nights',
] as const

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Generate a fun, Indian pop-culture flavored room name like "Gully Groovers" or "Masala Beats". */
export function generateRoomName(): string {
  const name = `${pick(ADJECTIVES)} ${pick(NOUNS)}`
  return name.slice(0, 32).trim()
}
