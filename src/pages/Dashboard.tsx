import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Scale, HeartHandshake, AlertTriangle, DollarSign, Plus, ArrowRight, Activity, Sprout } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { useAnimais } from '../hooks/useAnimais';
import { usePesagens } from '../hooks/usePesagens';
import { useInsumos } from '../hooks/useInsumos';
import { useFinanceiro } from '../hooks/useFinanceiro';
import { useReproducao } from '../hooks/useReproducao';
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '../store/useUIStore';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { setActivePage, openSlidePanel } = useUIStore();
  const { animais, isLoading: isLoadingAnimais, isError: isErrorAnimais, refetch: refetchAnimais } = useAnimais();
  const { pesagens, isLoading: isLoadingPesagens } = usePesagens();
  const { insumos } = useInsumos();
  const { eventos } = useReproducao();
  const { resumo } = useFinanceiro();

  // Escuta atalhos de teclado no Dashboard: Alt + A (Novo Animal), Alt + P (Nova Pesagem)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltA = e.altKey && (e.key.toLowerCase() === 'a' || e.code === 'KeyA' || e.key === 'å' || e.key === 'Å');
      const isAltP = e.altKey && (e.key.toLowerCase() === 'p' || e.code === 'KeyP' || e.key === 'π' || e.key === 'Π');

      if (isAltA) {
        e.preventDefault();
        setActivePage('Animais');
        navigate('/animais');
        openSlidePanel({ mode: 'create', title: 'Cadastrar Animal', entityType: 'animal' });
      } else if (isAltP) {
        e.preventDefault();
        setActivePage('Pesagens');
        navigate('/pesagens');
        openSlidePanel({ mode: 'create', title: 'Nova Pesagem', entityType: 'pesagem' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActivePage, navigate, openSlidePanel]);

  const totalAnimais = animais.length;
  const ativos = animais.filter(a => a.status === 'ativo').length;
  const vacasCount = animais.filter(a => a.tipo_animal === 'vaca' || a.tipo_animal === 'matriz' || a.tipo_animal === 'novilha').length;
  const bezerrosCount = animais.filter(a => a.tipo_animal === 'bezerro' || a.tipo_animal === 'bezerra').length;
  const tourosCount = animais.filter(a => a.tipo_animal === 'touro' || a.tipo_animal === 'garrote').length;

  const estoqueCritico = insumos.filter(i => i.estoque_atual <= i.estoque_minimo);

  // Média de GMD recente
  const pesagensComGMD = pesagens.filter(p => p.gmd_calculado !== undefined);
  const gmdMedio = pesagensComGMD.length > 0
    ? (pesagensComGMD.reduce((acc, curr) => acc + (curr.gmd_calculado ?? 0), 0) / pesagensComGMD.length).toFixed(2)
    : null;

  const eventosComResultadoDg = eventos.filter(
    (evento) => evento.resultado_dg === 'cheia' || evento.resultado_dg === 'vazia',
  );
  const eventosCheios = eventosComResultadoDg.filter((evento) => evento.resultado_dg === 'cheia').length;
  const taxaPrenhez = eventosComResultadoDg.length > 0
    ? `${Math.round((eventosCheios / eventosComResultadoDg.length) * 100)}%`
    : '—';

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none bg-[radial-gradient(#fff_2px,transparent_2px)] [background-size:16px_16px]" />
        <div className="relative z-10 max-w-2xl">
          <Badge variant="success" className="mb-3 bg-emerald-500/30 text-emerald-200 border-emerald-400/30">
            Painel Geral da Fazenda
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Fazenda Boa Esperança</h1>
          <p className="text-emerald-100/80 text-sm mt-2 leading-relaxed">
            Acompanhe o rebanho, pesagens, manejos sanitários, estoque e fluxo financeiro em tempo real com sincronização em nuvem.
          </p>
          <div className="mt-6 flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setActivePage('Animais');
                navigate('/animais');
                openSlidePanel({ mode: 'create', title: 'Cadastrar Animal', entityType: 'animal' });
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold"
            >
              Cadastrar Animal
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-emerald-950/30 text-emerald-950 border border-emerald-900/20 rounded font-mono">Alt+A</span>
            </Button>
            <Button
              variant="secondary"
              icon={Scale}
              onClick={() => {
                setActivePage('Pesagens');
                navigate('/pesagens');
                openSlidePanel({ mode: 'create', title: 'Nova Pesagem', entityType: 'pesagem' });
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Nova Pesagem
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-white/20 text-white border border-white/30 rounded font-mono">Alt+P</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total do Rebanho"
          value={totalAnimais}
          icon={Users}
          trend="up"
          trendValue={`${ativos} Ativos`}
          subtitle={`${vacasCount} Vacas / ${bezerrosCount} Bezerros`}
          onClick={() => {
            setActivePage('Animais');
            navigate('/animais');
          }}
        />
        <StatCard
          title="Ganho Médio Diário (GMD)"
          value={gmdMedio === null ? '—' : `${gmdMedio} kg/dia`}
          icon={Activity}
          trend={pesagensComGMD.length > 0 ? 'up' : undefined}
          trendValue={pesagensComGMD.length > 0 ? `${pesagensComGMD.length} pesagens com GMD` : undefined}
          subtitle={pesagensComGMD.length > 0 ? 'Pesagens com GMD' : 'Sem dados de GMD'}
          onClick={() => {
            setActivePage('Pesagens');
            navigate('/pesagens');
          }}
        />
        <StatCard
          title="Taxa de Prenhez"
          value={taxaPrenhez}
          icon={HeartHandshake}
          trend={eventosComResultadoDg.length > 0 ? 'up' : undefined}
          trendValue={eventosComResultadoDg.length > 0 ? `${eventosComResultadoDg.length} DG avaliados` : undefined}
          subtitle={eventosComResultadoDg.length > 0 ? 'Cheias / vazias' : 'Sem dados de DG'}
          onClick={() => {
            setActivePage('Manejo Reprodutivo');
            navigate('/reproducao');
          }}
        />
        {role === 'superadmin' && (
          <StatCard
            title="Saldo Financeiro"
            value={`R$ ${resumo.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            trend={resumo.saldo >= 0 ? 'up' : 'down'}
            trendValue={`Receitas: R$ ${resumo.receitas.toLocaleString()}`}
            subtitle="Resumo acumulado"
            onClick={() => {
              setActivePage('Financeiro');
              navigate('/financeiro');
            }}
          />
        )}
      </div>

      {/* Main Charts & Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph / Distribution Card */}
        <Card title="Distribuição do Rebanho por Categoria" className="lg:col-span-2">
          <div className="space-y-5 py-2">
            {[
              { label: 'PO – Puro de Origem', count: animais.filter(a => a.categoria === 'PO').length, color: 'bg-emerald-600' },
              { label: 'PA – Puro por Avaliação', count: animais.filter(a => a.categoria === 'PA').length, color: 'bg-emerald-500' },
              { label: 'PC – Puro por Cruzamento', count: animais.filter(a => a.categoria === 'PC').length, color: 'bg-teal-500' },
              { label: 'CO – Comum', count: animais.filter(a => a.categoria === 'CO').length, color: 'bg-cyan-600' },
            ].map((item) => {
              const percentage = totalAnimais > 0 ? Math.round((item.count / totalAnimais) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm font-medium mb-1.5">
                    <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-bold">{item.count} animais ({percentage}%)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">Atualizado com os últimos registros do sistema</span>
            <Button
              variant="ghost"
              onClick={() => {
                setActivePage('Animais');
                navigate('/animais');
              }}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-semibold text-xs"
            >
              Ver Tabela Completa <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </Card>

        {/* Alerts & Stock Card */}
        <Card title="Alertas & Estoque Crítico" action={<AlertTriangle className="w-5 h-5 text-amber-500" />}>
          <div className="space-y-4">
            {estoqueCritico.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum insumo abaixo do estoque mínimo.</p>
            ) : (
              estoqueCritico.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.nome_produto}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Atual: <span className="font-bold">{item.estoque_atual} {item.unidade_medida}s</span> (Mínimo: {item.estoque_minimo})
                    </p>
                  </div>
                  <Badge variant="warning">Repor Estoque</Badge>
                </div>
              ))
            )}

            <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Diagnóstico DG Toque</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                  Consulte os registros de DG no manejo reprodutivo
                </p>
              </div>
              <Badge variant="info">Manejo reprodutivo</Badge>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={() => {
                setActivePage('Insumos');
                navigate('/insumos');
              }}
              className="w-full justify-center text-xs"
            >
              Gerenciar Insumos e Estoque
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card title="Últimas Pesagens Registradas">
        {isLoadingPesagens ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        ) : pesagens.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium">Nenhuma pesagem registrada recentemente.</p>
            <Button
              variant="secondary"
              onClick={() => {
                setActivePage('Pesagens');
                navigate('/pesagens');
              }}
              className="mt-3 text-xs"
            >
              Registrar Primeira Pesagem
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3">Brinco Animal</th>
                  <th className="px-4 py-3">1ª Pesagem (Anterior)</th>
                  <th className="px-4 py-3">2ª Pesagem (Atual)</th>
                  <th className="px-4 py-3">GMD (kg/dia)</th>
                  <th className="px-4 py-3">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {pesagens.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 block">{p.brinco_animal}</span>
                      <span className="text-xs text-gray-400 capitalize">{p.tipo_animal || 'Vaca'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.data_pesagem_anterior && p.peso_anterior !== undefined ? (
                        <div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300 block">{p.data_pesagem_anterior}</span>
                          <span className="text-gray-500">{p.peso_anterior} kg</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Pesagem inicial</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 block">{p.data_pesagem}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.peso_kg} kg</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.gmd_calculado !== undefined ? (
                        <div>
                          <Badge variant={p.gmd_calculado > 0.8 ? 'success' : p.gmd_calculado >= 0 ? 'warning' : 'danger'}>
                            +{p.gmd_calculado} kg/d
                          </Badge>
                          {p.dias_intervalo && (
                            <span className="text-xs text-gray-400 block mt-0.5">
                              +{p.ganho_peso_kg ?? (p.peso_anterior ? (p.peso_kg - p.peso_anterior).toFixed(1) : '')} kg ({p.dias_intervalo}d)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">1ª Pesagem</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{p.observacoes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
