import { useTheme } from '../../contexts/ThemeContext'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'

export function ThemePicker() {
  const { themeId, themes, setThemeId } = useTheme()

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-fingo-blue-soft text-fingo-blue">
          <Icon name="palette" className="text-[1.4rem]" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-fingo-ink">Theme colors</h2>
          <p className="mt-0.5 text-sm text-fingo-muted">
            Pick an accent palette for FinGo. Your choice is saved on this device.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => {
          const selected = theme.id === themeId
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setThemeId(theme.id)}
              className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                selected
                  ? 'border-fingo-green bg-fingo-green-soft/60 shadow-sm ring-2 ring-fingo-green/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="h-8 w-8 rounded-full shadow-inner"
                  style={{
                    background: `linear-gradient(135deg, ${theme.swatch[0]}, ${theme.swatch[1]})`,
                  }}
                />
                <span
                  className="h-8 flex-1 rounded-full opacity-90"
                  style={{
                    background: `linear-gradient(90deg, ${theme.colors.greenSoft}, ${theme.colors.blueSoft})`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-bold text-fingo-ink">{theme.name}</p>
                  <p className="text-xs text-fingo-muted">{theme.description}</p>
                </div>
                {selected && (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-fingo-green text-white">
                    <Icon name="check" className="text-[1rem]" />
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
