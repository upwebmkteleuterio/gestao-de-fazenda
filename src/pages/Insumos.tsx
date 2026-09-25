import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Package, 
  AlertTriangle, 
  Search, 
  ArrowDownRight, 
  ArrowUpRight, 
  Trash2, 
  Filter, 
  Layers, 
  CheckCircle2, 
  TrendingDown, 
  Calendar, 
  FileText,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Table, Column } from '../components/Table';
import { Badge } from '../components/Badge';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { SlidePanel } from '../components/SlidePanel';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useInsumos } from '../hooks/useInsumos';
import { Pagination } from '../components/Pagination';
import { useUIStore } from '../store/useUIStore';
import { InsumosSlidePanel } from './Insumos/components/InsumosSlidePanel';
import { InsumosModals } from './Insumos/components/InsumosModals';
import { Insumo, MovimentacaoInsumo } from '../types/database';

export const InsumosPage: React.FC = () => {
  const { showToast } = useUIStore();

  // 1. ITENS DE BUSCA E FILTROS (TELA 6)
  const [search, setSearch] = useState('');
  const [apenasEstoqueBaixo, setApenasEstoqueBaixo] = useState(false);
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Reseta para página 1 ao alterar filtros
  useEffect(() => {
    setPage(1);
  }, [search, apenasEstoqueBaixo, categoriaFilter]);

  const { 
    insumos,
    totalInsumos,
    totalEstoqueBaixoCount,
    movimentacoes,
    isLoadingInsumos,
    isErrorInsumos,
    refetchInsumos,
    source,
    capturedAt,
    isOffline,
    isMovimentacaoDisabledOffline,
    createInsumo,
    updateInsumo,
    deleteInsumo,
    registrarMovimentacao
  } = useInsumos(categoriaFilter, { search, estoqueBaixo: apenasEstoqueBaixo, page, limit });

  const insumosFiltrados = insumos;

  // Estados dos Painéis / Modais
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideMode, setSlideMode] = useState<'cadastro' | 'baixa'>('cadastro');
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);

  // Modal de Exclusão
  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Insumo | null>(null);

  // FORMULARIO TELA 6.1 - CADASTRO DE INSUMO
  const [formCadastro, setFormCadastro] = useState<{
    nome_produto: string;
    categoria: 'medicamento' | 'suplemento' | 'racao' | 'defensivo' | 'outros';
    unidade_medida: string;
    quantidade_inicial: number;
    estoque_minimo: number;
    custo_unitario: number;
  }>({
    nome_produto: '',
    categoria: 'medicamento',
    unidade_medida: 'Frasco',
    quantidade_inicial: 0,
    estoque_minimo: 0,
    custo_unitario: 0.00,
  });

  // FORMULARIO TELA 6.2 - BAIXA DE ESTOQUE
  const [formBaixa, setFormBaixa] = useState<{
    insumo_id: string;
    quantidade_utilizada: number;
    data: string;
    observacao_motivo: string;
  }>({
    insumo_id: '',
    quantidade_utilizada: 1,
    data: new Date().toISOString().split('T')[0],
    observacao_motivo: 'Uso de rotina no manejo do rebanho',
  });

  // Abertura Tela 6.1 - Cadastro
  const handleOpenCadastro = (insumoToEdit?: Insumo) => {
    if (insumoToEdit) {
      setSelectedInsumo(insumoToEdit);
      setFormCadastro({
        nome_produto: insumoToEdit.nome_produto,
        categoria: insumoToEdit.categoria,
        unidade_medida: insumoToEdit.unidade_medida,
        quantidade_inicial: insumoToEdit.estoque_atual,
        estoque_minimo: insumoToEdit.estoque_minimo,
        custo_unitario: insumoToEdit.custo_unitario || 0,
      });
    } else {
      setSelectedInsumo(null);
      setFormCadastro({
        nome_produto: '',
        categoria: 'medicamento',
        unidade_medida: 'Frasco',
        quantidade_inicial: 0,
        estoque_minimo: 0,
        custo_unitario: 0.00,
      });
    }
    setSlideMode('cadastro');
    setSlideOpen(true);
  };

  // Abertura Tela 6.2 - Baixa de Estoque
  const handleOpenBaixa = (insumo?: Insumo) => {
    const selId = insumo?.id || insumos[0]?.id || '';
    setFormBaixa({
      insumo_id: selId,
      quantidade_utilizada: 1,
      data: new Date().toISOString().split('T')[0],
      observacao_motivo: '',
    });
    setSlideMode('baixa');
    setSlideOpen(true);
  };

  // Salvar Tela 6.1 (Cadastro / Edição)
  const handleSaveCadastro = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formCadastro.nome_produto) {
      showToast('Informe o nome do produto.', 'error');
      return;
    }

    try {
      if (selectedInsumo) {
        await updateInsumo({
          id: selectedInsumo.id,
          updates: {
            nome_produto: formCadastro.nome_produto,
            categoria: formCadastro.categoria,
            unidade_medida: formCadastro.unidade_medida as any,
            estoque_atual: formCadastro.quantidade_inicial,
            estoque_minimo: formCadastro.estoque_minimo,
            custo_unitario: formCadastro.custo_unitario,
          },
        });
        showToast('Insumo atualizado com sucesso!');
      } else {
        await createInsumo({
          nome_produto: formCadastro.nome_produto,
          categoria: formCadastro.categoria,
          unidade_medida: formCadastro.unidade_medida as any,
          estoque_atual: formCadastro.quantidade_inicial,
          estoque_minimo: formCadastro.estoque_minimo,
          custo_unitario: formCadastro.custo_unitario,
        });
        showToast('Insumo cadastrado com sucesso no estoque!');
      }
      setSlideOpen(false);
    } catch (err) {
      showToast('Erro ao cadastrar insumo.', 'error');
    }
  };

  // Salvar Tela 6.2 (Baixa de Estoque)
  const handleSaveBaixa = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isMovimentacaoDisabledOffline) {
      showToast('Offline: registrar movimentação está indisponível para preservar o saldo e o histórico.', 'error');
      return;
    }
    if (!formBaixa.insumo_id || formBaixa.quantidade_utilizada <= 0) {
      showToast('Selecione o produto e informe uma quantidade válida.', 'error');
      return;
    }

    const insumoTarget = insumos.find(i => i.id === formBaixa.insumo_id);
    if (!insumoTarget) {
      showToast('Insumo não encontrado.', 'error');
      return;
    }

    try {
      await registrarMovimentacao({
        insumo_id: formBaixa.insumo_id,
        nome_insumo: insumoTarget.nome_produto,
        tipo: 'saida',
        quantidade: formBaixa.quantidade_utilizada,
        data_movimento: formBaixa.data,
        observacao: formBaixa.observacao_motivo,
      });

      showToast(`Baixa realizada! ${formBaixa.quantidade_utilizada} ${insumoTarget.unidade_medida}(s) de ${insumoTarget.nome_produto} foram descontados do saldo.`);
      setSlideOpen(false);
    } catch (err) {
      showToast('Erro ao realizar baixa de estoque.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteInsumo(itemToDelete.id);
      showToast('Insumo excluído do estoque.');
      setModalOpen(false);
      setSlideOpen(false);
    } catch (err) {
      showToast('Erro ao excluir insumo.', 'error');
    }
  };

  // COLUNAS PRINCIPAIS (TELA 6 - PRIORIDADE VISUAL):
  // Nome do Produto, Unidade (ml, kg, sacas), Saldo Atual, Estoque Mínimo (Alerta)
  // Lógica Visual: Linhas onde Saldo Atual <= Estoque Mínimo ficam com background ou texto vermelho (Alerta automático)
  const columns: Column<Insumo>[] = [
    {
      header: 'Nome do Produto',
      accessor: 'nome_produto',
      render: (row) => {
        const isCritico = row.estoque_atual <= row.estoque_minimo;
        return (
          <div className="flex items-center space-x-2">
            {isCritico && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" />}
            <span className={`font-bold ${isCritico ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {row.nome_produto}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Categoria',
      render: (row) => <Badge variant="neutral">{row.categoria.toUpperCase()}</Badge>,
    },
    {
      header: 'Unidade',
      accessor: 'unidade_medida',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
          {row.unidade_medida}
        </span>
      ),
    },
    {
      header: 'Saldo Atual',
      render: (row) => {
        const isCritico = row.estoque_atual <= row.estoque_minimo;
        return (
          <div className="flex items-center space-x-2">
            <span className={`text-base font-black ${
              isCritico ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {row.estoque_atual} {row.unidade_medida}s
            </span>
            {isCritico && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300/60">
                CRÍTICO
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Estoque Mínimo (Alerta)',
      render: (row) => (
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
          {row.estoque_minimo} {row.unidade_medida}s
        </span>
      ),
    },
    {
      header: 'Ações',
      render: (row) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenBaixa(row);
            }}
            className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400"
          >
            Dar Baixa
          </Button>
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCadastro(row);
            }}
            className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            Editar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              Módulo de Insumos
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1">
            Estoque e Insumos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Controle de produtos, rações, sementes e medicamentos com baixa automática.
          </p>
        </div>

        {/* BOTÕES DE AÇÃO PRINCIPAL */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="secondary"
            icon={TrendingDown}
            onClick={() => handleOpenBaixa()}
            disabled={isMovimentacaoDisabledOffline}
            title={isMovimentacaoDisabledOffline ? 'Offline: movimentações indisponíveis' : undefined}
            className="border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100"
          >
            Registrar Uso (Dar Baixa)
          </Button>

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => handleOpenCadastro()}
          >
            Cadastrar Insumo
          </Button>
        </div>
      </div>

      {/* PAINEL DE METRICAS E ALERTAS */}
      {totalEstoqueBaixoCount > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/80 text-red-700 dark:text-red-300">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                Atenção: {totalEstoqueBaixoCount} produto(s) atingiram ou estão abaixo do Estoque Mínimo!
              </h4>
              <p className="text-xs text-red-700 dark:text-red-400">
                Ative o filtro para visualizar rapidamente os itens com necessidade de reposição imediata.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => setApenasEstoqueBaixo(!apenasEstoqueBaixo)}
            className="text-xs font-bold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
          >
            {apenasEstoqueBaixo ? 'Mostrar Todos' : 'Filtrar Críticos'}
          </Button>
        </div>
      )}

      {/* TELA 6 - ITENS DE BUSCA E FILTROS */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Barra de Busca: Nome do Produto */}
          <div className="md:col-span-1">
            <Input noMargin id="search_produto"
              placeholder="Buscar Nome do Produto..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={Search}
            />
          </div>

          {/* Categoria */}
          <div>
            <Select noMargin
              id="filter_categoria_insumo"
              value={categoriaFilter}
              onChange={(e) => { setCategoriaFilter(e.target.value); setPage(1); }}
              options={[
                { label: 'Todas as Categorias', value: 'all' },
                { label: 'Medicamento', value: 'medicamento' },
                { label: 'Suplemento / Sal', value: 'suplemento' },
                { label: 'Ração', value: 'racao' },
                { label: 'Defensivo / Herbicida', value: 'defensivo' },
              ]}
            />
          </div>

          {/* Filtro Alerta: Switch "Mostrar apenas Estoque Baixo" */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span>Mostrar apenas Estoque Baixo</span>
            </span>

            <button
              type="button"
              onClick={() => setApenasEstoqueBaixo(!apenasEstoqueBaixo)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                apenasEstoqueBaixo ? 'bg-red-600 justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>
      </Card>

      {(isOffline || source === 'local' || capturedAt) && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <strong>{isOffline || source === 'local' ? 'Dados locais:' : 'Cache offline disponível:'}</strong>{' '}
          {isOffline || source === 'local'
            ? 'Exibindo o cadastro completo de insumos disponível localmente. O histórico usa somente os 10 registros mais recentes.'
            : 'O cadastro completo de insumos e a primeira janela do histórico foram preparados para uso offline.'}
          {capturedAt && <span className="ml-1 text-xs opacity-80">Atualizado em {new Date(capturedAt).toLocaleString('pt-BR')}</span>}
        </div>
      )}

      {/* TELA 6 - LISTAGEM (PRIORIDADE VISUAL) */}
      <Card title="Produtos e Insumos Cadastrados">
        {isLoadingInsumos ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : isErrorInsumos ? (
          <div className="p-6">
            <ErrorState
              title="Erro ao carregar insumos"
              message="Não foi possível obter os dados de estoque e insumos ou a conexão expirou. Tente novamente."
              onRetry={refetchInsumos}
            />
          </div>
        ) : insumosFiltrados.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Package}
              title="Nenhum insumo encontrado"
              description="Nenhum medicamento, sal, ração ou defensivo cadastrado ou correspondente aos filtros atuais."
              actionLabel="Cadastrar Insumo"
              onAction={() => handleOpenCadastro()}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Nome do Produto</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Unidade</th>
                  <th className="px-4 py-3">Saldo Atual</th>
                  <th className="px-4 py-3">Estoque Mínimo (Alerta)</th>
                  <th className="px-4 py-3 rounded-r-lg text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {insumosFiltrados.map((item) => {
                  const isCritico = item.estoque_atual <= item.estoque_minimo;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenCadastro(item)}
                      className={`cursor-pointer transition-colors ${
                        isCritico
                          ? 'bg-red-50/70 dark:bg-red-950/40 hover:bg-red-100/80 dark:hover:bg-red-950/60 border-l-4 border-l-red-600'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2">
                          {isCritico && <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse flex-shrink-0" />}
                          <span className={`font-bold ${isCritico ? 'text-red-900 dark:text-red-200' : 'text-gray-900 dark:text-white'}`}>
                            {item.nome_produto}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant="neutral">{item.categoria.toUpperCase()}</Badge>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200/70 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          {item.unidade_medida}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-extrabold ${isCritico ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            {item.estoque_atual} {item.unidade_medida}s
                          </span>
                          {isCritico && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100">
                              ALERTA
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {item.estoque_minimo} {item.unidade_medida}s
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBaixa(item);
                            }}
                            disabled={isMovimentacaoDisabledOffline}
                            title={isMovimentacaoDisabledOffline ? 'Offline: movimentações indisponíveis' : undefined}
                            className="text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400 font-bold"
                          >
                            Dar Baixa
                          </Button>

                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCadastro(item);
                            }}
                            className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          >
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil((totalInsumos || 0) / limit) || 1}
          onPageChange={setPage}
          totalItems={totalInsumos}
          itemsPerPage={limit}
        />
      </Card>

      {/* HISTÓRICO DE MOVIMENTAÇÕES E BAIXAS DE ESTOQUE */}
      {(isOffline || source === 'local') && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          Dados locais: o cadastro de insumos está disponível completo no cache. O histórico mostra apenas os 10 registros mais recentes; busca, filtros e paginação do histórico dependem da conexão.
        </div>
      )}
      <Card title="Histórico Recente de Entradas e Baixas de Estoque">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Insumo / Produto</th>
                <th className="px-4 py-3">Tipo Movimentação</th>
                <th className="px-4 py-3">Quantidade Utilizada</th>
                <th className="px-4 py-3">Motivo / Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {movimentacoes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              ) : (
                movimentacoes.slice(0, 10).map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{m.data_movimento}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{m.nome_insumo}</td>
                    <td className="px-4 py-3">
                      <Badge variant={m.tipo === 'entrada' ? 'success' : 'danger'}>
                        {m.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA / BAIXA'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                      {m.quantidade} unidades
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {m.observacao || 'Manejo Sanitário / Uso em Campo'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SLIDE PANEL COMPARTILHADO (TELA 6.1 OU TELA 6.2) */}
      <InsumosSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedInsumo={selectedInsumo}
        formCadastro={formCadastro}
        setFormCadastro={setFormCadastro}
        handleSaveCadastro={handleSaveCadastro}
        formBaixa={formBaixa}
        setFormBaixa={setFormBaixa}
        handleSaveBaixa={handleSaveBaixa}
        setItemToDelete={setItemToDelete}
        setModalOpen={setModalOpen}
        insumos={insumos}
        isMovimentacaoDisabledOffline={isMovimentacaoDisabledOffline}
      />
      <InsumosModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        itemToDelete={itemToDelete}
        handleDelete={handleDelete}
      />
    </div>
  );
};
