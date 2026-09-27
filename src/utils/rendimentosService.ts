import { getSupabaseClient, saveWholeCollectionToSupabase, withTimeout } from './supabaseClient';

export interface RendimentoItem {
  id: string;
  produto: string;
  categoria: string;
  rendimento: string;
  unidade: string;
  observacao?: string;
  createdAt: string;
  updatedAt: string;
}

export const RENDIMENTOS_STORAGE_KEY = 'fenix_calculadora_rendimentos';

export const CATEGORIAS_PADRAO_RENDIMENTO = [
  'Piso Vinílico',
  'Rodapé',
  'Teto Vinílico',
  'Ripado',
  'Manta Vinílica',
  'Adesivo / Cola',
  'Primer',
  'Massa Autonivelante',
  'Acessórios / Outros',
];

export const UNIDADES_PADRAO_RENDIMENTO = [
  'm²/caixa',
  'm²/balde',
  'm²/rolo',
  'm²/unidade',
  'm/barra',
  'm/rolo',
  'kg/m²',
  'unidade',
];

const INITIAL_BENCHMARKS: Omit<RendimentoItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    produto: 'Piso Vinílico SPC Stone Polymer 4mm/5mm',
    categoria: 'Piso Vinílico',
    rendimento: '3,34',
    unidade: 'm²/caixa',
    observacao: 'Rendimento médio padrão por caixa fechada',
  },
  {
    produto: 'Piso Vinílico Colado LVT 2mm/3mm',
    categoria: 'Piso Vinílico',
    rendimento: '3,34',
    unidade: 'm²/caixa',
    observacao: 'Área coberta por caixa de piso colado',
  },
  {
    produto: 'Massa Autonivelante de Regularização',
    categoria: 'Massa Autonivelante',
    rendimento: '1,70',
    unidade: 'kg/m²',
    observacao: 'Consumo por mm de espessura de camada',
  },
  {
    produto: 'Primer Promotor de Aderência',
    categoria: 'Primer',
    rendimento: '35,00',
    unidade: 'm²/balde',
    observacao: 'Rendimento para balde de 3,6kg (demão simples)',
  },
  {
    produto: 'Cola Acrílica para Vinílico',
    categoria: 'Adesivo / Cola',
    rendimento: '15,00',
    unidade: 'm²/balde',
    observacao: 'Balde de 4kg com desempenadeira A4',
  },
  {
    produto: 'Rodapé Poliestireno Santa Luzia / Arquitech',
    categoria: 'Rodapé',
    rendimento: '2,40',
    unidade: 'm/barra',
    observacao: 'Comprimento linear padrão de barra',
  },
  {
    produto: 'Cola para Rodapé Poliestireno 400g',
    categoria: 'Adesivo / Cola',
    rendimento: '10,00',
    unidade: 'm/barra',
    observacao: 'Fixa aproximadamente 10 a 12 metros lineares de rodapé',
  },
  {
    produto: 'Teto Vinílico Fênix 200mm',
    categoria: 'Teto Vinílico',
    rendimento: '1,20',
    unidade: 'm²/barra',
    observacao: 'Régua de 6 metros de comprimento por 20cm de largura',
  },
  {
    produto: 'Painel Ripado de Poliestireno',
    categoria: 'Ripado',
    rendimento: '0,34',
    unidade: 'm²/barra',
    observacao: 'Barra de 2,80m de altura com largura útil de 12cm',
  },
  {
    produto: 'Manta Vinílica Hospitalar / Comercial',
    categoria: 'Manta Vinílica',
    rendimento: '40,00',
    unidade: 'm²/rolo',
    observacao: 'Rolo padrão de 2m de largura por 20m de comprimento',
  },
];

export function getStoredRendimentos(): RendimentoItem[] {
  try {
    const raw = localStorage.getItem(RENDIMENTOS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Inicializa com benchmarks de referência técnica
    const seeded: RendimentoItem[] = INITIAL_BENCHMARKS.map((b, idx) => ({
      ...b,
      id: `rend_${Date.now()}_${idx}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    localStorage.setItem(RENDIMENTOS_STORAGE_KEY, JSON.stringify(seeded));
    saveWholeCollectionToSupabase(RENDIMENTOS_STORAGE_KEY, seeded).catch(() => {});
    return seeded;
  } catch (err) {
    console.error('Erro ao ler rendimentos:', err);
    return [];
  }
}

export async function loadRendimentosFromSupabase(): Promise<RendimentoItem[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await withTimeout(
        client
          .from('fenix_kv_store')
          .select('data')
          .eq('key', RENDIMENTOS_STORAGE_KEY)
          .maybeSingle(),
        3000,
        { data: null, error: null }
      );
      if (!error && data && data.data) {
        let parsed = data.data;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch {}
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.setItem(RENDIMENTOS_STORAGE_KEY, JSON.stringify(parsed));
          window.dispatchEvent(new CustomEvent('fenix_rendimentos_updated'));
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Falha não bloqueante ao buscar rendimentos do Supabase:', err);
    }
  }
  return getStoredRendimentos();
}

export async function saveRendimento(
  itemData: {
    produto: string;
    categoria: string;
    rendimento: string;
    unidade: string;
    observacao?: string;
  },
  existingId?: string
): Promise<RendimentoItem> {
  const current = getStoredRendimentos();
  const now = new Date().toISOString();

  let updatedList: RendimentoItem[];
  let savedItem: RendimentoItem;

  if (existingId) {
    savedItem = {
      id: existingId,
      produto: itemData.produto.trim(),
      categoria: itemData.categoria.trim() || 'Outros',
      rendimento: itemData.rendimento.trim(),
      unidade: itemData.unidade.trim(),
      observacao: itemData.observacao?.trim() || '',
      createdAt: current.find((c) => c.id === existingId)?.createdAt || now,
      updatedAt: now,
    };
    updatedList = current.map((c) => (c.id === existingId ? savedItem : c));
  } else {
    savedItem = {
      id: `rend_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      produto: itemData.produto.trim(),
      categoria: itemData.categoria.trim() || 'Outros',
      rendimento: itemData.rendimento.trim(),
      unidade: itemData.unidade.trim(),
      observacao: itemData.observacao?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    updatedList = [savedItem, ...current];
  }

  localStorage.setItem(RENDIMENTOS_STORAGE_KEY, JSON.stringify(updatedList));
  window.dispatchEvent(new CustomEvent('fenix_rendimentos_updated'));

  // Sincroniza oficialmente com o Supabase
  try {
    await saveWholeCollectionToSupabase(RENDIMENTOS_STORAGE_KEY, updatedList);
  } catch (err) {
    console.warn('Erro ao salvar rendimento no Supabase:', err);
  }

  return savedItem;
}

export async function deleteRendimento(id: string): Promise<boolean> {
  const current = getStoredRendimentos();
  const filtered = current.filter((c) => c.id !== id);
  localStorage.setItem(RENDIMENTOS_STORAGE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new CustomEvent('fenix_rendimentos_updated'));

  // Sincroniza oficialmente com o Supabase
  try {
    await saveWholeCollectionToSupabase(RENDIMENTOS_STORAGE_KEY, filtered);
  } catch (err) {
    console.warn('Erro ao deletar rendimento no Supabase:', err);
  }

  return true;
}
