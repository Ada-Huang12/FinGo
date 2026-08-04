import {
  AVATAR_SKINS,
  getAccessory,
  type AvatarEquipped,
  type AvatarSkin,
} from '../../lib/avatarCatalog'

const SKIN_HEX: Record<AvatarSkin, string> = {
  peach: '#F8C8A0',
  honey: '#D4A373',
  cocoa: '#8D5524',
  olive: '#C2B280',
  rose: '#E8A0A0',
}

export function AvatarFigure({
  name,
  skin = 'peach',
  equipped,
  size = 160,
  className = '',
}: {
  name: string
  skin?: AvatarSkin
  equipped: AvatarEquipped
  size?: number
  className?: string
}) {
  const tone = SKIN_HEX[skin] ?? SKIN_HEX.peach
  const hat = getAccessory(equipped.hat)
  const glasses = getAccessory(equipped.glasses)
  const scarf = getAccessory(equipped.scarf)
  const pet = getAccessory(equipped.pet)
  const cheeks = getAccessory(equipped.cheeks)
  const backdrop = getAccessory(equipped.backdrop)
  const initial = name.trim().slice(0, 1).toUpperCase() || '?'

  return (
    <div
      className={`relative mx-auto overflow-hidden rounded-[2rem] ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`${name}'s avatar`}>
        <defs>
          <linearGradient id="avatarGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dcfce7" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
        </defs>

        <rect width="200" height="200" rx="36" fill={backdrop?.accent ?? 'url(#avatarGlow)'} />

        {backdrop?.id === 'backdrop-clouds' && (
          <>
            <ellipse cx="48" cy="46" rx="28" ry="16" fill="#fff" opacity="0.85" />
            <ellipse cx="150" cy="58" rx="34" ry="18" fill="#fff" opacity="0.75" />
          </>
        )}
        {backdrop?.id === 'backdrop-stars' && (
          <>
            <circle cx="36" cy="40" r="3" fill="#fff" />
            <circle cx="168" cy="52" r="2.5" fill="#fff" />
            <circle cx="120" cy="28" r="2" fill="#FDE68A" />
            <circle cx="60" cy="70" r="2" fill="#fff" />
          </>
        )}
        {backdrop?.id === 'backdrop-garden' && (
          <>
            <circle cx="34" cy="170" r="18" fill="#86EFAC" opacity="0.7" />
            <circle cx="170" cy="166" r="22" fill="#4ADE80" opacity="0.55" />
            <circle cx="90" cy="178" r="14" fill="#F9A8D4" opacity="0.55" />
          </>
        )}

        {/* body */}
        <ellipse cx="100" cy="148" rx="46" ry="28" fill="#22C55E" opacity="0.2" />
        <circle cx="100" cy="108" r="52" fill={tone} />
        <circle cx="100" cy="108" r="52" fill="#fff" opacity="0.08" />

        {/* eyes */}
        <circle cx="82" cy="102" r="6" fill="#0F172A" />
        <circle cx="118" cy="102" r="6" fill="#0F172A" />
        <circle cx="84" cy="100" r="2" fill="#fff" />
        <circle cx="120" cy="100" r="2" fill="#fff" />

        {/* smile */}
        <path
          d="M84 120c8 10 24 10 32 0"
          fill="none"
          stroke="#0F172A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {cheeks?.id === 'cheeks-blush' && (
          <>
            <ellipse cx="68" cy="116" rx="8" ry="5" fill="#FB7185" opacity="0.45" />
            <ellipse cx="132" cy="116" rx="8" ry="5" fill="#FB7185" opacity="0.45" />
          </>
        )}
        {cheeks?.id === 'cheeks-sparkle' && (
          <>
            <text x="58" y="112" fontSize="14">
              ✨
            </text>
            <text x="128" y="112" fontSize="14">
              ✨
            </text>
          </>
        )}

        {glasses && (
          <g>
            {glasses.id === 'glasses-round' ? (
              <>
                <circle cx="82" cy="102" r="12" fill="none" stroke="#334155" strokeWidth="3" />
                <circle cx="118" cy="102" r="12" fill="none" stroke="#334155" strokeWidth="3" />
                <path d="M94 102h12" stroke="#334155" strokeWidth="3" />
              </>
            ) : (
              <>
                <rect x="68" y="94" width="26" height="16" rx="4" fill="#0F172A" opacity="0.75" />
                <rect x="106" y="94" width="26" height="16" rx="4" fill="#0F172A" opacity="0.75" />
                <path d="M94 102h12" stroke="#0F172A" strokeWidth="3" />
              </>
            )}
          </g>
        )}

        {scarf?.id === 'scarf-mint' && (
          <path
            d="M62 145c18 18 58 18 76 0"
            fill="none"
            stroke="#34D399"
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}
        {scarf?.id === 'scarf-heart' && (
          <text x="88" y="158" fontSize="28">
            🎀
          </text>
        )}

        {hat?.id === 'hat-frog' && (
          <>
            <ellipse cx="100" cy="62" rx="38" ry="18" fill="#4ADE80" />
            <circle cx="78" cy="48" r="10" fill="#4ADE80" />
            <circle cx="122" cy="48" r="10" fill="#4ADE80" />
            <circle cx="78" cy="48" r="4" fill="#14532D" />
            <circle cx="122" cy="48" r="4" fill="#14532D" />
          </>
        )}
        {hat?.id === 'hat-crown' && (
          <path d="M70 68l10-18 10 12 10-16 10 16 10-12 10 18-60 0z" fill="#FBBF24" stroke="#B45309" strokeWidth="2" />
        )}
        {hat?.id === 'hat-beanie' && (
          <>
            <path d="M62 72c8-28 68-28 76 0" fill="#60A5FA" />
            <rect x="62" y="68" width="76" height="12" rx="6" fill="#2563EB" />
            <circle cx="138" cy="58" r="8" fill="#FCA5A5" />
          </>
        )}

        {/* monogram badge */}
        <circle cx="100" cy="176" r="12" fill="#fff" opacity="0.9" />
        <text
          x="100"
          y="180"
          textAnchor="middle"
          fontSize="12"
          fontFamily="Plus Jakarta Sans, sans-serif"
          fontWeight="700"
          fill="#16A34A"
        >
          {initial}
        </text>
      </svg>

      {pet && (
        <div
          className="absolute bottom-2 right-2 grid h-12 w-12 place-items-center rounded-2xl bg-white/90 text-2xl shadow-md animate-floaty"
          title={pet.name}
        >
          {pet.emoji}
        </div>
      )}
    </div>
  )
}

export function AvatarSkinSwatches({
  value,
  onChange,
}: {
  value: AvatarSkin
  onChange: (skin: AvatarSkin) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {AVATAR_SKINS.map((s) => (
        <button
          key={s.id}
          type="button"
          title={s.label}
          onClick={() => onChange(s.id)}
          className={`h-8 w-8 rounded-full border-2 transition ${
            value === s.id ? 'border-fingo-ink scale-110' : 'border-white'
          }`}
          style={{ background: s.color }}
        />
      ))}
    </div>
  )
}
