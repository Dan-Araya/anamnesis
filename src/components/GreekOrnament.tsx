/** Small, local ornaments: they stay crisp at any size and work offline. */
export function Laurel({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      {[false, true].map((mirror) => (
        <g key={String(mirror)} transform={mirror ? 'translate(100 0) scale(-1 1)' : undefined}>
          <path d="M48 86C18 72 14 43 32 17" stroke="currentColor" strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${25 - Math.sin(i * .7) * 8} ${28 + i * 11}) rotate(${-25 + i * 15})`}>
              <path d="M0 0C-13-2-16-10-14-16C-4-14 0-8 0 0Z" fill="currentColor" />
              <path d="M1 2C13-1 16-8 14-14C4-11 1-6 1 2Z" fill="currentColor" />
            </g>
          ))}
        </g>
      ))}
      <path d="m39 87 22-7m-1 7-22-7" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export function Column({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 130 180" fill="none" aria-hidden="true">
      <path d="M32 55h66l-5 108H37Z" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="2" />
      <path d="M43 66v86m14-86v86m15-86v86m14-86v86" stroke="var(--surface-raised)" strokeWidth="6" />
      <path d="M40 66v86m14-86v86m15-86v86m14-86v86" stroke="var(--border)" strokeWidth="2" />
      <path d="M22 8h86v12H22Zm9 43h68v12H31ZM28 163h74v10H28Zm-6 10h86v7H22Z" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="2" />
      <path d="M35 49C8 59 1 22 25 20h80c24 2 17 39-10 29l-7-16H42Z" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <path d="M33 30c-17-7-21 14-8 14 8 0 8-10 2-9m70-5c17-7 21 14 8 14-8 0-8-10-2-9M44 42h42" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function LockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></svg>
}
