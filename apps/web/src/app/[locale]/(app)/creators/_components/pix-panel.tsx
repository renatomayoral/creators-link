'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Settings2 } from 'lucide-react'
import { Input } from '@repo/ui/components/input'
import { Label } from '@repo/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import { Switch } from '@repo/ui/components/switch'
import { useToast } from '@repo/ui/hooks/use-toast'
import { type CreatorDetail } from '@/lib/creators'
import { PixIcon } from './pix-icon'

type Props = { detail: CreatorDetail }

const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave aleatória' },
] as const

export function PixPanel({ detail }: Props) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [showConfig, setShowConfig] = useState(true)
  const [pixKey, setPixKey] = useState(detail.pixKey ?? '')
  const [pixKeyType, setPixKeyType] = useState<string>(detail.pixKeyType ?? 'cpf')

  const accepted = new Set(detail.acceptedPayments)
  const manualEnabled = accepted.has('pix_manual')
  const autoEnabled = accepted.has('pix_auto')
  const hasPixKey = detail.pixKey != null && detail.pixKey.length > 0
  const isSetup = manualEnabled || autoEnabled

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/creators/${detail.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Falha ao salvar')
    }
    void qc.invalidateQueries({ queryKey: ['creator', detail.id] })
  }

  async function toggleMode(mode: 'pix_manual' | 'pix_auto', enabled: boolean) {
    if (enabled && !hasPixKey) {
      toast({
        title: 'Cadastre a chave Pix primeiro',
        description: 'Informe a chave Pix da criadora antes de ativar o recebimento.',
        variant: 'destructive',
      })
      return
    }
    const next = new Set(accepted)
    if (enabled) next.add(mode)
    else next.delete(mode)
    try {
      await patch({ acceptedPayments: Array.from(next) })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    }
  }

  async function savePixKey() {
    try {
      await patch({ pixKey: pixKey || null, pixKeyType: pixKey ? pixKeyType : null })
      toast({ title: 'Chave Pix salva!' })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="border-t px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <PixIcon className="h-4 w-4 shrink-0" />
        <span className="text-[13px] font-semibold">Pix</span>
        {isSetup && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Ativo
          </span>
        )}
        <button
          onClick={() => setShowConfig(v => !v)}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      <p className="text-muted-foreground mb-3 text-[13px]">
        Pix é o sistema de pagamentos instantâneos do Banco Central do Brasil — o fã transfere
        direto da conta bancária ou carteira digital dele, sem precisar de cartão de crédito. Só
        funciona para recebimentos em reais (BRL).
      </p>

      {showConfig && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border p-3">
            <div className="flex flex-col gap-1">
              <Label className="text-[12px]">Chave Pix</Label>
              <div className="flex gap-2">
                <Select value={pixKeyType} onValueChange={setPixKeyType}>
                  <SelectTrigger className="h-8 w-36 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIX_KEY_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  onBlur={savePixKey}
                  placeholder="Digite a chave Pix"
                  className="h-8 flex-1 text-[13px]"
                />
              </div>
              {!hasPixKey && (
                <span className="text-muted-foreground mt-1 text-[11px]">
                  Cadastre a chave antes de ativar os recebimentos abaixo.
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] font-semibold">Pix</span>
                <p className="text-muted-foreground text-[12px]">
                  Pagamentos avulsos e conteúdo pago (pay-per-view).
                </p>
              </div>
              <Switch checked={manualEnabled} onCheckedChange={v => toggleMode('pix_manual', v)} />
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] font-semibold">Pix Automático</span>
                <p className="text-muted-foreground text-[12px]">
                  Cobrança recorrente das assinaturas VIP.
                </p>
              </div>
              <Switch checked={autoEnabled} onCheckedChange={v => toggleMode('pix_auto', v)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
