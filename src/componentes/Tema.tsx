import { useEffect } from 'react';
import { definicoes, useConsulta } from '../dados/repositorio';
import type { Tema } from '../dados/modelo';

/** Aplica o tema escolhido nas Definições ao documento. */
export function AplicarTema() {
  const tema = useConsulta(() => definicoes.ler<Tema>('tema', 'auto'));
  useEffect(() => {
    if (tema) document.documentElement.dataset.tema = tema;
  }, [tema]);
  return null;
}
