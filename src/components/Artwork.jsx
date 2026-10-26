import { useId } from 'react'

const SCENES = {
  tablets: (
    <>
      <path d="M119 86h70c8 0 14 6 14 14v112c0 9-7 16-16 16h-66c-9 0-16-7-16-16V102c0-9 7-16 16-16Z" fill="url(#stone)" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
      <path d="M201 86h70c9 0 16 7 16 16v112c0 9-7 16-16 16h-66c-9 0-16-7-16-16V102c0-9 7-16 16-16Z" fill="url(#stone)" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
      <path d="M133 120h57M133 141h57M133 162h42M215 120h57M215 141h57M215 162h42" stroke="rgba(255,255,255,.55)" strokeWidth="3" strokeLinecap="round" />
      <path d="M318 62c-18 11-24 28-14 45 10 16 31 20 50 8-6 23-26 38-51 35-27-4-45-28-41-55 4-25 25-43 50-43 2 0 4 0 6 1Z" fill="url(#flame)" />
      <path d="M309 78c-7 7-7 17 0 23" stroke="#ffe8b4" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  tomb: (
    <>
      <path d="M81 223V134c0-63 52-99 119-99s119 36 119 99v89" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2" />
      <path d="M140 223v-76c0-36 27-65 60-65s60 29 60 65v76Z" fill="#0a1a1b" />
      <circle cx="200" cy="138" r="45" fill="url(#sun)" opacity=".9" />
      <path d="M155 223v-66c0-26 20-47 45-47s45 21 45 47v66Z" fill="#122c2b" />
      <circle cx="200" cy="140" r="28" fill="url(#sun)" />
      <ellipse cx="287" cy="213" rx="44" ry="22" fill="#233c38" />
      <ellipse cx="287" cy="208" rx="44" ry="22" fill="#42645b" />
      <path d="M111 229h178" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M92 87l2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7ZM313 102l1 5 5 1-5 1-1 5-1-5-5-1 5-1 1-5Z" fill="#ffecbf" />
    </>
  ),
  dove: (
    <>
      <circle cx="201" cy="152" r="86" fill="url(#halo)" opacity=".8" />
      <g transform="translate(200 153)">
        <path d="M-49 11c-19-24-16-55 6-73 3 19 15 32 32 38-8-23-2-49 18-64 2 27 17 48 42 59 19 9 28 26 22 45-7 22-30 37-56 34-25-3-46-17-64-39Z" fill="url(#dove)" />
        <path d="M22 20c23-1 42 9 53 27-20 3-34 14-43 31-7-17-11-34-10-58Z" fill="url(#dove)" opacity=".88" />
        <path d="M-22 7c14-9 29-16 46-19M-14 27c18-4 34-12 47-23" stroke="rgba(70,60,40,.5)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="-14" cy="-5" r="2.6" fill="#2b2b23" />
        <path d="M-26 6l-15 7 17 4" fill="#d8a84f" />
      </g>
      <path d="M138 224c46-23 78-16 107 5M158 236c36-17 62-11 84 4" stroke="rgba(255,255,255,.16)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M295 89l3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8ZM104 116l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#ffe6ab" />
    </>
  ),
  shield: (
    <>
      <path d="M200 54c37 20 70 25 101 22v78c0 55-37 92-101 113-64-21-101-58-101-113V76c31 3 64-2 101-22Z" fill="url(#shield)" stroke="rgba(255,255,255,.25)" strokeWidth="2" />
      <path d="M200 82c23 12 44 17 64 16v56c0 38-24 64-64 80-40-16-64-42-64-80V98c20 1 41-4 64-16Z" fill="none" stroke="rgba(255,255,255,.24)" strokeWidth="1.5" />
      <path d="M200 108c-15 0-25 10-25 25v10h-8v39h66v-39h-8v-10c0-15-10-25-25-25Zm0 15c8 0 11 5 11 11v9h-22v-9c0-6 3-11 11-11Z" fill="url(#gold)" />
      <path d="M200 154v28" stroke="#3d2418" strokeWidth="3" strokeLinecap="round" />
      <path d="M85 219c23-25 55-38 83-42M315 219c-23-25-55-38-83-42" stroke="rgba(255,255,255,.13)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  lamp: (
    <>
      <circle cx="200" cy="153" r="91" fill="url(#halo)" opacity=".55" />
      <path d="M161 142c0-15 13-27 39-27s39 12 39 27v11c0 20-18 34-39 34s-39-14-39-34Z" fill="#8b5b43" />
      <path d="M180 168h40l18 40c-13 10-25 14-38 14s-25-4-38-14l18-40Z" fill="url(#clay)" />
      <path d="M181 132c0-23 7-38 19-48 12 10 19 25 19 48 0 17-8 29-19 29s-19-12-19-29Z" fill="url(#flame)" />
      <path d="M200 115c0-9 2-15 6-19 4 6 6 12 6 19 0 9-3 14-6 14s-6-5-6-14Z" fill="#fff3c4" />
      <path d="M152 214h96" stroke="rgba(255,255,255,.24)" strokeWidth="2" strokeLinecap="round" />
      <path d="M119 107c25-28 55-42 81-42s56 14 81 42" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" />
      <path d="M285 98l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6ZM111 152l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#ffe3ae" />
    </>
  ),
  crown: (
    <>
      <path d="M139 151l17-63 33 38 31-61 31 61 33-38 17 63H139Z" fill="url(#gold)" stroke="#ffe8ad" strokeWidth="1.5" />
      <path d="M144 157h132v34c0 19-29 34-66 34s-66-15-66-34v-34Z" fill="url(#goldDark)" />
      <circle cx="200" cy="178" r="9" fill="#9a3f37" />
      <circle cx="200" cy="178" r="4" fill="#f5d68f" />
      <path d="M158 155v29M242 155v29" stroke="rgba(62,37,14,.45)" strokeWidth="1.5" />
      <path d="M200 63v-19M180 69l-9-15M220 69l9-15" stroke="#ffdf94" strokeWidth="2" strokeLinecap="round" />
      <path d="M80 223c38-11 78-13 120-8s83 7 120-2" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="2" />
      <path d="M191 119l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#fff2c8" />
    </>
  ),
  loaves: (
    <>
      <path d="M123 173h154l-15 59c-2 8-10 14-18 14h-88c-8 0-16-6-18-14l-15-59Z" fill="url(#basket)" />
      <path d="M131 173c19 10 42 15 69 15s50-5 69-15" fill="none" stroke="rgba(255,255,255,.23)" strokeWidth="2" />
      <path d="M145 176c17 8 35 12 55 12s38-4 55-12" fill="none" stroke="#6b401f" strokeWidth="1.5" />
      <ellipse cx="168" cy="151" rx="34" ry="23" fill="url(#bread)" />
      <ellipse cx="210" cy="140" rx="31" ry="21" fill="url(#bread)" />
      <ellipse cx="247" cy="159" rx="29" ry="19" fill="url(#bread)" />
      <path d="M151 148c9-7 21-9 34-6M196 137c8-6 19-8 28-5M235 156c7-5 16-6 23-4" stroke="#8e5427" strokeWidth="2" strokeLinecap="round" />
      <path d="M118 205c-9-26 5-55 31-67 9 17 6 38-8 53-7 8-15 13-23 14Z" fill="url(#fish)" />
      <path d="M312 90l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#ffe6ab" />
    </>
  ),
  garden: (
    <>
      <circle cx="200" cy="125" r="66" fill="url(#sun)" opacity=".7" />
      <path d="M84 231h232" stroke="rgba(255,255,255,.14)" strokeWidth="2" />
      <path d="M200 234v-87" stroke="#5b3f28" strokeWidth="14" strokeLinecap="round" />
      <path d="M200 175c-28-3-48-17-58-43 28-4 51 7 62 32M200 194c29-4 50-19 59-46-29-3-53 9-62 35M200 148c-21-2-37-13-44-33 22-3 39 5 48 24" fill="none" stroke="#7d9c66" strokeWidth="5" strokeLinecap="round" />
      <circle cx="154" cy="140" r="20" fill="#779a5e" opacity=".75" />
      <circle cx="244" cy="149" r="23" fill="#88a968" opacity=".7" />
      <circle cx="172" cy="120" r="15" fill="#9ebc7a" opacity=".55" />
      <circle cx="231" cy="116" r="13" fill="#9ebc7a" opacity=".5" />
      <path d="M130 228c17-15 35-20 52-15M223 220c18-8 36-6 51 6" stroke="#6e8f58" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M110 90l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6ZM297 119l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#ffecbf" />
    </>
  ),
  sea: (
    <>
      <path d="M71 224c37-14 74-14 108 0s73 14 108 0 74-14 108 0" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="3" />
      <path d="M104 223c8-66 27-91 57-106-6 45 2 80 20 106H104ZM296 223c-8-66-27-91-57-106 6 45-2 80-20 106h77Z" fill="url(#water)" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
      <path d="M181 223c-2-55 4-97 19-137 15 40 21 82 19 137h-38Z" fill="#d2a460" opacity=".5" />
      <path d="M184 217c-1-43 4-78 16-110 12 32 17 67 16 110" fill="none" stroke="#f1d199" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" />
      <path d="M200 86v-26" stroke="#e8c781" strokeWidth="2" />
      <path d="M187 46c6-11 20-11 26 0-5 8-9 12-13 19-4-7-8-11-13-19Z" fill="url(#flame)" />
      <path d="M84 80l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#ffe6ab" />
      <path d="M305 97l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#ffe6ab" />
    </>
  ),
  harp: (
    <>
      <path d="M146 65c36-23 82-17 113 15 31 33 35 85 9 120l-21 27-35-29 25-33c10-14 7-35-7-47-15-12-36-10-48 4l-19 23-31-26 14-18c0-14 0-24 0-36Z" fill="url(#gold)" opacity=".92" />
      <path d="M188 77c28-10 59 1 77 25M180 100c27-11 56-2 73 20M171 124c23-8 48-1 64 17M160 148c19-6 39-1 53 13" stroke="#70492a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M146 65l47 169M235 87l18 152" stroke="#f1ce8b" strokeWidth="3" strokeLinecap="round" />
      <path d="M117 231c56-16 109-15 160 1" stroke="rgba(255,255,255,.15)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M289 82l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6ZM111 110l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#ffe8b4" />
    </>
  ),
  flame: (
    <>
      <path d="M100 231c31-16 66-21 100-21s69 5 100 21" stroke="rgba(255,255,255,.13)" strokeWidth="2" fill="none" />
      <path d="M168 178c-20-15-19-41 0-59 2 17 10 27 22 33-5-25 5-49 27-63 0 26 11 43 25 55 15 12 20 30 12 46-10 20-34 30-57 24-12-3-23-17-29-36Z" fill="url(#flame)" />
      <path d="M193 166c-9-8-7-22 3-31 1 9 5 15 12 18-3-13 2-26 14-33 0 13 6 22 13 28 7 7 9 16 5 24-5 10-17 15-28 12-7-2-13-9-19-18Z" fill="#ffe9ab" opacity=".8" />
      <path d="M132 124c-11-9-8-25 4-34-2 13 3 21 12 25M257 124c11-9 8-25-4-34 2 13-3 21-12 25" fill="none" stroke="#df9b51" strokeWidth="2" strokeLinecap="round" />
      <path d="M302 88l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6ZM97 94l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#ffe6ab" />
    </>
  ),
  stars: (
    <>
      <path d="M101 229h198" stroke="rgba(255,255,255,.14)" strokeWidth="2" />
      <path d="M135 227v-57l22-11 22 11v57M221 227v-57l22-11 22 11v57" fill="none" stroke="url(#gold)" strokeWidth="3" />
      <path d="M143 227v-53l14-7 14 7v53M229 227v-53l14-7 14 7v53" fill="rgba(255,231,168,.1)" />
      <path d="M157 157v-27M243 157v-27" stroke="#e8c97f" strokeWidth="2" />
      <path d="M157 120l4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9ZM243 120l4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9ZM200 77l4 11 11 4-11 4-4 11-4-11-11-4 11-4 4-11Z" fill="url(#gold)" />
      <circle cx="200" cy="158" r="21" fill="none" stroke="rgba(255,238,189,.4)" strokeWidth="1.5" />
      <path d="M105 82l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6ZM294 113l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#ffe6ab" />
    </>
  ),
  scrolls: (
    <>
      <path d="M115 201c37-13 73-13 110 0s73 13 110 0" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="2" />
      <path d="M130 185c27-11 53-11 80 0v-91c-27-11-53-11-80 0v91Z" fill="#e7d3a7" opacity=".9" />
      <path d="M210 185c27-11 53-11 80 0v-91c-27-11-53-11-80 0v91Z" fill="#d8bd88" opacity=".92" />
      <path d="M210 185c-8-7-17-10-27-11v-91c10 1 19 4 27 11v91Z" fill="#bfa06b" />
      <path d="M145 119c18-6 35-6 52 0M145 135c18-6 35-6 52 0M145 151c13-4 26-5 39-2M225 119c18-6 35-6 52 0M225 135c18-6 35-6 52 0M225 151c13-4 26-5 39-2" stroke="rgba(86,58,35,.48)" strokeWidth="2" strokeLinecap="round" />
      <path d="M122 70c23-10 45-11 68-3l-14 19c-15-3-30-1-45 6l-9-22ZM254 64c23-8 45-7 67 3l-7 23c-16-7-32-9-48-5l-12-21Z" fill="url(#gold)" opacity=".8" />
      <path d="M200 84l3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9Z" fill="#ffe8b4" />
    </>
  ),
  compass: (
    <>
      <circle cx="200" cy="151" r="86" fill="rgba(255,255,255,.035)" stroke="rgba(255,255,255,.28)" strokeWidth="2" />
      <circle cx="200" cy="151" r="68" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" strokeDasharray="2 7" />
      <path d="M200 91l16 45-16 15-16-15 16-45ZM200 211l-16-45 16-15 16 15-16 45ZM140 151l45-16 15 16-15 16-45-16ZM260 151l-45 16-15-16 15-16 45 16Z" fill="url(#gold)" />
      <circle cx="200" cy="151" r="8" fill="#f8e6b3" stroke="#7c5a30" strokeWidth="2" />
      <path d="M200 49v12M200 241v12M98 151h12M290 151h12" stroke="rgba(255,255,255,.26)" strokeWidth="2" strokeLinecap="round" />
      <path d="M115 230c24-27 51-38 85-38s61 11 85 38" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="2" />
      <path d="M299 84l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#ffe6ab" />
    </>
  ),
}

export function CategoryArt({ category, className = '', muted = false }) {
  const uid = useId().replace(/:/g, '')
  const art = category?.art || 'tablets'
  const color = category?.color || '#d9a35a'
  const tint = category?.tint || '#382817'

  return (
    <div className={`category-art ${muted ? 'is-muted' : ''} ${className}`} style={{ '--art-color': color }}>
      <svg viewBox="0 0 400 300" role="img" aria-label={`${category?.name || 'Bible'} illustration`}>
        <defs>
          <radialGradient id="vignette" cx="50%" cy="48%" r="72%">
            <stop offset=".55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".55" />
          </radialGradient>
          <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={tint} />
            <stop offset=".55" stopColor="#101722" />
            <stop offset="1" stopColor="#080d15" />
          </linearGradient>
          <radialGradient id="halo" cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor="#c99a52" stopOpacity=".4" />
            <stop offset="1" stopColor="#c99a52" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sun" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff0bd" />
            <stop offset=".5" stopColor="#d9aa60" />
            <stop offset="1" stopColor="#d9aa60" stopOpacity=".1" />
          </radialGradient>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f5dba0" />
            <stop offset=".5" stopColor="#d4a75d" />
            <stop offset="1" stopColor="#9b6a35" />
          </linearGradient>
          <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff0b5" />
            <stop offset=".45" stopColor="#db9a4e" />
            <stop offset="1" stopColor="#a14b22" />
          </linearGradient>
          <linearGradient id="stone" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d8cbb4" />
            <stop offset="1" stopColor="#8a7b66" />
          </linearGradient>
          <linearGradient id="dove" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff9e8" />
            <stop offset="1" stopColor="#d8c79d" />
          </linearGradient>
          <linearGradient id="shield" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6e4a3f" />
            <stop offset="1" stopColor="#2d1f1d" />
          </linearGradient>
          <linearGradient id="clay" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c17b52" />
            <stop offset="1" stopColor="#6e3f2b" />
          </linearGradient>
          <linearGradient id="goldDark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} />
            <stop offset="1" stopColor="#7d5226" />
          </linearGradient>
          <linearGradient id="basket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c59455" />
            <stop offset="1" stopColor="#76502c" />
          </linearGradient>
          <linearGradient id="bread" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f1d091" />
            <stop offset="1" stopColor="#b7773f" />
          </linearGradient>
          <linearGradient id="fish" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b9d6d0" />
            <stop offset="1" stopColor="#648e8b" />
          </linearGradient>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#345b69" />
            <stop offset="1" stopColor="#152c38" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill={`url(#bg-${uid})`} />
        <ellipse cx="200" cy="151" rx="176" ry="132" fill={`url(#halo-${uid})`} />
        <circle cx="200" cy="151" r="122" fill="none" stroke="rgba(255,255,255,.055)" strokeWidth="1" />
        <circle cx="200" cy="151" r="102" fill="none" stroke="rgba(255,255,255,.045)" strokeWidth="1" />
        {SCENES[art]}
        <rect width="400" height="300" fill="url(#vignette)" opacity=".25" />
      </svg>
      <div className="category-art__grain" />
    </div>
  )
}

export function HeroArt({ className = '' }) {
  const uid = useId().replace(/:/g, '')
  return (
    <div className={`hero-art ${className}`}>
      <svg viewBox="0 0 560 660" role="img" aria-label="An illuminated open Bible with rays of light">
        <defs>
          <radialGradient id={`heroGlow-${uid}`} cx="50%" cy="42%" r="50%">
            <stop offset="0" stopColor="#f4d38c" stopOpacity=".72" />
            <stop offset=".45" stopColor="#c79a52" stopOpacity=".22" />
            <stop offset="1" stopColor="#0b111c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`heroArch-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e8c27e" />
            <stop offset=".45" stopColor="#8b6536" />
            <stop offset="1" stopColor="#47321d" />
          </linearGradient>
          <linearGradient id={`heroPage-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff8e8" />
            <stop offset=".55" stopColor="#ead8b4" />
            <stop offset="1" stopColor="#c9ab77" />
          </linearGradient>
          <linearGradient id={`heroPage2-${uid}`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbf2de" />
            <stop offset=".6" stopColor="#dbc69f" />
            <stop offset="1" stopColor="#ad8b59" />
          </linearGradient>
          <linearGradient id={`heroSky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a2a3f" />
            <stop offset=".55" stopColor="#101926" />
            <stop offset="1" stopColor="#080d15" />
          </linearGradient>
          <linearGradient id={`heroRay-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe7a4" stopOpacity=".55" />
            <stop offset="1" stopColor="#ffe7a4" stopOpacity="0" />
          </linearGradient>
          <filter id={`heroBlur-${uid}`}>
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <rect width="560" height="660" rx="280" fill={`url(#heroSky-${uid})`} />
        <circle cx="280" cy="285" r="245" fill={`url(#heroGlow-${uid})`} />
        <path d="M58 582V282c0-150 92-230 222-230s222 80 222 230v300" fill="none" stroke={`url(#heroArch-${uid})`} strokeWidth="2.5" />
        <path d="M79 585V284c0-138 84-211 201-211s201 73 201 211v301" fill="none" stroke="rgba(255,227,164,.2)" strokeWidth="1" />
        <path d="M280 92v18M280 520v30M149 189l11 16M400 189l-11 16" stroke="#e3bd76" strokeWidth="2" strokeLinecap="round" />
        <g opacity=".6" filter={`url(#heroBlur-${uid})`}>
          <path d="M280 260l-140 300h280Z" fill={`url(#heroRay-${uid})`} />
        </g>
        <path d="M280 230L188 512h184Z" fill={`url(#heroRay-${uid})`} opacity=".5" />
        <circle cx="280" cy="280" r="77" fill="rgba(255,238,187,.08)" stroke="rgba(255,230,166,.28)" strokeWidth="1" />
        <path d="M280 221v36M280 303v36M242 280h-36M318 280h36M253 253l-25-25M307 253l25-25M253 307l-25 25M307 307l25 25" stroke="#f3d595" strokeWidth="1.5" strokeLinecap="round" opacity=".65" />
        <g transform="translate(0 18)">
          <path d="M160 374c39-17 79-22 120-12 41-10 81-5 120 12v122c-39-17-79-22-120-12-41-10-81-5-120 12V374Z" fill="#201711" stroke={`url(#heroArch-${uid})`} strokeWidth="2" />
          <path d="M171 381c35-14 70-18 109-9 39-9 74-5 109 9v103c-35-14-70-18-109-9-39-9-74-5-109 9V381Z" fill={`url(#heroPage-${uid})`} />
          <path d="M280 372c-39-9-74-5-109 9v103c35-14 70-18 109-9V372Z" fill={`url(#heroPage2-${uid})`} />
          <path d="M280 372v112" stroke="#9d7d4e" strokeWidth="2" opacity=".7" />
          <path d="M191 402c19-6 38-7 57-3M191 419c19-6 38-7 57-3M191 436c13-4 27-5 41-3M312 402c-19-6-38-7-57-3M312 419c-19-6-38-7-57-3M312 436c-13-4-27-5-41-3" stroke="#96764c" strokeWidth="2" strokeLinecap="round" opacity=".55" />
          <path d="M246 468h68v5h-68z" fill="#9a7543" opacity=".4" />
          <path d="M272 461l8 7-8 7" stroke="#9a7543" strokeWidth="2" fill="none" opacity=".6" />
        </g>
        <path d="M280 300v-32M266 280h28" stroke="#f7dfa7" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M126 458c23-35 51-50 85-45-4 32-29 57-67 62M434 458c-23-35-51-50-85-45 4 32 29 57 67 62" fill="none" stroke="rgba(177,201,157,.32)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="117" cy="349" r="3" fill="#f7dd9f" />
        <circle cx="447" cy="336" r="2.5" fill="#f7dd9f" />
        <circle cx="411" cy="122" r="2" fill="#f7dd9f" />
        <circle cx="128" cy="234" r="2" fill="#f7dd9f" />
        <circle cx="466" cy="212" r="1.5" fill="#f7dd9f" />
        <path d="M94 138l3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9ZM478 416l2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Z" fill="#ffe7a4" opacity=".8" />
        <path d="M58 584h444" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" />
      </svg>
      <div className="hero-art__grain" />
    </div>
  )
}
