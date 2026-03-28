import gu from "../i18n/gu.json"

type Translations = { [k: string]: string }

const translations: Translations = gu as any

export function t(key: string, vars?: Record<string, string | number>): string {
  let str = translations[key] ?? key
  if (vars) {
    for (const k of Object.keys(vars)) {
      const v = String(vars[k])
      str = str.split(`{${k}}`).join(v)
    }
  }
  return str
}

export default t
