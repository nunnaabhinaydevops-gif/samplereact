import { useEffect } from 'react'

export function useOutsideClick(ref, onOutside, enabled) {
  useEffect(() => {
    if (!enabled) return undefined
    function handlePointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) onOutside()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [ref, onOutside, enabled])
}
