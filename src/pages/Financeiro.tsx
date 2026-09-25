import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, Search } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Table, Column } from '../components/Table';
import { Badge } from '../components/Badge';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Modal } from '../components/Modal';
import { FinanceiroSlidePanel } from './Financeiro/components/FinanceiroSlidePanel';
import { FinanceiroModals } from './Financeiro/components/FinanceiroModals';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useFinanceiro } from '../hooks/useFinanceiro';
import { Pagination } from '../components/Pagination';
import { useUIStore } from '../store/useUIStore';
import { useConnectivityStore } from '../store/useConnectivityStore';
import { TransacaoFinanceira } from '../types/database';
import { DomainValidationError, isValidDate, validateFinanceiroFields, validateDateRange } from '../services/domainValidation';

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const getMonthOptions = (year: number) => monthNames.map((label, index) => ({
  value: `${year}-${String(index + 1).padStart(2, '0')}`,
  label: `${label} de ${year}`,
}));

const addOneDay = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().split('T')[0];
};

const firstDayOfNextMonth = (periodo: string) => {
  const [year, month] = periodo.split('-').map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
};

export const FinanceiroPage: React.FC = () => {
  const { showToast } = useUIStore();
  const connectivityStatus = useConnectivityStore((state) => state.status);
  const isOffline = connectivityStatus === 'offline';
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('all');
  const [categoria, setCategoria] = useState('all');
  const [status, setStatus] = useState('all');
  const [periodoSelecionado, setPeriodoSelecionado] = useState(getCurrentMonth);
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState('');
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState('');
  const [dataInicioRascunho, setDataInicioRascunho] = useState('');
  const [dataFimRascunho, setDataFimRascunho] = useState('');
  const [periodoPersonalizadoModalOpen, setPeriodoPersonalizadoModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;
  const periodoPersonalizado = periodoSelecionado === 'personalizado';
  const periodoAno = periodoSelecionado.startsWith('ano-');
  const year = periodoAno
    ? Number(periodoSelecionado.slice(4))
    : Number(periodoSelecionado.slice(0, 4)) || new Date().getFullYear();
  const inicioMes = periodoPersonalizado
    ? dataInicioPersonalizada || undefined
    : periodoAno ? `${year}-01-01` : `${periodoSelecionado}-01`;
  const fimMes = periodoPersonalizado
    ? dataFimPersonalizada ? addOneDay(dataFimPersonalizada) : undefined
    : periodoAno ? `${year + 1}-01-01` : firstDayOfNextMonth(periodoSelecionado);
  const periodoOptions = [
    { value: `ano-${year}`, label: `Todos os meses de ${year}` },
    ...getMonthOptions(year),
    { value: 'personalizado', label: 'Personalizar período' },
  ];

  const handlePeriodoChange = (nextPeriodo: string) => {
    if (nextPeriodo === 'personalizado') {
      setDataInicioRascunho(dataInicioPersonalizada);
      setDataFimRascunho(dataFimPersonalizada);
      setPeriodoPersonalizadoModalOpen(true);
      return;
    }

    setPeriodoSelecionado(nextPeriodo);
  };

  const handleConfirmarPeriodoPersonalizado = () => {
    if (isApplyingPeriod || isOffline) return;
    setIsApplyingPeriod(true);
    try {
      if (!dataInicioRascunho || !dataFimRascunho) throw new DomainValidationError('Informe a data inicial e a data final.');
      if (!isValidDate(dataInicioRascunho) || !isValidDate(dataFimRascunho)) throw new DomainValidationError('Informe datas válidas para o período.');
      validateDateRange(dataInicioRascunho, dataFimRascunho);
      setDataInicioPersonalizada(dataInicioRascunho);
      setDataFimPersonalizada(dataFimRascunho);
      setPeriodoSelecionado('personalizado');
      setPeriodoPersonalizadoModalOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Informe um período válido.', 'error');
    } finally {
      setIsApplyingPeriod(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, tipo, categoria, status, periodoSelecionado, dataInicioPersonalizada, dataFimPersonalizada]);

  useEffect(() => {
    if (!isOffline) return;
    setSearch('');
    setTipo('all');
    setCategoria('all');
    setStatus('all');
    setPeriodoSelecionado(getCurrentMonth());
    setDataInicioPersonalizada('');
    setDataFimPersonalizada('');
  }, [isOffline]);

  const { transacoes, totalTransacoes, resumo, source, resumoSource, capturedAt, isLoadingTransacoes, isErrorTransacoes, refetchTransacoes, createTransacao, updateTransacao, deleteTransacao } = useFinanceiro({
    search,
    tipo,
    categoria,
    status,
    startDate: inicioMes,
    endDate: fimMes,
    page,
    limit,
  });

  const [slideOpen, setSlideOpen] = useState(false);
  const [selectedTransacao, setSelectedTransacao] = useState<TransacaoFinanceira | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TransacaoFinanceira | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApplyingPeriod, setIsApplyingPeriod] = useState(false);

  // Selection state para seleção em lote de lançamentos financeiro
  const [selectedFinIds, setSelectedFinIds] = useState<string[]>([]);

  const handleToggleSelectFin = (id: string) => {
    setSelectedFinIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFins = () => {
    if (selectedFinIds.length === transacoes.length) {
      setSelectedFinIds([]);
    } else {
      setSelectedFinIds(transacoes.map(t => t.id));
    }
  };

  const [formData, setFormData] = useState<Partial<TransacaoFinanceira>>({
    descricao: 'Venda de Boi Gordo - Lote 12',
    tipo: 'receita',
    categoria: 'outros',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    status: 'pago',
  });

  const handleOpenCreate = () => {
    setSelectedTransacao(null);
    setFormData({
      descricao: '',
      tipo: 'receita',
      categoria: 'outros',
      valor: 0,
      data: new Date().toISOString().split('T')[0],
      status: 'pago',
    });
    setSlideOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      validateFinanceiroFields(formData);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Corrija os campos do lançamento.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (selectedTransacao) {
        await updateTransacao({ id: selectedTransacao.id, updates: formData });
        showToast('Lançamento financeiro atualizado!');
      } else {
        await createTransacao(formData as Omit<TransacaoFinanceira, 'id' | 'createdAt' | 'status_sincronizacao'>);
        showToast('Novo lançamento registrado no fluxo de caixa!');
      }
      setSlideOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar lançamento.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteTransacao(itemToDelete.id);
      showToast('Lançamento removido.');
      setModalOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao remover lançamento.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<TransacaoFinanceira>[] = [
    {
      header: 'Descrição do Lançamento',
      accessor: 'descricao',
      render: (row) => (
        <span className="font-bold text-gray-900 dark:text-white">{row.descricao}</span>
      ),
    },
    {
      header: 'Tipo',
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          {row.tipo === 'receita' ? (
            <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
          ) : (
            <ArrowDownCircle className="w-4 h-4 text-red-500" />
          )}
          <span className={`font-semibold capitalize ${row.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
            {row.tipo}
          </span>
        </div>
      ),
    },
    {
      header: 'Data / Vencimento',
      render: (row) => <span>{row.data}</span>,
    },
    {
      header: 'Valor (R$)',
      render: (row) => (
        <span className={`font-extrabold text-base ${row.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
          {row.tipo === 'receita' ? '+' : '-'} R$ {row.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Status Pagamento',
      render: (row) => (
        <Badge variant={row.status === 'pago' ? 'success' : 'warning'}>
          {row.status === 'pago' ? 'PAGO / RECEBIDO' : 'PENDENTE'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Gestão Financeira & DRE</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Controle de receitas com venda de gado/leite, despesas operacionais e demonstrativo acumulado.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
            Novo Lançamento Financeiro
          </Button>
        </div>
      </div>

      {isOffline && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" role="status">
          <strong>Modo offline:</strong>{' '}
          Exibindo dados locais do mês atual. Períodos históricos, busca, filtros e paginação ficam disponíveis somente online.
          {capturedAt && <span className="ml-1 text-xs opacity-80">Atualizado em {new Date(capturedAt).toLocaleString('pt-BR')}</span>}
        </div>
      )}

      {/* DRE Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Receita Total"
          value={`R$ ${resumo.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={ArrowUpCircle}
          trend="up"
          trendValue="Entradas"
        />
        <StatCard
          title="Despesa Total"
          value={`R$ ${resumo.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={ArrowDownCircle}
          trend="down"
          trendValue="Saídas"
        />
        <StatCard
          title="Resultado Líquido"
          value={`R$ ${resumo.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend={resumo.saldo >= 0 ? 'up' : 'down'}
          trendValue="Lucro Operacional"
        />
        <StatCard
          title="Contas Pendentes"
          value={`R$ ${resumo.pendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
          trend="down"
          trendValue="A Vencer"
        />
      </div>

      {/* Tabela de Lançamentos */}
      <Card noPadding>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 grid grid-cols-1 md:grid-cols-5 gap-3 items-start">
          <div>
            <Select
              id="filter-periodo-fin"
              noMargin
              label="Período dos lançamentos"
              value={periodoSelecionado}
              onChange={(e) => handlePeriodoChange(e.target.value)}
              options={periodoOptions}
              disabled={isOffline}
            />
          </div>
          <div className="md:pt-5">
            <Input
              id="filter-search-fin"
              noMargin
              placeholder="Buscar por descrição ou categoria..."
              value={search}
              maxLength={200}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
              disabled={isOffline}
            />
          </div>

          <div className="md:pt-5">
            <Select
              id="filter-tipo"
              noMargin
              value={tipo}
              onChange={(e) => { setTipo(e.target.value); setPage(1); }}
              disabled={isOffline}
              options={[
                { label: 'Todos os Tipos', value: 'all' },
                { label: 'Receitas', value: 'receita' },
                { label: 'Despesas', value: 'despesa' },
              ]}
            />
          </div>

          <div className="md:pt-5">
            <Select
              id="filter-categoria"
              noMargin
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value); setPage(1); }}
              disabled={isOffline}
              options={[
                { label: 'Todas as Categorias', value: 'all' },
                { label: 'Venda de Gado', value: 'venda_gado' },
                { label: 'Venda de Leite', value: 'venda_leite' },
                { label: 'Compra de Insumos', value: 'compra_insumo' },
                { label: 'Manutenção', value: 'manutencao' },
                { label: 'Veterinário', value: 'veterinario' },
                { label: 'Salários', value: 'salarios' },
                { label: 'Outros', value: 'outros' },
              ]}
            />
          </div>

          <div className="md:pt-5">
            <Select
              id="filter-status"
              noMargin
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              disabled={isOffline}
              options={[
                { label: 'Todos os Status', value: 'all' },
                { label: 'Pago / Recebido', value: 'pago' },
                { label: 'Pendente', value: 'pendente' },
              ]}
            />
          </div>
        </div>

        {isLoadingTransacoes ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : isErrorTransacoes ? (
          <div className="p-6">
            <ErrorState
              title="Erro ao carregar lançamentos financeiros"
              message="Não foi possível sincronizar o fluxo de caixa ou a requisição expirou. Tente novamente."
              onRetry={refetchTransacoes}
            />
          </div>
        ) : transacoes.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={DollarSign}
              title="Nenhum lançamento financeiro"
              description="Não foram encontrados registros para os filtros selecionados ou ainda não há despesas ou receitas cadastradas."
              actionLabel="Novo Lançamento"
              onAction={handleOpenCreate}
            />
          </div>
        ) : (
          <>
          <Table
            columns={columns}
            data={transacoes}
            selectedIds={selectedFinIds}
            onToggleSelect={handleToggleSelectFin}
            onSelectAll={handleSelectAllFins}
            onAction={(action, row) => {
              if (action === 'edit' || action === 'view') {
                setSelectedTransacao(row);
                setFormData({ ...row });
                setSlideOpen(true);
              } else if (action === 'delete') {
                setItemToDelete(row);
                setModalOpen(true);
              }
            }}
          />
          {!isOffline && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil((totalTransacoes || 0) / limit)}
              onPageChange={setPage}
              totalItems={totalTransacoes}
              itemsPerPage={limit}
            />
          )}
          </>
        )}
      </Card>

      {/* STICKY BATCH ACTION BAR (Barra Flutuante para Ações em Lote) */}
      {selectedFinIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 dark:bg-gray-900/95 text-white border border-gray-700/80 shadow-2xl rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md max-w-2xl w-11/12 animate-slide-up">
          <div className="flex items-center space-x-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-gray-950 font-bold text-xs">
              {selectedFinIds.length}
            </span>
            <span className="text-sm font-semibold text-gray-100">
              {selectedFinIds.length === 1 ? '1 lançamento selecionado' : `${selectedFinIds.length} lançamentos selecionados`}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="primary"
              onClick={() => {
                showToast(`Status atualizado em lote para ${selectedFinIds.length} lançamentos.`, 'success');
                setSelectedFinIds([]);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-3 py-1.5 text-xs min-h-[44px]"
            >
              Marcar como Pago ({selectedFinIds.length})
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedFinIds([])}
              className="!bg-slate-800 hover:!bg-slate-700 !text-white hover:!text-white border border-slate-600 font-bold px-3.5 py-1.5 text-xs rounded-lg transition-all shadow-sm min-h-[44px]"
            >
              Desmarcar Todos
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={periodoPersonalizadoModalOpen}
        onClose={() => { if (!isApplyingPeriod) setPeriodoPersonalizadoModalOpen(false); }}
        title="Personalizar período"
        actions={
          <>
            <Button variant="secondary" onClick={() => { if (!isApplyingPeriod) setPeriodoPersonalizadoModalOpen(false); }} disabled={isApplyingPeriod}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarPeriodoPersonalizado} disabled={isOffline || isApplyingPeriod}>
              {isApplyingPeriod ? 'Aplicando...' : 'Aplicar período'}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Escolha o intervalo que deseja visualizar. O período atual continua aplicado até a confirmação.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="filter-data-inicio-fin"
            noMargin
            type="date"
            label="Data inicial"
            value={dataInicioRascunho}
            max={dataFimRascunho || undefined}
            onChange={(e) => setDataInicioRascunho(e.target.value)}
            disabled={isOffline}
          />
          <Input
            id="filter-data-fim-fin"
            noMargin
            type="date"
            label="Data final"
            value={dataFimRascunho}
            min={dataInicioRascunho || undefined}
            onChange={(e) => setDataFimRascunho(e.target.value)}
            disabled={isOffline}
          />
        </div>
      </Modal>

      {/* SLIDE PANEL */}
      <FinanceiroSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        selectedTransacao={selectedTransacao}
        formData={formData}
        setFormData={setFormData}
        handleSave={handleSave}
        isSaving={isSaving}
      />

      {/* Modal De exclusão */}
      <FinanceiroModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        handleDelete={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};