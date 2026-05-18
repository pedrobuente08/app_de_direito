type Props = {
  className?: string
}

/** Sino de notificações — traço simples, sem emoji. */
export function IconBell({ className = 'h-[18px] w-[18px]' }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 14.5 18 8Z" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
