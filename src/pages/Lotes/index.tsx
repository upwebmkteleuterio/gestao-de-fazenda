import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Users, Trash2, Search, MapPin, ArrowRightLeft, Plus, CheckCircle2, Info } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { useNavigate } from 'react-router-dom';
import { useLotes } from '../../hooks/useLotes';
import { usePastagens } from '../../hooks/usePastagens';
import { useAnimais } from '../../hooks/useAnimais';
import { useUIStore } from '../../store/useUIStore';
import { Pagination } from '../../components/Pagination';
import { Lote } from '../../services/lotesService';

export const Lotes: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { lotes, totalLotes, isLoading, isError, refetch, createLote, moverPasto, deleteLote } = useLotes({ search, page, limit });
  const { pastagens } = usePastagens();
  const { animais = [] } = useAnimais();

  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loteToDelete, setLoteToDelete] = useState<Lote | null>(null);

  // Modal Mudar Pasto
  const [moverPastoModalOpen, setMoverPastoModalOpen] = useState(false);
  const [loteToMove, setLoteToMove] = useState<Lote | null>(null);
  const [targetPastoId, setTargetPastoId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);

  // Modal Criar Lote Avulso
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [novoLoteNome, setNovoLoteNome] = useState('');
  const [novoLotePastoId, setNovoLotePastoId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleOpenLoteView = (lote: Lote) => {
    setSelectedLote(lote);
  };

  const handleDeleteLote = (lote: Lote) => {
    setLoteToDelete(lote);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (loteToDelete && deleteLote) {
      await deleteLote(loteToDelete.id);
      showToast(`Lote "${loteToDelete.nome}" excluído.`, 'info');
      setDeleteModalOpen(false);
      setLoteToDelete(null);
      if (selectedLote?.id === loteToDelete.id) {
        setSelectedLote(null);
      }
    }
  };

  const handleOpenMoverPasto = (lote: Lote) => {
    setLoteToMove(lote);
    setTargetPastoId(lote.pasto_id || (pastagens[0]?.id ?? ''));
    setMoverPastoModalOpen(true);
  };

  const confirmMoverPasto = async () => {
    if (!loteToMove || !targetPastoId) {
      showToast('Selecione o pasto de destino.', 'error');
      return;
    }

    const pastoEscolhido = pastagens.find(p => p.id === targetPastoId);
    if (!pastoEscolhido) {
      showToast('Pasto de destino não encontrado.', 'error');
      return;
    }

    setIsMoving(true);
    try {
      await moverPasto({
        loteId: loteToMove.id,
        pastoId: targetPastoId,
        pastoNome: pastoEscolhido.nome_pasto,
      });

      showToast(
        `Lote "${loteToMove.nome}" transferido para o ${pastoEscolhido.nome_pasto}! Todos os ${loteToMove.animais_ids.length} animais foram realocados.`,
        'success'
      );

      // Atualiza selectedLote se estiver aberto
      if (selectedLote && selectedLote.id === loteToMove.id) {
        setSelectedLote({
          ...selectedLote,
          pasto_id: targetPastoId,
          pasto_nome: pastoEscolhido.nome_pasto,
        });
      }

      setMoverPastoModalOpen(false);
      setLoteToMove(null);
    } catch (err) {
      showToast('Erro ao transferir lote de pasto.', 'error');
    } finally {
      setIsMoving(false);
    }
  };

  const handleCreateNovoLote = async () => {
    if (!novoLoteNome.trim()) {
      showToast('Informe o nome do lote.', 'error');
      return;
    }

    const pastoEscolhido = pastagens.find(p => p.id === novoLotePastoId);

    setIsCreating(true);
    try {
      await createLote({
        nome: novoLoteNome.trim(),
        animais_ids: [],
        pasto_id: novoLotePastoId || undefined,
        pasto_nome: pastoEscolhido?.nome_pasto || undefined,
      });

      showToast(`Lote "${novoLoteNome.trim()}" criado com sucesso!`, 'success');
      setCreateModalOpen(false);
      setNovoLoteNome('');
      setNovoLotePastoId('');
    } catch {
      showToast('Erro ao criar lote.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Users className="w-6 h-6 mr-2 text-emerald-600 dark:text-emerald-500" />
            Lotes & Retiros
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Gerencie os grupos de animais formados e controle as transferências entre pastos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            id="btn-novo-lote-lotes"
            variant="primary"
            icon={Plus}
            onClick={() => {
              setNovoLoteNome('');
              setNovoLotePastoId(pastagens[0]?.id || '');
              setCreateModalOpen(true);
            }}
          >
            Novo Lote
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
            <div>
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Gestão de Lotes / Retiros ({totalLotes})
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Lotes permitem agrupar animais para manejos coletivos e rotação de pastagens. Use a ação <strong>Mudar Pasto</strong> para transferir todos os animais do lote de uma só vez para outro piquete.
              </p>
            </div>
          </div>

          <div>
            <Input
              id="search-lotes"
              noMargin
              placeholder="Buscar lote por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>

          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-6">
              <ErrorState
                title="Erro ao carregar lotes"
                message="Não foi possível sincronizar os lotes e retiros ou a requisição expirou. Tente novamente."
                onRetry={refetch}
              />
            </div>
          ) : lotes.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title={search ? 'Nenhum lote encontrado' : 'Nenhum lote criado ainda'}
                description={
                  search
                    ? `Nenhum lote corresponde à pesquisa "${search}". Tente buscar por outro termo ou limpe o campo.`
                    : 'Lotes permitem agrupar animais para manejos coletivos (vacinação, engorda, transferências de pasto). Acesse o Rebanho ou Pesagens para selecionar animais e criar um lote.'
                }
                actionLabel={search ? 'Limpar Busca' : 'Ir para o Rebanho'}
                onAction={search ? () => setSearch('') : () => navigate('/animais')}
              />
            </div>
          ) : (
            <Table
              columns={[
                { 
                  header: 'Nome do Lote', 
                  render: (r: Lote) => (
                    <div>
                      <span className="font-bold text-gray-900 dark:text-gray-100">{r.nome}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Criado em {new Date(r.data_criacao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ) 
                },
                {
                  header: 'Pasto Atual',
                  render: (r: Lote) => (
                    r.pasto_nome ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        {r.pasto_nome}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        Sem pasto fixo
                      </span>
                    )
                  )
                },
                { 
                  header: 'Animais', 
                  render: (r: Lote) => (
                    <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20">
                      {r.animais_ids.length} cabeças
                    </span>
                  ) 
                },
                { 
                  header: 'Ações', 
                  accessor: 'id',
                  render: (r: Lote) => (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        id={`btn-mudar-pasto-${r.id}`}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleOpenMoverPasto(r); 
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 rounded-lg border border-emerald-200/70 dark:border-emerald-800 transition-colors"
                        title="Mudar pasto de todos os animais deste lote"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Mudar Pasto
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDeleteLote(r); 
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Excluir Lote"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                }
              ]}
              data={lotes}
              onRowClick={(row) => handleOpenLoteView(row)}
            />
          )}
          <Pagination
            currentPage={page}
            totalPages={Math.ceil((totalLotes || 0) / limit)}
            onPageChange={setPage}
            totalItems={totalLotes}
            itemsPerPage={limit}
          />
        </div>
      </Card>

      {/* Modal Mudar Lote de Pasto */}
      <Modal
        isOpen={moverPastoModalOpen}
        onClose={() => setMoverPastoModalOpen(false)}
        title="Mudar Lote de Pasto"
        actions={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setMoverPastoModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              id="btn-confirmar-mover-pasto"
              variant="primary"
              icon={CheckCircle2}
              onClick={confirmMoverPasto}
              loading={isMoving}
              disabled={!targetPastoId || isMoving}
            >
              Confirmar Transferência
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Lote Selecionado</span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded">
                {loteToMove?.animais_ids.length || 0} animais
              </span>
            </div>
            <p className="font-bold text-base text-gray-900 dark:text-white">{loteToMove?.nome}</p>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 pt-1 border-t border-emerald-100/60 dark:border-emerald-800/40">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                Pasto atual: <strong>{loteToMove?.pasto_nome || 'Sem pasto fixo'}</strong>
              </span>
            </div>
          </div>

          <Select
            id="select-destino-pasto"
            label="Selecione o Pasto / Piquete de Destino *"
            value={targetPastoId}
            onChange={(e) => setTargetPastoId(e.target.value)}
            options={pastagens.map(p => ({
              label: `${p.nome_pasto} (${p.tipo_capim || 'Pasto'})`,
              value: p.id,
            }))}
          />

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <p>
              Ao confirmar, a localização de todos os <strong>{loteToMove?.animais_ids.length}</strong> animais deste lote será atualizada automaticamente no rebanho e a lotação do novo pasto será recalculada em tempo real.
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal Criar Lote Avulso */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Criar Novo Lote"
        actions={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleCreateNovoLote}
              loading={isCreating}
              disabled={!novoLoteNome.trim() || isCreating}
            >
              Criar Lote
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            id="input-novo-lote-nome"
            label="Nome do Lote *"
            placeholder="Ex: Lote Recria Piquete 02, Confinamento Março..."
            value={novoLoteNome}
            onChange={(e) => setNovoLoteNome(e.target.value)}
            autoFocus
          />

          <Select
            id="select-novo-lote-pasto"
            label="Pasto / Piquete Inicial (Opcional)"
            value={novoLotePastoId}
            onChange={(e) => setNovoLotePastoId(e.target.value)}
            options={[
              { label: 'Nenhum pasto vinculado agora', value: '' },
              ...pastagens.map(p => ({
                label: `${p.nome_pasto} (${p.tipo_capim || 'Pasto'})`,
                value: p.id,
              }))
            ]}
          />

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Você também pode selecionar animais diretamente na tela do <strong>Rebanho</strong> ou em <strong>Pesagens</strong> para criar lotes com animais já vinculados.
          </p>
        </div>
      </Modal>

      {/* View Lote Modal Detalhado */}
      <Modal
        isOpen={!!selectedLote}
        onClose={() => setSelectedLote(null)}
        title={selectedLote?.nome || ''}
        actions={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              icon={ArrowRightLeft}
              onClick={() => {
                if (selectedLote) {
                  handleOpenMoverPasto(selectedLote);
                }
              }}
            >
              Mudar Pasto do Lote
            </Button>
            <Button variant="secondary" onClick={() => setSelectedLote(null)}>
              Fechar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200/70 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Pasto Atual</p>
              <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white mt-0.5">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{selectedLote?.pasto_nome || 'Sem pasto fixo'}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase font-semibold">Total de Animais</p>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                {selectedLote?.animais_ids.length} cabeças
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Animais pertencentes a este lote
            </h4>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800">
              {(() => {
                const animaisDoLote = animais.filter(a => selectedLote?.animais_ids.includes(a.id));
                if (animaisDoLote.length === 0 && (selectedLote?.animais_ids.length || 0) > 0) {
                  return (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800 p-2 text-sm text-gray-600 dark:text-gray-300">
                      {selectedLote?.animais_ids.map(id => (
                        <li key={id} className="py-2 px-3 flex justify-between">
                          <span>Animal ID: {id}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                if (animaisDoLote.length === 0) {
                  return (
                    <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      Nenhum animal vinculado a este lote ainda.
                    </div>
                  );
                }
                return (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800">
                      <tr>
                        <th className="py-2.5 px-3">Brinco</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Sexo</th>
                        <th className="py-2.5 px-3">Peso</th>
                        <th className="py-2.5 px-3">Pasto Animal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {animaisDoLote.map((ani) => (
                        <tr key={ani.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                          <td className="py-2 px-3 font-bold text-gray-900 dark:text-gray-100">{ani.brinco}</td>
                          <td className="py-2 px-3">{ani.categoria}</td>
                          <td className="py-2 px-3 capitalize">{ani.tipo_animal}</td>
                          <td className="py-2 px-3">{ani.sexo === 'M' ? 'Macho' : 'Fêmea'}</td>
                          <td className="py-2 px-3">{ani.peso_atual ? `${ani.peso_atual} kg` : '-'}</td>
                          <td className="py-2 px-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            {ani.pasto_nome || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Lote Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Excluir Lote"
        actions={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Sim, Excluir Lote
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Tem certeza que deseja excluir o lote <strong>{loteToDelete?.nome}</strong>? Os animais não serão excluídos do sistema, apenas o agrupamento.
        </p>
      </Modal>
    </div>
  );
};
