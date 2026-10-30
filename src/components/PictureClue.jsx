import {
  Baby,
  BookOpen,
  Building2,
  CloudRain,
  Coins,
  Cross,
  Crown,
  DoorOpen,
  Fish,
  Flame,
  Footprints,
  Heart,
  HeartHandshake,
  Key,
  Lamp,
  Leaf,
  MapPin,
  Mountain,
  Music,
  PawPrint,
  Scale,
  ScrollText,
  Shield,
  Ship,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Swords,
  Tent,
  TreeDeciduous,
  Volume2,
  Waves,
  Wheat,
  Wind,
} from 'lucide-react'

const ICONS = {
  Baby,
  BookOpen,
  Building2,
  CloudRain,
  Coins,
  Cross,
  Crown,
  DoorOpen,
  Fish,
  Flame,
  Footprints,
  Heart,
  HeartHandshake,
  Key,
  Lamp,
  Leaf,
  MapPin,
  Mountain,
  Music,
  PawPrint,
  Scale,
  ScrollText,
  Shield,
  Ship,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Swords,
  Tent,
  TreeDeciduous,
  Volume2,
  Waves,
  Wheat,
  Wind,
}

const TONES = {
  jesus: '#e6c784',
  beginnings: '#9dc17e',
  exodus: '#e29a62',
  heroes: '#c9826b',
  women: '#dca5b4',
  'kings-prophets': '#d7ad67',
  'miracles-parables': '#7cb7a6',
  wisdom: '#b59bdb',
  'early-church': '#8db7de',
  revelation: '#e6c784',
  books: '#d7ad67',
  'numbers-geography': '#85b9c4',
  'old-testament': '#d7ad67',
  'new-testament': '#8db7de',
}

export function PictureClue({ symbols = [], category }) {
  const chosen = [...symbols, 'Sparkles', 'Sparkles', 'Sparkles'].slice(0, 3)
  const [Main, Left, Right] = chosen.map((name) => ICONS[name] || Star)
  const tone = TONES[category] || '#e6c784'

  return (
    <div className="picture-clue" style={{ '--clue-tone': tone }} role="img" aria-label="Picture clue with three symbols">
      <div className="picture-clue__frame">
        <span className="picture-clue__ring picture-clue__ring--outer" aria-hidden="true" />
        <span className="picture-clue__ring picture-clue__ring--inner" aria-hidden="true" />
        <span className="picture-clue__side picture-clue__side--left" aria-hidden="true"><Left size={24} /></span>
        <span className="picture-clue__main" aria-hidden="true"><Main size={60} strokeWidth={1.3} /></span>
        <span className="picture-clue__side picture-clue__side--right" aria-hidden="true"><Right size={24} /></span>
        <span className="picture-clue__caption"><Sparkles size={12} /> Picture clue</span>
      </div>
    </div>
  )
}
