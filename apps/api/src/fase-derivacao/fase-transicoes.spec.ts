import { FaseDerivada } from './fase-derivacao.constants';
import { transicaoFasePermitida } from './fase-transicoes';

describe('transicaoFasePermitida', () => {
  it('permite permanecer na mesma fase', () => {
    expect(
      transicaoFasePermitida(
        FaseDerivada.AGUARDANDO_SENTENCA,
        FaseDerivada.AGUARDANDO_SENTENCA,
      ),
    ).toBe(true);
  });

  it('bloqueia pular de audiência direto para trânsito (padrão)', () => {
    expect(
      transicaoFasePermitida(
        FaseDerivada.AGUARDANDO_AUDIENCIA,
        FaseDerivada.AGUARDANDO_TRANSITO,
      ),
    ).toBe(false);
  });

  it('permite audiência → sentença', () => {
    expect(
      transicaoFasePermitida(
        FaseDerivada.AGUARDANDO_AUDIENCIA,
        FaseDerivada.AGUARDANDO_SENTENCA,
      ),
    ).toBe(true);
  });

  it('respeita mapa customizado do escritório', () => {
    expect(
      transicaoFasePermitida(
        'FASE A',
        'FASE B',
        { 'FASE A': ['FASE B'] },
      ),
    ).toBe(true);
    expect(
      transicaoFasePermitida(
        'FASE A',
        'FASE C',
        { 'FASE A': ['FASE B'] },
      ),
    ).toBe(false);
  });
});
