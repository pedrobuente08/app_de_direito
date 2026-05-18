'use client'

import { useEffect, useState } from 'react'
import {
  criarAdvogadoAdversario,
  criarEscritorioAdversario,
  getEscritoriosAdversarios,
} from '@/lib/api'
import type { EscritorioAdversario } from '@/lib/types'
import { PopupFooterActions, PopupShell } from './popup-shell'

type Props = {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  audienciaId?: string | null
}

export function PopUpHabilitacaoAdversaria({
  open,
  onClose,
  onSuccess,
}: Props) {
  const [bancas, setBancas] = useState<EscritorioAdversario[]>([])
  const [modo, setModo] = useState<'existente' | 'nova'>('existente')
  const [escritorioId, setEscritorioId] = useState('')
  const [nomeBanca, setNomeBanca] = useState('')
  const [nomeAdvogado, setNomeAdvogado] = useState('')
  const [oab, setOab] = useState('')
  const [dataRef, setDataRef] = useState(() => new Date().toISOString().slice(0, 10))
  const [origem, setOrigem] = useState('MANUAL')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    getEscritoriosAdversarios()
      .then(setBancas)
      .catch(() => setBancas([]))
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nomeAdvogado.trim()) {
      setErro('Informe o nome do advogado.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      let advEscritorioId = escritorioId
      if (modo === 'nova') {
        if (!nomeBanca.trim()) {
          setErro('Informe o nome da banca.')
          return
        }
        const banca = await criarEscritorioAdversario({
          nomeCanonico: nomeBanca.trim(),
        })
        advEscritorioId = banca.id
      } else if (!advEscritorioId) {
        setErro('Selecione uma banca.')
        return
      }

      await criarAdvogadoAdversario({
        nomeCanonico: nomeAdvogado.trim(),
        oab: oab.trim() || undefined,
        escritorioAdversarioId: advEscritorioId || null,
        aliases: [nomeAdvogado.trim()],
      })

      onSuccess?.()
      onClose()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <PopupShell
      open={open}
      title="Habilitação adversária"
      subtitle="Banca + advogado"
      onClose={onClose}
      footer={
        <PopupFooterActions
          formId="popup-habilitacao"
          onCancel={onClose}
          loading={salvando}
        />
      }
    >
      <form id="popup-habilitacao" onSubmit={handleSubmit} className="space-y-3">
        {erro ? <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p> : null}
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={modo === 'existente'}
              onChange={() => setModo('existente')}
            />
            Banca existente
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={modo === 'nova'}
              onChange={() => setModo('nova')}
            />
            Nova banca
          </label>
        </div>
        {modo === 'existente' ? (
          <label className="flex flex-col gap-1 text-xs">
            Banca *
            <select
              value={escritorioId}
              onChange={(e) => setEscritorioId(e.target.value)}
              className="rounded border px-2 py-1.5 text-sm"
            >
              <option value="">Selecione…</option>
              {bancas.map((b) => (
                <option key={b.id} value={b.id}>{b.nomeCanonico}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-xs">
            Nome da banca *
            <input
              value={nomeBanca}
              onChange={(e) => setNomeBanca(e.target.value)}
              className="rounded border px-2 py-1.5 text-sm"
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs">
          Advogado *
          <input
            required
            value={nomeAdvogado}
            onChange={(e) => setNomeAdvogado(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          OAB
          <input
            value={oab}
            onChange={(e) => setOab(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            Data
            <input
              type="date"
              value={dataRef}
              onChange={(e) => setDataRef(e.target.value)}
              className="rounded border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Origem
            <select
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              className="rounded border px-2 py-1.5 text-sm"
            >
              <option value="MANUAL">Manual</option>
              <option value="COMUNICA">Comunicação</option>
              <option value="DRAWER">Drawer</option>
            </select>
          </label>
        </div>
      </form>
    </PopupShell>
  )
}
