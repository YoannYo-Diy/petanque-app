'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function Navigation() {
  const pathname = usePathname()

  const liens = [
    { href: '/', label: 'Compte', emoji: '👤' },
    { href: '/concours', label: 'Concours', emoji: '🏆' },
    { href: '/scores', label: 'Scores', emoji: '⚽' },
    { href: '/tirage', label: 'Tirage', emoji: '🎲' },
    { href: '/organisateur', label: 'Orga', emoji: '⚙️' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {liens.map((lien) => {
          const actif = pathname === lien.href
          return (
            <Link
              key={lien.href}
              href={lien.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                actif ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl">{lien.emoji}</span>
              <span className={`text-xs font-medium ${actif ? 'text-blue-600' : 'text-gray-400'}`}>
                {lien.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}