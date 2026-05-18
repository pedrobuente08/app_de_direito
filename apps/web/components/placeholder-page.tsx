type Props = {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-8 py-12 text-center">
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        {description ?? 'Em construção — previsto no PLANO V3.'}
      </p>
    </div>
  )
}
