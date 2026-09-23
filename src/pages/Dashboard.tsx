import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Scale, HeartHandshake, AlertTriangle, DollarSign, Plus, ArrowRight, Activity, Pencil } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { usePesagensRecentes } from '@/hooks/usePesagens';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { MeshDriftShader } from '@/components/MeshDriftShader';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useUIStore } from '@/store/useUIStore';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const {
    farmName,
    updateFarmName,
    isLoading: isLoadingFarmName,
    isError: isFarmNameError,
    isUpdating: isUpdatingFarm,
  } = useAppSettings();
  const { setActivePage, openSlidePanel, showToast } = useUIStore();
  const [isEditingFarmName, setIsEditingFarmName] = React.useState(false);
  const [farmNameDraft, setFarmNameDraft] = React.useState(farmName);
  const cancelFarmNameEdit = React.useRef(false);
  const { summary, isLoading: isLoadingDashboard } = useDashboard();
  const { pesagens, isLoading: isLoadingPesagens } = usePesagensRecentes();

  React.useEffect(() => {
    if (!isEditingFarmName) setFarmNameDraft(farmName);
  }, [farmName, isEditingFarmName]);

  const saveFarmName = async (value: string) => {
    if (isLoadingFarmName || isFarmNameError) return;

    const nextFarmName = value.trim();
    if (!nextFarmName) {
      setFarmNameDraft(farmName);
      setIsEditingFarmName(false);
      showToast('Informe um nome para a fazenda.', 'error');
      return;
    }
    if (!updateFarmName) return;

    try {
      await updateFarmName(nextFarmName);
      setIsEditingFarmName(false);
      showToast('Nome da fazenda atualizado com sucesso.', 'success');
    } catch {
      showToast('Não foi possível atualizar o nome da fazenda.', 'error');
    }
  };

  const handleFarmNameBlur = () => {
    if (cancelFarmNameEdit.current) {
      cancelFarmNameEdit.current = false;
      return;
    }
    void saveFarmName(farmNameDraft);
  };

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

  const totalAnimais = summary?.total_animais ?? 0;
  const ativos = summary?.animais_ativos ?? 0;
  const vacasCount = summary?.vacas_count ?? 0;
  const bezerrosCount = summary?.bezerros_count ?? 0;
  const tourosCount = summary?.touros_count ?? 0;
  const categorias = summary?.categorias ?? { PO: 0, PA: 0, PC: 0, CO: 0 };
  const estoqueCritico = summary?.estoque_critico ?? [];
  const estoqueCriticoTotal = summary?.estoque_critico_total ?? 0;
  const gmdMedio = summary?.gmd_medio ?? null;
  const pesagensComGMD = summary?.pesagens_com_gmd ?? 0;
  const dgTotal = summary?.dg_total ?? 0;
  const dgCheias = summary?.dg_cheias ?? 0;
  const taxaPrenhez = dgTotal > 0 ? `${Math.round((dgCheias / dgTotal) * 100)}%` : '—';
  const receitas = summary?.receitas ?? 0;
  const despesas = summary?.despesas ?? 0;
  const pendentes = summary?.pendentes ?? 0;
  const saldo = summary?.saldo ?? 0;
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-emerald-950 p-6 text-white shadow-xl sm:p-8">
        <MeshDriftShader />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-emerald-950/35" />
        <div className="relative z-10 max-w-2xl">
          <Badge variant="success" className="mb-3 border-emerald-300/30 bg-emerald-500/30 text-emerald-100">
            Painel Geral da Fazenda
          </Badge>
          {isLoadingFarmName ? (
            <div
              className="h-9 w-72 animate-pulse rounded-md bg-emerald-800/70 sm:h-10 sm:w-96"
              aria-label="Carregando nome da fazenda"
            />
          ) : role === 'superadmin' && isEditingFarmName ? (
            <input
              type="text"
              value={farmNameDraft}
              onChange={(event) => setFarmNameDraft(event.target.value)}
              onBlur={handleFarmNameBlur}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelFarmNameEdit.current = true;
                  setFarmNameDraft(farmName);
                  setIsEditingFarmName(false);
                }
              }}
              autoFocus
              disabled={isUpdatingFarm}
              aria-label="Nome da fazenda"
              className="w-full max-w-xl rounded-lg border border-emerald-300/60 bg-emerald-950/50 px-3 py-1 text-2xl font-extrabold tracking-tight text-white outline-none ring-2 ring-emerald-400/40 sm:text-3xl"
            />
          ) : (
            <div className="group flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{farmName}</h1>
              {role === 'superadmin' && !isFarmNameError && (
                <button
                  type="button"
                  onClick={() => {
                    if (isLoadingFarmName || isFarmNameError) return;
                    cancelFarmNameEdit.current = false;
                    setFarmNameDraft(farmName);
                    setIsEditingFarmName(true);
                  }}
                  className="rounded-lg p-2 text-emerald-200 opacity-100 transition-opacity hover:bg-emerald-900/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Editar nome da fazenda"
                  title="Editar nome da fazenda"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          <p className="mt-2 text-sm leading-relaxed text-emerald-50/85">
            Acompanhe o rebanho, pesagens, manejos sanitários, estoque e fluxo financeiro em tempo real com sincronização em nuvem.
          </p>
          <div className="mt-6 flex shrink-0 flex-wrap items-center gap-3 sm:flex-nowrap">
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
          subtitle={`${vacasCount} Vacas / ${bezerrosCount} Bezerros / ${tourosCount} Touros`}
          onClick={() => {
            setActivePage('Animais');
            navigate('/animais');
          }}
        />
        <StatCard
          title="Ganho Médio Diário (GMD)"
          value={gmdMedio === null ? '—' : `${gmdMedio.toFixed(2)} kg/dia`}
          icon={Activity}
          trend={pesagensComGMD > 0 ? 'up' : undefined}
          trendValue={pesagensComGMD > 0 ? `${pesagensComGMD} pesagens com GMD` : undefined}
          subtitle={pesagensComGMD > 0 ? 'Pesagens com GMD' : 'Sem dados de GMD'}
          onClick={() => {
            setActivePage('Pesagens');
            navigate('/pesagens');
          }}
        />
        <StatCard
          title="Taxa de Prenhez"
          value={taxaPrenhez}
          icon={HeartHandshake}
          trend={dgTotal > 0 ? 'up' : undefined}
          trendValue={dgTotal > 0 ? `${dgTotal} DG avaliados` : undefined}
          subtitle={dgTotal > 0 ? 'Cheias / vazias' : 'Sem dados de DG'}
          onClick={() => {
            setActivePage('Manejo Reprodutivo');
            navigate('/reproducao');
          }}
        />
        {role === 'superadmin' && (
          <StatCard
            title="Saldo Financeiro"
            value={`R$ ${formatCurrency(saldo)}`}
            icon={DollarSign}
            trend={saldo >= 0 ? 'up' : 'down'}
            trendValue={`Receitas pagas: R$ ${formatCurrency(receitas)}`}
            subtitle={`Despesas pagas: R$ ${formatCurrency(despesas)} · Pendentes: R$ ${formatCurrency(pendentes)}`}
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
              { label: 'PO – Puro de Origem', count: categorias.PO, color: 'bg-emerald-600' },
              { label: 'PA – Puro por Avaliação', count: categorias.PA, color: 'bg-emerald-500' },
              { label: 'PC – Puro por Cruzamento', count: categorias.PC, color: 'bg-teal-500' },
              { label: 'CO – Comum', count: categorias.CO, color: 'bg-cyan-600' },
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
            {isLoadingDashboard ? (
              <div className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ) : estoqueCritico.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum insumo abaixo do estoque mínimo.</p>
            ) : (
              <>
                {estoqueCritico.map((item) => (
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
                ))}
                {estoqueCriticoTotal > 20 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Exibindo 20 de {estoqueCriticoTotal} itens críticos. A lista está parcial.
                  </p>
                )}
              </>
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
                {pesagens.map((p) => (
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
