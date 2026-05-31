'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Btn } from '@/components/ui/btn'
import { KpiCard } from '@/components/ui/kpi-card'
import { NotificacoesBell } from '@/components/notificacoes/notificacoes-bell'
import { mockData } from '@/lib/design-system'
import { getAuthMe, getCapturaAlerta } from '@/lib/api'
import type { CapturaAlerta } from '@/lib/types'

function saudacaoPorHorario(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function dataFormatada(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

function IconFile() {
  return (
    <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

const kpiIcons = {
  file: IconFile,
  calendar: IconCalendar,
  shield: IconShield,
  clock: IconClock,
} as const

export default function PainelPage() {
  const router = useRouter()
  const [nome, setNome] = useState<string>('Pedro')
  const [periodo, setPeriodo] = useState<'mes' | 'acervo'>('acervo')
  const [alertaCaptura, setAlertaCaptura] = useState<CapturaAlerta | null>(null)

  useEffect(() => {
    getAuthMe()
      .then((me) => {
        const n = me.nome?.trim().split(/\s+/)[0]
        if (n) setNome(n)
      })
      .catch(() => {})
    getCapturaAlerta()
      .then(setAlertaCaptura)
      .catch(() => setAlertaCaptura(null))
  }, [])

  const maxMeses = 24

  return (
    <div className="mx-auto max-w-pauta px-[38px] pb-10 pt-[26px]">
      {/* Top bar */}
      <div className="mb-[30px] flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[1.2px] text-pauta-muted">
          Início&nbsp;/&nbsp;<span className="text-pauta-ink">Painel</span>
        </p>
        <div className="flex items-center gap-3">
          <div className="flex w-[264px] items-center gap-2 rounded-pauta-md border border-pauta-line bg-pauta-card px-[14px] py-[9px] text-[13px] text-pauta-faint">
            <svg className="h-[15px] w-[15px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Buscar processo, parte, OAB…
          </div>
          <NotificacoesBell />
          <Btn variant="primary" onClick={() => router.push('/importacao')}>
            <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo processo
          </Btn>
        </div>
      </div>

      {/* Greeting */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-[33px] font-semibold leading-[1.05] tracking-[-0.4px] text-pauta-ink">
            {saudacaoPorHorario()},{' '}
            <em className="not-italic text-pauta-forest-2">{nome}</em>.
          </h2>
          <p className="mt-[7px] text-sm text-pauta-muted">
            {dataFormatada()} · 18 prazos exigem atenção nos próximos 7 dias.
          </p>
        </div>
        <div className="inline-flex rounded-pauta-md border border-pauta-line bg-pauta-card-2 p-[3px]">
          {(['mes', 'acervo'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              className={`rounded-[7px] px-[15px] py-[7px] text-[12.5px] font-semibold transition-all ${
                periodo === p
                  ? 'bg-pauta-card text-pauta-ink shadow-pauta-xs'
                  : 'text-pauta-muted hover:text-pauta-ink-soft'
              }`}
            >
              {p === 'mes' ? 'Este mês' : 'Acervo'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-[18px] grid grid-cols-4 gap-4">
        {mockData.kpis.map((kpi) => {
          const Icon = kpiIcons[kpi.icon]
          return (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              delta={kpi.delta}
              deltaType={kpi.type}
              foot={kpi.deltaLabel}
              icon={<Icon />}
            />
          )
        })}
      </div>

      {/* Middle grid: Jurimetria + Previsão */}
      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: '1.62fr 1fr' }}>
        {/* Jurimetria */}
        <div className="rounded-pauta-xl border border-pauta-line bg-pauta-card px-[22px] py-[21px]">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <h3 className="font-display text-[18.5px] font-semibold tracking-[-0.2px] text-pauta-ink">
                Tempo médio de tramitação
              </h3>
              <p className="mt-[3px] text-[12.5px] text-pauta-muted">
                Seu escritório comparado à média da comarca · em meses
              </p>
            </div>
            <span className="rounded-[20px] border border-pauta-line-2 bg-pauta-card-2 px-[10px] py-[5px] font-mono text-[10px] uppercase tracking-[0.6px] text-pauta-forest-2">
              Fonte · DataJud CNJ
            </span>
          </div>

          <div className="mb-1.5 mt-3.5 flex gap-[18px] text-xs text-pauta-ink-soft">
            <span className="flex items-center gap-1.5">
              <i
                className="inline-block h-[11px] w-[11px] rounded-[3px]"
                style={{ background: 'linear-gradient(90deg, #1C4435, #2B5C47)' }}
              />
              Seu escritório
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-0.5 w-3.5 border-b-2 border-dashed border-pauta-sage" />
              Média da comarca
            </span>
          </div>

          <div className="mt-2">
            {mockData.jurimetriaChart.map((row, i) => {
              const pctSeu = (row.seu / maxMeses) * 100
              const pctMedia = (row.media / maxMeses) * 100
              const acima = 'acima' in row && row.acima
              return (
                <div
                  key={row.comarca}
                  className={`grid items-center gap-3.5 py-2.5 ${i > 0 ? 'border-t border-pauta-line' : ''}`}
                  style={{ gridTemplateColumns: '128px 1fr' }}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-pauta-ink">{row.comarca}</p>
                    <p className="text-[11px] text-pauta-muted">{row.subtext}</p>
                  </div>
                  <div className="relative h-[26px]">
                    <div
                      className="absolute top-0 h-[26px] border-r-2 border-dashed border-pauta-sage"
                      style={{ left: `${pctMedia}%` }}
                    >
                      <b className="absolute -top-px right-1.5 font-mono text-[10.5px] text-[#7C8E83]">
                        {row.media}
                      </b>
                    </div>
                    <div
                      className="absolute left-0 top-[3px] flex h-5 items-center rounded-[5px] pl-2"
                      style={{
                        width: `${pctSeu}%`,
                        background: acima
                          ? 'linear-gradient(90deg, #9A5226, #BD7A34)'
                          : 'linear-gradient(90deg, #1C4435, #2B5C47)',
                      }}
                    >
                      <b className="font-mono text-[11px] font-medium text-[#EAE6D8]">{row.seu} m</b>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-pauta-sm border border-pauta-line border-l-[3px] border-l-pauta-forest-2 bg-pauta-card-2 px-3.5 py-3">
            <svg className="mt-0.5 h-[17px] w-[17px] shrink-0 text-pauta-forest-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
            </svg>
            <p className="text-[13px] leading-relaxed text-pauta-ink-soft">
              Em <b className="font-semibold text-pauta-forest-2">Feira de Santana</b> seu tempo está 5%
              acima da média — concentração de 3 casos parados na fase de perícia. Os demais foros
              superam a comarca em até <b className="font-semibold text-pauta-forest-2">31%</b>.
            </p>
          </div>
        </div>

        {/* Previsão */}
        <div className="rounded-pauta-xl border border-pauta-line bg-pauta-card px-[22px] py-[21px]">
          <div className="mb-1">
            <h3 className="font-display text-[18.5px] font-semibold tracking-[-0.2px] text-pauta-ink">
              Previsão de desfecho
            </h3>
            <p className="mt-[3px] text-[12.5px] text-pauta-muted">
              Modelo treinado em 14.7 mil casos análogos
            </p>
          </div>

          <div className="mb-0.5 mt-1.5 flex flex-col items-center">
            <svg width="170" height="104" viewBox="0 0 170 104" aria-hidden>
              <path
                d="M16 96 A69 69 0 0 1 154 96"
                fill="none"
                stroke="#E6E0D0"
                strokeWidth="13"
                strokeLinecap="round"
              />
              <path
                d="M16 96 A69 69 0 0 1 137 53"
                fill="none"
                stroke="#1C4435"
                strokeWidth="13"
                strokeLinecap="round"
              />
              <circle cx="137" cy="53" r="7" fill="#FCFBF6" stroke="#1C4435" strokeWidth="3" />
            </svg>
            <div className="-mt-[30px] text-center">
              <p className="font-mono text-[30px] font-medium tracking-[-1px] text-pauta-forest">
                {mockData.previsao.probabilidade}%
              </p>
              <p className="text-[11px] text-pauta-muted">probabilidade de êxito</p>
            </div>
          </div>

          <div className="mt-1.5 rounded-[11px] border border-pauta-line bg-pauta-card-2 px-3.5 py-[13px]">
            <p className="text-[13.5px] font-semibold text-pauta-ink">{mockData.previsao.caso}</p>
            <p className="mt-[3px] font-mono text-[10.5px] tracking-[0.3px] text-pauta-muted">
              {mockData.previsao.numero} · {mockData.previsao.tipo}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-pauta-md border border-pauta-line px-3 py-[11px]">
              <p className="text-[11px] font-medium text-pauta-muted">Valor esperado (EV)</p>
              <p className="mt-[5px] font-mono text-lg font-medium text-pauta-ink">
                R$ 42,3<small className="text-[11px] text-pauta-muted">mil</small>
              </p>
            </div>
            <div className="rounded-pauta-md border border-pauta-line px-3 py-[11px]">
              <p className="text-[11px] font-medium text-pauta-muted">Duração estimada</p>
              <p className="mt-[5px] font-mono text-lg font-medium text-pauta-ink">
                ~11<small className="text-[11px] text-pauta-muted"> meses</small>
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-pauta-ink-soft">
            <svg className="mt-0.5 h-[15px] w-[15px] shrink-0 text-pauta-ochre" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3v3M5 6l2 2M19 6l-2 2M3 13h4l-2-5-2 5zm0 0a3 3 0 0 0 4 0M17 13h4l-2-5-2 5zm0 0a3 3 0 0 0 4 0M12 6v13M8 21h8" />
            </svg>
            <span>
              3ª Vara Cível · Juíza defere tutela antecipada em{' '}
              <b className="text-[#9A6322]">{mockData.previsao.tendencia}</b> dos casos análogos.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom grid: Prazos + WhatsApp */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.62fr 1fr' }}>
        {/* Prazos da semana */}
        <div className="rounded-pauta-xl border border-pauta-line bg-pauta-card px-[22px] py-[21px]">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <h3 className="font-display text-[18.5px] font-semibold tracking-[-0.2px] text-pauta-ink">
                Prazos da semana
              </h3>
              <p className="mt-[3px] text-[12.5px] text-pauta-muted">
                Capturados automaticamente · com origem rastreável
              </p>
            </div>
            <Link
              href="/pendencias"
              className="rounded-[20px] border border-pauta-line-2 bg-pauta-card-2 px-[10px] py-[5px] font-mono text-[10px] uppercase tracking-[0.6px] text-pauta-forest-2 hover:bg-pauta-paper-2"
            >
              Ver todos
            </Link>
          </div>

          <div className="mt-1.5">
            {mockData.prazos.map((prazo, i) => {
              const chipClass =
                prazo.criticidade === 'crit'
                  ? 'bg-[var(--delta-crit-bg)] text-pauta-clay'
                  : prazo.criticidade === 'soon'
                    ? 'bg-[var(--delta-warn-bg)] text-[var(--delta-warn-text)]'
                    : 'bg-pauta-pos-bg text-pauta-pos'
              return (
                <div
                  key={`${prazo.dia}-${prazo.tipo}`}
                  className={`flex items-center gap-3.5 py-3 ${i > 0 ? 'border-t border-pauta-line' : ''}`}
                >
                  <div
                    className={`flex h-[46px] w-[54px] shrink-0 flex-col items-center justify-center rounded-pauta-sm font-mono text-[11px] font-medium leading-[1.1] ${chipClass}`}
                  >
                    <b className="text-base">{prazo.dia}</b>
                    <span className="text-[9px] uppercase tracking-[0.5px]">{prazo.mes}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-pauta-ink">{prazo.tipo}</p>
                    <p className="mt-0.5 text-xs text-pauta-muted">{prazo.caso}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-[7px] border border-[#CFE0CC] bg-pauta-pos-bg px-2 py-1 font-mono text-[10px] text-pauta-pos">
                    <svg className="h-[11px] w-[11px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="m20 6-11 11-5-5" />
                    </svg>
                    {prazo.fonte}
                  </span>
                  <div
                    className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full font-display text-xs font-semibold text-white"
                    style={{ background: prazo.responsavelCor }}
                    title={prazo.responsavel}
                  >
                    {prazo.responsavel}
                  </div>
                </div>
              )
            })}
          </div>

          {alertaCaptura?.ativo ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-pauta-md border border-[var(--alert-border)] bg-[var(--alert-bg)] px-[13px] py-[11px]">
              <svg className="mt-0.5 h-[17px] w-[17px] shrink-0 text-[var(--alert-icon)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
              <p className="text-[12.5px] leading-relaxed text-[var(--alert-text)]">
                <b className="font-semibold">{alertaCaptura.titulo}.</b> {alertaCaptura.mensagem}
              </p>
            </div>
          ) : null}
        </div>

        {/* WhatsApp / IA */}
        <div className="relative overflow-hidden rounded-pauta-xl border border-pauta-wa-bg bg-pauta-wa-bg px-[19px] py-[18px] text-[#E7E3D6]">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(130% 90% at 90% 0%, rgba(157,179,164,0.13), transparent 60%)',
            }}
            aria-hidden
          />
          <div className="relative z-[2] mb-3.5 flex items-center justify-between">
            <h3 className="font-display text-[17px] font-semibold text-[#F1ECDE]">
              Atendimento ao cliente
            </h3>
            <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.5px] text-pauta-sage">
              <i className="inline-block h-[7px] w-[7px] rounded-full bg-[#69C28E] shadow-[0_0_0_3px_rgba(105,194,142,0.2)]" />
              IA ativa
            </span>
          </div>

          <div className="relative z-[2] mb-2 max-w-[84%] rounded-[13px] rounded-bl-[4px] bg-pauta-forest px-3 py-2 text-[12.5px] leading-[1.46]">
            <span className="mb-0.5 block font-mono text-[9px] uppercase tracking-[0.5px] opacity-70">
              Cliente · M. Silva
            </span>
            {mockData.whatsapp.clientMsg}
          </div>

          <div className="relative z-[2] mb-2 ml-auto max-w-[84%] rounded-[13px] rounded-br-[4px] bg-[#EDE8DA] px-3 py-2 text-[12.5px] leading-[1.46] text-[#21271F]">
            <span className="mb-0.5 block font-mono text-[9px] uppercase tracking-[0.5px] opacity-70">
              Pauta IA
            </span>
            {mockData.whatsapp.botReply}
          </div>

          <div className="relative z-[2] mt-1 flex items-center gap-2 border-t border-[rgba(157,179,164,0.2)] pt-[11px] text-[11.5px] text-pauta-sage">
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#9DB3A4" strokeWidth="1.8">
              <path d="M16 11a4 4 0 1 0-4-4M4 21v-2a4 4 0 0 1 4-4h4M18 16v6M15 19h6" />
            </svg>
            Encaminha para o advogado se o cliente pedir valores ou prazos sensíveis.
          </div>
        </div>
      </div>
    </div>
  )
}
