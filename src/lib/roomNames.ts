export interface RoomNameEntry {
  name: string
  meaning: string
}

/**
 * Curated Telugu-cinema room names (inspired by the Telugu movies dataset —
 * iconic titles + playful twists), each with the joke explained.
 * Every name is ≤ 32 chars so it fits the room header.
 */
export const ROOM_NAMES: RoomNameEntry[] = [
  { name: 'Pokiri Playlist', meaning: 'Pokiri (2006): Mahesh Babu’s rowdy blockbuster — a playlist that plays by its own rules.' },
  { name: 'Arya Adda', meaning: 'Arya (2004): the one-sided love classic — an adda where every song is dedicated to someone.' },
  { name: 'Bommarillu Beats', meaning: 'Bommarillu (2006): the feel-good family gem — soft, happy beats only.' },
  { name: 'Happy Days Jukebox', meaning: 'Happy Days (2007): engineering-college nostalgia — a hostel-room jukebox.' },
  { name: 'Nuvvu Naaku Nachav Nights', meaning: 'Nuvvu Naaku Nachav (2001): “I like you” rom-com — songs you can’t help liking.' },
  { name: 'Manam Mehfil', meaning: 'Manam (2014): three generations, one family — a mehfil for all ages.' },
  { name: 'Jersey Jukebox', meaning: 'Jersey (2019): a father’s comeback — late-bloomers’ anthems.' },
  { name: 'Ala Playlistlo', meaning: 'Twist on Ala Vaikunthapurramuloo (2020): “in this playlist” — all killer, no filler.' },
  { name: 'Pushpa Party', meaning: 'Pushpa (2021): “Thaggede Le” (won’t bow) — loud, unstoppable party.' },
  { name: 'RRR Raagaalu', meaning: 'RRR (2022): Rise-Roar-Revolt — epic, roaring raagaalu (melodies).' },
  { name: 'Baahubali Beats', meaning: 'Baahubali: larger-than-life — only massive bangers allowed.' },
  { name: 'Eega Echoes', meaning: 'Eega (2012): a housefly’s revenge — small songs, giant echoes.' },
  { name: 'Jathiratnalu Jukebox', meaning: 'Jathi Ratnalu (2021): three jobless legends — gloriously silly picks.' },
  { name: 'DJ Tillu Tunes', meaning: 'DJ Tillu (2022): “Star DJ” energy — Tillu-style swag on the decks.' },
  { name: 'Pelli Choopulu Playlist', meaning: 'Pelli Choopulu (2016): matchmaking gone right — songs that click instantly.' },
  { name: 'Arjun Reddy Raagalu', meaning: 'Arjun Reddy (2017): intense heartbreak — for loud feelings only.' },
  { name: 'Geetha Govindam Grooves', meaning: 'Geetha Govindam (2018): charming romance — smooth, teasing grooves.' },
  { name: 'Rangasthalam Records', meaning: 'Rangasthalam (2018): rustic 80s village — raw, earthy records.' },
  { name: 'Mahanati Melodies', meaning: 'Mahanati (2018): the Savitri biopic — golden-oldie melodies.' },
  { name: 'Srimanthudu Symphony', meaning: 'Srimanthudu (2015): giving back to roots — a feel-rich symphony.' },
  { name: 'Athadu Anthems', meaning: 'Athadu (2005): the hired gun with a heart — sharp-shooter anthems.' },
  { name: 'Okkadu Orchestra', meaning: 'Okkadu (2003): one man against all — full-volume orchestra.' },
  { name: 'Gabbar Singh Grooves', meaning: 'Gabbar Singh (2012): the cop with comic timing — swagger grooves.' },
  { name: 'Attarintiki Dhun', meaning: 'Attarintiki Daredi (2013): winning over the family — tunes that win everyone. Dhun = tune.' },
  { name: 'Aravinda Adda', meaning: 'Aravinda Sametha (2018): ending the faction feud — an adda that settles all fights.' },
  { name: 'Rang De Records', meaning: 'Rang De (2021): paint your world — colourful records only.' },
  { name: 'Uppena Unplugged', meaning: 'Uppena (2021): fierce young love — raw, unplugged waves.' },
  { name: 'Ee Playlistki Emaindi', meaning: 'Twist on Ee Nagaraniki Emaindi (2018): when the queue goes gloriously off-track.' },
  { name: 'Ante Playlistki', meaning: 'Twist on Ante Sundaraniki (2022): “and so, to the playlist” — dedicate everything.' },
  { name: 'Goodachari Grooves', meaning: 'Goodachari (2018): the spy thriller — secret-agent grooves.' },
  { name: 'Brochevarevarura Beats', meaning: 'Brochevarevarura (2019): “who will save us” — chaotic-good beats.' },
  { name: 'Mathu Vadalara Mixtape', meaning: 'Mathu Vadalara (2019): the drug-fueled caper — a mixtape you shouldn’t trust.' },
  { name: 'Cinema Bandi Baja', meaning: 'Cinema Bandi (2021): village filmmakers — full baja (band) energy.' },
  { name: 'Seetimaarr Symphony', meaning: 'Seetimaarr (2021): the kabaddi whistle — blow-the-whistle symphony.' },
  { name: 'Waltair Vibes', meaning: 'Waltair Veerayya (2023): Chiru’s vintage mass return — old-school vibes.' },
  { name: 'Guntur Grooves', meaning: 'Guntur Kaaram (2024): extra spicy mass — extra-kaaram grooves.' },
  { name: 'Devara Dhun', meaning: 'Devara (2024): a sea of fear — deep-ocean dhun (tune).' },
  { name: 'Kalki Beats 2898', meaning: 'Kalki 2898 AD (2024): myth meets future — time-travel beats.' },
  { name: 'Sita Ramam Symphony', meaning: 'Sita Ramam (2022): a wartime love letter — letter-perfect symphony.' },
  { name: 'Bimbisara Beats', meaning: 'Bimbisara (2022): the time-travelling king — ancient-meets-bass beats.' },
  { name: 'SR Karaoke Mandapam', meaning: 'Twist on SR Kalyanamandapam (2021, wedding hall): a mandapam where everyone sings.' },
  { name: 'Zombie Reddy Records', meaning: 'Zombie Reddy (2021): the zombie comedy — undead-party records.' },
  { name: 'Most Eligible Beats', meaning: 'Most Eligible Bachelor (2021): swipe-right-worthy beats only.' },
  { name: 'Fidaa Frequencies', meaning: 'Fidaa (2017): head-over-heels village romance — full-signal frequencies.' },
  { name: 'Idiot Beats', meaning: 'Idiot (2002): lovable-rogue energy — no-rules beats.' },
  { name: 'Desamuduru Dhun', meaning: 'Desamuduru (2007): the fearless reporter — breaking-news dhun.' },
  { name: 'Dhamaka Dhol', meaning: 'Dhamaka (2022): double-role blast — double-dhol energy.' },
  { name: 'Baby Beats', meaning: 'Baby (2023): messy young love — tender-loud beats.' },
]

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Roll the dice: a random Telugu-cinema room name entry (name + meaning). */
export function generateRoomNameEntry(): RoomNameEntry {
  return pick(ROOM_NAMES)
}

/** Roll the dice: just the room name string (≤ 32 chars, trimmed). */
export function generateRoomName(): string {
  return generateRoomNameEntry().name.slice(0, 32).trim()
}

/** Look up the meaning for a room name (null when unknown / hand-typed). */
export function getRoomNameMeaning(name: string): string | null {
  const found = ROOM_NAMES.find((e) => e.name === name.trim())
  return found ? found.meaning : null
}
