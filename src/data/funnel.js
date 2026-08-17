/* =========================================================================
   FUNIL DE QUALIFICAÇÃO
   -------------------------------------------------------------------------
   Etapas: 01 Necessidade → 02 Estágio → 03 Conversa
   Duas perguntas apenas — o objetivo é abrir o WhatsApp com contexto, não
   substituir a conversa por um formulário.

   Cada opção carrega o trecho de texto que entra na mensagem do WhatsApp,
   então a mensagem final é montada a partir dos dados — não há texto de
   mensagem espalhado pelos componentes.
   ========================================================================= */

import { COMPANY_NAME } from './company.js';
import { FUNNEL_STORAGE_KEY } from '../config/constants.js';

/** Etapa 01 — o que a pessoa precisa desenvolver. */
export const NEEDS = [
  {
    id: 'sistema-erp',
    icon: 'dashboard',
    label: 'Sistema / ERP',
    description:
      'Gestão, PDV, estoque, vendas e operações em um sistema próprio.',
    sentence: 'Estou interessado em desenvolver um Sistema / ERP.',
  },
  {
    id: 'site',
    icon: 'browser',
    label: 'Site',
    description:
      'Site institucional ou landing page para apresentar sua empresa.',
    sentence: 'Estou interessado em desenvolver um Site.',
  },
  {
    id: 'web-app',
    icon: 'layers',
    label: 'Aplicação Web',
    description: 'Uma aplicação acessível pelo navegador, com login e regras.',
    sentence: 'Estou interessado em desenvolver uma Aplicação Web.',
  },
  {
    id: 'automacao',
    icon: 'bolt',
    label: 'Automação',
    description: 'Eliminar tarefas manuais e repetitivas do dia a dia.',
    sentence:
      'Preciso desenvolver uma automação para um processo da minha empresa.',
  },
  {
    id: 'integracao',
    icon: 'nodes',
    label: 'Integração',
    description: 'Fazer sistemas, APIs e plataformas conversarem entre si.',
    sentence: 'Preciso integrar sistemas, APIs e plataformas.',
  },
  {
    id: 'banco-de-dados',
    icon: 'database',
    label: 'Banco de Dados',
    description: 'Estruturar, organizar e integrar os dados da operação.',
    sentence: 'Preciso estruturar e organizar um banco de dados.',
  },
  {
    id: 'outro',
    icon: 'sparkles',
    label: 'Outro',
    description: 'Sua necessidade é diferente? Me conte o que você imagina.',
    sentence: 'Tenho uma necessidade de software para o meu negócio.',
  },
];

/** Etapa 02 — em que estágio o projeto está. */
export const STAGES = [
  {
    id: 'ideia',
    icon: 'sparkles',
    label: 'Tenho apenas uma ideia',
    sentence: 'No momento tenho apenas uma ideia inicial.',
  },
  {
    id: 'andamento',
    icon: 'trending',
    label: 'Já tenho um projeto em andamento',
    sentence: 'Já tenho um projeto em andamento.',
  },
  {
    id: 'melhorar',
    icon: 'refresh',
    label: 'Preciso melhorar um sistema existente',
    sentence: 'Preciso melhorar um sistema que já existe.',
  },
  {
    id: 'automatizar',
    icon: 'bolt',
    label: 'Preciso automatizar um processo',
    sentence: 'Preciso automatizar um processo da operação.',
    /* Com "Automação" a frase da necessidade já diz isso — evita repetição. */
    skipFor: ['automacao'],
  },
  {
    id: 'zero',
    icon: 'cpu',
    label: 'Quero criar algo do zero',
    sentence: 'Atualmente estou na fase de criação do projeto.',
  },
];

/** Rótulos do indicador de progresso. */
export const FUNNEL_STEPS = [
  { number: '01', label: 'Necessidade' },
  { number: '02', label: 'Estágio' },
  { number: '03', label: 'Conversa' },
];

export const findNeed = (id) => NEEDS.find((item) => item.id === id) ?? null;
export const findStage = (id) => STAGES.find((item) => item.id === id) ?? null;

/**
 * Monta a mensagem do WhatsApp a partir das escolhas do funil.
 * Cada informação vira uma linha, para a conversa já começar com contexto.
 */
export function buildFunnelMessage({ need, stage } = {}) {
  const needItem = findNeed(need);
  const stageItem = findStage(stage);

  const lines = [`Olá! Vim pelo site da ${COMPANY_NAME}.`];

  if (needItem) lines.push(needItem.sentence);

  /* A frase do estágio é omitida quando repetiria a da necessidade. */
  const stageIsRedundant = stageItem?.skipFor?.includes(need);
  if (stageItem && !stageIsRedundant) lines.push(stageItem.sentence);

  lines.push(
    'Gostaria de conversar sobre como podemos desenvolver essa solução.'
  );

  return lines.join('\n');
}

/* ---------------------------------------------------------------- sessão */

const STORAGE_KEY = FUNNEL_STORAGE_KEY;

/** Lê as escolhas salvas na sessão (sobrevive a um F5, não ao fechar a aba). */
export function loadFunnelState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    /* O conteúdo do sessionStorage é editável pelo usuário: nada dele é aceito
       direto. `need`/`stage` só passam se existirem na lista, e `step` é preso
       dentro do intervalo válido — evita etapa negativa ou fora do fim. */
    const lastStep = FUNNEL_STEPS.length - 1;
    const step = Number.isInteger(parsed.step)
      ? Math.min(Math.max(parsed.step, 0), lastStep)
      : 0;

    return {
      need: findNeed(parsed.need)?.id ?? null,
      stage: findStage(parsed.stage)?.id ?? null,
      step,
    };
  } catch {
    // sessionStorage bloqueado (modo privado/permissões) — segue sem persistir
    return null;
  }
}

export function saveFunnelState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* silencioso: persistir é um bônus, não um requisito */
  }
}

export function clearFunnelState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* idem */
  }
}
