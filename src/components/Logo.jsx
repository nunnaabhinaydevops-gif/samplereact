import { COMPANY_NAME, LOGO_URL } from '../lib/brand'

export function Logo({ className = 'h-12 w-auto' }) {
  return <img src={LOGO_URL} alt={`${COMPANY_NAME} logo`} className={className} />
}
