// Modal Mudar Pasto
// Modal Criar Lote Avulso
// Atualiza selectedLote se estiver aberto
/* Modal Mudar Lote de Pasto */
/* Modal Criar Lote Avulso */
/* View Lote Modal Detalhado */
/* Delete Lote Modal */
import React, { useState, useEffect, useRef } from "react";
import { Card } from "../../components/Card";
import { Table } from "../../components/Table";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";

import {
    Users,
    Trash2,
    Search,
    MapPin,
    ArrowRightLeft,
    Plus,
    CheckCircle2,
    Info,
    WifiOff,
    X,
} from "lucide-react";

import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { useNavigate } from "react-router-dom";
import { useLotes } from "../../hooks/useLotes";
import { useConnectivityStore } from "../../store/useConnectivityStore";
import { usePastagens } from "../../hooks/usePastagens";
import { useAnimais } from "../../hooks/useAnimais";
import { useUIStore } from "../../store/useUIStore";
import { Pagination } from "../../components/Pagination";
import { SyncStatusIndicator, type SyncStatus } from "../../components/SyncStatusIndicator";
import { Lote } from "../../services/lotesService";
import { MAX_DOMAIN_TEXT_LENGTH } from "../../services/domainValidation";

type LoteRow = Lote & {
    syncStatus?: SyncStatus;
    syncError?: string;
    localDeleted?: boolean;
};

export const Lotes: React.FC = () => {
    const navigate = useNavigate();

    const {
        showToast
    } = useUIStore();

    const connectivityStatus = useConnectivityStore(state => state.status);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const limit = 10;
    const isOffline = connectivityStatus === "offline" || (typeof navigator !== "undefined" && !navigator.onLine);

    useEffect(() => {
        setPage(1);
    }, [search]);

    useEffect(() => {
        if (isOffline) {
            setPage(1);
            setSearch("");
        }
    }, [isOffline]);

    const {
        lotes,
        totalLotes,
        source,
        capturedAt,
        isLoading,
        isError,
        refetch,
        createLote,
        updateLote,
        isUpdating,
        moverPasto,
        deleteLote,
        isDeleting
    } = useLotes({
        search,
        page,
        limit
    });

    const showingOfflineCache = isOffline || source === "local";

    const {
        pastagens
    } = usePastagens();

    const {
        animais = []
    } = useAnimais();

    const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [loteToDelete, setLoteToDelete] = useState<Lote | null>(null);
    const [moverPastoModalOpen, setMoverPastoModalOpen] = useState(false);
    const [loteToMove, setLoteToMove] = useState<Lote | null>(null);
    const [targetPastoId, setTargetPastoId] = useState<string>("");
    const [isMoving, setIsMoving] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [novoLoteNome, setNovoLoteNome] = useState("");
    const [novoLotePastoId, setNovoLotePastoId] = useState("");
    const [novoLoteAnimalSearch, setNovoLoteAnimalSearch] = useState("");
    const [novoLoteAnimaisIds, setNovoLoteAnimaisIds] = useState<string[]>([]);
    const [animalPickerOpen, setAnimalPickerOpen] = useState(false);
    const animalPickerRef = useRef<HTMLDivElement>(null);
    const [addAnimalSearch, setAddAnimalSearch] = useState("");
    const [addAnimalPickerOpen, setAddAnimalPickerOpen] = useState(false);
    const [animaisParaAdicionarIds, setAnimaisParaAdicionarIds] = useState<string[]>([]);
    const addAnimalPickerRef = useRef<HTMLDivElement>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isAddingAnimals, setIsAddingAnimals] = useState(false);

    const animaisDisponiveisParaLote = animais.filter((animal) => {
        if (!animal.id || !animal.brinco) return false;
        const query = novoLoteAnimalSearch.trim().toLocaleLowerCase();
        return !query
            || animal.brinco.toLocaleLowerCase().includes(query)
            || animal.id.toLocaleLowerCase().includes(query);
    });

    const animaisDisponiveisParaAdicionar = animais.filter((animal) => {
        if (!animal.id || !animal.brinco || selectedLote?.animais_ids.includes(animal.id)) return false;
        const query = addAnimalSearch.trim().toLocaleLowerCase();
        return !query
            || animal.brinco.toLocaleLowerCase().includes(query)
            || animal.id.toLocaleLowerCase().includes(query);
    });

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (animalPickerRef.current && !animalPickerRef.current.contains(target)) {
                setAnimalPickerOpen(false);
            }
            if (addAnimalPickerRef.current && !addAnimalPickerRef.current.contains(target)) {
                setAddAnimalPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const handleOpenLoteView = (lote: Lote) => {
        setSelectedLote(lote);
        setAddAnimalSearch("");
        setAnimaisParaAdicionarIds([]);
        setAddAnimalPickerOpen(false);
    };

    const handleAddAnimaisAoLote = async () => {
        if (!selectedLote || isAddingAnimals || animaisParaAdicionarIds.length === 0) return;

        const animaisIds = [...new Set([...selectedLote.animais_ids, ...animaisParaAdicionarIds])];
        setIsAddingAnimals(true);
        try {
            const loteAtualizado = await updateLote({
                id: selectedLote.id,
                updates: { animais_ids: animaisIds },
            });
            setSelectedLote(loteAtualizado);
            setAnimaisParaAdicionarIds([]);
            setAddAnimalSearch("");
            setAddAnimalPickerOpen(false);
            showToast("Animais adicionados ao lote com sucesso!", "success");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Erro ao adicionar animais ao lote.", "error");
        } finally {
            setIsAddingAnimals(false);
        }
    };

    const handleRemoveAnimalDoLote = async (animalId: string) => {
        if (!selectedLote || isUpdating) return;

        const animaisIds = selectedLote.animais_ids.filter((id) => id !== animalId);
        try {
            const loteAtualizado = await updateLote({
                id: selectedLote.id,
                updates: { animais_ids: animaisIds },
            });
            setSelectedLote(loteAtualizado);
            showToast("Animal removido do lote com sucesso!", "success");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Erro ao remover animal do lote.", "error");
        }
    };

    const handleDeleteLote = (lote: Lote) => {
        setLoteToDelete(lote);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!loteToDelete || isDeleting)
            return;

        try {
            await deleteLote(loteToDelete.id);
            showToast(`Lote "${loteToDelete.nome}" excluído.`, "info");
            setDeleteModalOpen(false);
            setLoteToDelete(null);

            if (selectedLote?.id === loteToDelete.id)
                setSelectedLote(null);
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Erro ao excluir lote.", "error");
        }
    };

    const handleOpenMoverPasto = (lote: Lote) => {
        setLoteToMove(lote);
        setTargetPastoId(lote.pasto_id || (pastagens[0]?.id ?? ""));
        setMoverPastoModalOpen(true);
    };

    const confirmMoverPasto = async () => {
        if (isMoving)
            return;

        if (!loteToMove || !targetPastoId) {
            showToast("Selecione o pasto de destino.", "error");
            return;
        }

        if (targetPastoId === loteToMove.pasto_id) {
            showToast("Selecione um pasto diferente do atual.", "error");
            return;
        }

        const pastoEscolhido = pastagens.find(p => p.id === targetPastoId);

        if (!pastoEscolhido) {
            showToast("Pasto de destino não encontrado.", "error");
            return;
        }

        setIsMoving(true);

        try {
            await moverPasto({
                loteId: loteToMove.id,
                pastoId: targetPastoId,
                pastoNome: pastoEscolhido.nome_pasto
            });

            showToast(
                `Lote "${loteToMove.nome}" transferido para o ${pastoEscolhido.nome_pasto}! Todos os ${loteToMove.animais_ids.length} animais foram realocados.`,
                "success"
            );

            if (selectedLote && selectedLote.id === loteToMove.id) {
                setSelectedLote({
                    ...selectedLote,
                    pasto_id: targetPastoId,
                    pasto_nome: pastoEscolhido.nome_pasto
                });
            }

            setMoverPastoModalOpen(false);
            setLoteToMove(null);
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : "Erro ao transferir lote de pasto.",
                "error"
            );
        } finally {
            setIsMoving(false);
        }
    };

    const handleCreateNovoLote = async () => {
        if (isCreating)
            return;

        const nome = novoLoteNome.trim();

        if (!nome) {
            showToast("Informe o nome do lote.", "error");
            return;
        }

        if (nome.length > MAX_DOMAIN_TEXT_LENGTH) {
            showToast(
                `O nome do lote deve ter no máximo ${MAX_DOMAIN_TEXT_LENGTH} caracteres.`,
                "error"
            );

            return;
        }

        const animaisIds = novoLoteAnimaisIds.filter((animalId) => animais.some((animal) => animal.id === animalId && animal.brinco));
        if (animaisIds.length === 0) {
            showToast("Selecione ao menos um animal já cadastrado para vincular ao lote.", "error");
            return;
        }

        const pastoEscolhido = pastagens.find(p => p.id === novoLotePastoId);
        setIsCreating(true);

        try {
            await createLote({
                nome,
                animais_ids: animaisIds,
                pasto_id: novoLotePastoId || undefined,
                pasto_nome: pastoEscolhido?.nome_pasto || undefined
            });

            showToast(`Lote "${novoLoteNome.trim()}" criado com sucesso!`, "success");
            setCreateModalOpen(false);
            setNovoLoteNome("");
            setNovoLotePastoId("");
            setNovoLoteAnimalSearch("");
            setNovoLoteAnimaisIds([]);
            setAnimalPickerOpen(false);
        } catch {
            showToast("Erro ao criar lote.", "error");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1
                        className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Users className="w-6 h-6 mr-2 text-emerald-600 dark:text-emerald-500" />Lotes & Retiros
                                  </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Gerencie os grupos de animais formados e controle as transferências entre pastos.
                                  </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        id="btn-novo-lote-lotes"
                        variant="primary"
                        icon={Plus}
                        onClick={() => {
                            setNovoLoteNome("");
                            setNovoLotePastoId(pastagens[0]?.id || "");
                            setNovoLoteAnimalSearch("");
                            setNovoLoteAnimaisIds([]);
                            setAnimalPickerOpen(false);
                            setCreateModalOpen(true);
                        }}>Novo Lote
                                  </Button>
                </div>
            </div>
            <Card>
                <div className="p-4 space-y-4">
                    {showingOfflineCache && (<div
                        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold">Modo offline: mostrando os lotes mais recentes em cache.</p>
                            <p className="mt-0.5 text-xs">A busca e a paginação ficam disponíveis novamente quando a conexão for restaurada. As alterações feitas agora serão sincronizadas depois.</p>
                            {capturedAt && <p className="mt-1 text-[11px] opacity-80">Cache atualizado em {new Date(capturedAt).toLocaleString("pt-BR")}</p>}
                        </div>
                    </div>)}
                    <div
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                        <div>
                            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Gestão de Lotes / Retiros ({totalLotes})
                                              </h3>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">Lotes permitem agrupar animais para manejos coletivos e rotação de pastagens. Use a ação <strong>Mudar Pasto</strong>para transferir todos os animais do lote de uma só vez para outro piquete.
                                              </p>
                        </div>
                    </div>
                    <div>
                        <Input
                            id="search-lotes"
                            noMargin
                            placeholder={showingOfflineCache ? "Busca indisponível offline" : "Buscar lote por nome..."}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            icon={Search}
                            disabled={showingOfflineCache} />
                    </div>
                    {isLoading ? (<div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (<div
                            key={i}
                            className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />))}
                    </div>) : isError ? (<div className="p-6">
                        <ErrorState
                            title="Erro ao carregar lotes"
                            message="Não foi possível sincronizar os lotes e retiros ou a requisição expirou. Tente novamente."
                            onRetry={refetch} />
                    </div>) : lotes.length === 0 ? (<div className="p-6">
                        <EmptyState
                            icon={Users}
                            title={search ? "Nenhum lote encontrado" : "Nenhum lote criado ainda"}
                            description={search ? `Nenhum lote corresponde à pesquisa "${search}". Tente buscar por outro termo ou limpe o campo.` : "Lotes permitem agrupar animais para manejos coletivos (vacinação, engorda, transferências de pasto). Acesse o Rebanho ou Pesagens para selecionar animais e criar um lote."}
                            actionLabel={search ? "Limpar Busca" : "Ir para o Rebanho"}
                            onAction={search ? () => setSearch("") : () => navigate("/animais")} />
                    </div>) : (<Table
                        columns={[{
                            header: "Nome do Lote",

                            render: (r: LoteRow) => (<div>
                                <span
                                    className="font-bold text-gray-900 dark:text-gray-100 inline-flex items-center gap-1.5">
                                    {r.nome}
                                    <SyncStatusIndicator status={r.syncStatus} error={r.syncError} />
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Criado em {new Date(r.data_criacao).toLocaleDateString("pt-BR")}
                                </p>
                            </div>)
                        }, {
                            header: "Pasto Atual",

                            render: (r: LoteRow) => (r.pasto_nome ? (<span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                {r.pasto_nome}
                            </span>) : (<span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Sem pasto fixo
                                                      </span>))
                        }, {
                            header: "Animais",

                            render: (r: LoteRow) => (<span
                                className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20">
                                {r.animais_ids.length}cabeças
                                                    </span>)
                        }, {
                            header: "Ações",
                            accessor: "id",

                            render: (r: LoteRow) => (<div className="flex items-center justify-end gap-2">
                                <button
                                    id={`btn-mudar-pasto-${r.id}`}
                                    onClick={e => {
                                        e.stopPropagation();
                                        handleOpenMoverPasto(r);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 rounded-lg border border-emerald-200/70 dark:border-emerald-800 transition-colors"
                                    title="Mudar pasto de todos os animais deste lote">
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />Mudar Pasto
                                                          </button>
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        handleDeleteLote(r);
                                    }}
                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title="Excluir Lote">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>)
                        }]}
                        data={lotes}
                        onRowClick={row => handleOpenLoteView(row)} />)}
                    {!showingOfflineCache && (<Pagination
                        currentPage={page}
                        totalPages={Math.ceil((totalLotes || 0) / limit)}
                        onPageChange={setPage}
                        totalItems={totalLotes}
                        itemsPerPage={limit} />)}
                </div>
            </Card>
            {}
            <Modal
                isOpen={moverPastoModalOpen}
                onClose={() => {
                    if (!isMoving)
                        setMoverPastoModalOpen(false);
                }}
                title="Mudar Lote de Pasto"
                actions={<div className="flex items-center justify-end gap-2 w-full">
                    <Button
                        variant="secondary"
                        onClick={() => setMoverPastoModalOpen(false)}
                        disabled={isMoving}>Cancelar
                                    </Button>
                    <Button
                        id="btn-confirmar-mover-pasto"
                        variant="primary"
                        icon={CheckCircle2}
                        onClick={confirmMoverPasto}
                        loading={isMoving}
                        disabled={!targetPastoId || isMoving}>Confirmar Transferência
                                    </Button>
                </div>}>
                <div className="space-y-4">
                    <div
                        className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                            <span
                                className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Lote Selecionado</span>
                            <span
                                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded">
                                {loteToMove?.animais_ids.length || 0}animais
                                              </span>
                        </div>
                        <p className="font-bold text-base text-gray-900 dark:text-white">{loteToMove?.nome}</p>
                        <div
                            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 pt-1 border-t border-emerald-100/60 dark:border-emerald-800/40">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Pasto atual: <strong>{loteToMove?.pasto_nome || "Sem pasto fixo"}</strong>
                            </span>
                        </div>
                    </div>
                    <Select
                        id="select-destino-pasto"
                        label="Selecione o Pasto / Piquete de Destino *"
                        value={targetPastoId}
                        onChange={e => setTargetPastoId(e.target.value)}
                        options={pastagens.map(p => ({
                            label: `${p.nome_pasto} (${p.tipo_capim || "Pasto"})`,
                            value: p.id
                        }))} />
                    <div
                        className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300">
                        <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <p>Ao confirmar, a localização de todos os <strong>{loteToMove?.animais_ids.length}</strong>animais deste lote será atualizada automaticamente no rebanho e a lotação do novo pasto será recalculada em tempo real.
                                        </p>
                    </div>
                </div>
            </Modal>
            {}
            <Modal
                isOpen={createModalOpen}
                onClose={() => {
                    if (!isCreating)
                        setCreateModalOpen(false);
                }}
                title="Criar Novo Lote"
                actions={<div className="flex items-center justify-end gap-2 w-full">
                    <Button
                        variant="secondary"
                        onClick={() => setCreateModalOpen(false)}
                        disabled={isCreating}>Cancelar
                                    </Button>
                    <Button
                        variant="primary"
                        icon={Plus}
                        onClick={handleCreateNovoLote}
                        loading={isCreating}
                        disabled={!novoLoteNome.trim() || novoLoteAnimaisIds.length === 0 || isCreating}>Criar Lote
                                    </Button>
                </div>}>
                <div className="space-y-4">
                    <Input
                        id="input-novo-lote-nome"
                        label="Nome do Lote *"
                        placeholder="Ex: Lote Recria Piquete 02, Confinamento Março..."
                        maxLength={MAX_DOMAIN_TEXT_LENGTH}
                        value={novoLoteNome}
                        onChange={e => setNovoLoteNome(e.target.value)}
                        autoFocus />
                    <Select
                        id="select-novo-lote-pasto"
                        label="Pasto / Piquete Inicial (Opcional)"
                        value={novoLotePastoId}
                        onChange={e => setNovoLotePastoId(e.target.value)}
                        options={[{
                            label: "Nenhum pasto vinculado agora",
                            value: ""
                        }, ...pastagens.map(p => ({
                            label: `${p.nome_pasto} (${p.tipo_capim || "Pasto"})`,
                            value: p.id
                        }))]} />
                    <div ref={animalPickerRef} className="relative">
                        <label htmlFor="input-novo-lote-animal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 leading-snug">
                            Animais do Lote *
                        </label>
                        <Input
                            id="input-novo-lote-animal"
                            type="search"
                            icon={Search}
                            placeholder="Buscar animal por brinco ou ID..."
                            value={novoLoteAnimalSearch}
                            onFocus={() => setAnimalPickerOpen(true)}
                            onChange={e => {
                                setNovoLoteAnimalSearch(e.target.value);
                                setAnimalPickerOpen(true);
                            }}
                            autoComplete="off"
                            role="combobox"
                            aria-expanded={animalPickerOpen}
                            aria-controls="novo-lote-animal-options"
                        />
                        {animalPickerOpen && (
                            <div id="novo-lote-animal-options" role="listbox" className="mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                {animaisDisponiveisParaLote.length > 0 ? animaisDisponiveisParaLote.map(animal => {
                                    const isSelected = novoLoteAnimaisIds.includes(animal.id);
                                    return (
                                        <button
                                            key={animal.id}
                                            type="button"
                                            role="option"
                                            aria-selected={isSelected}
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${isSelected
                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                                                : "text-gray-700 hover:bg-emerald-50 dark:text-gray-200 dark:hover:bg-emerald-950/40"}`}
                                            onClick={() => {
                                                setNovoLoteAnimaisIds(ids => isSelected
                                                    ? ids.filter(id => id !== animal.id)
                                                    : [...ids, animal.id]);
                                                setNovoLoteAnimalSearch("");
                                                setAnimalPickerOpen(true);
                                            }}
                                        >
                                            <span className="font-medium">Brinco: {animal.brinco}</span>
                                            <span className={`text-xs ${isSelected ? "text-emerald-700 dark:text-emerald-300" : "text-gray-500 dark:text-gray-400"}`}>
                                                {isSelected ? "Selecionado" : `ID: ${animal.id}`}
                                            </span>
                                        </button>
                                    );
                                }) : (
                                    <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Nenhum animal cadastrado disponível.</p>
                                )}
                            </div>
                        )}
                        {novoLoteAnimaisIds.length > 0 && (
                            <div className="mt-2 space-y-2" aria-label="Animais selecionados">
                                {novoLoteAnimaisIds.map(animalId => {
                                    const animal = animais.find(item => item.id === animalId);
                                    if (!animal) return null;
                                    return (
                                        <div key={animal.id} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                            <span className="text-gray-800 dark:text-gray-200">Brinco: <strong>{animal.brinco}</strong></span>
                                            <button
                                                type="button"
                                                aria-label={`Remover animal ${animal.brinco}`}
                                                className="rounded-md p-1 text-gray-500 hover:bg-white hover:text-red-600 dark:hover:bg-gray-800"
                                                onClick={() => setNovoLoteAnimaisIds(ids => ids.filter(id => id !== animal.id))}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Selecione apenas animais já cadastrados no Rebanho.</p>
                    </div>
                </div>
            </Modal>
            {}
            <Modal
                isOpen={!!selectedLote}
                onClose={() => setSelectedLote(null)}
                title={selectedLote?.nome || ""}
                actions={<div className="flex items-center justify-between w-full">
                    <Button
                        variant="secondary"
                        icon={ArrowRightLeft}
                        onClick={() => {
                            if (selectedLote) {
                                handleOpenMoverPasto(selectedLote);
                            }
                        }}>Mudar Pasto do Lote
                                    </Button>
                    <Button variant="secondary" onClick={() => setSelectedLote(null)}>Fechar
                                    </Button>
                </div>}>
                <div className="space-y-4">
                    <div
                        className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200/70 dark:border-gray-700">
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Pasto Atual</p>
                            <div
                                className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white mt-0.5">
                                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>{selectedLote?.pasto_nome || "Sem pasto fixo"}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase font-semibold">Total de Animais</p>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                                {selectedLote?.animais_ids.length}cabeças
                                              </span>
                        </div>
                    </div>
                    <div>
                        <h4
                            className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">ANIMAIS PERTENCENTES A ESTE LOTE</h4>
                        <div
                            className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800">
                            {(() => {
                                const animaisDoLote = animais.filter(a => selectedLote?.animais_ids.includes(a.id));

                                if (animaisDoLote.length === 0 && (selectedLote?.animais_ids.length || 0) > 0) {
                                    return (
                                        <ul
                                            className="divide-y divide-gray-100 dark:divide-gray-800 p-2 text-sm text-gray-600 dark:text-gray-300">
                                            {selectedLote?.animais_ids.map(id => (<li key={id} className="py-2 px-3 flex justify-between items-center">
                                                <span>Animal ID: {id}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAnimalDoLote(id)}
                                                    disabled={isUpdating}
                                                    title="Retirar animal do lote"
                                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </li>))}
                                        </ul>
                                    );
                                }

                                if (animaisDoLote.length === 0) {
                                    return (<div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Nenhum animal vinculado a este lote ainda.</div>);
                                }

                                return (
                                    <table className="w-full text-left text-sm">
                                        <thead
                                            className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800">
                                            <tr>
                                                <th className="py-2.5 px-3">Brinco</th>
                                                <th className="py-2.5 px-3">Categoria</th>
                                                <th className="py-2.5 px-3">Tipo</th>
                                                <th className="py-2.5 px-3">Sexo</th>
                                                <th className="py-2.5 px-3">Peso</th>
                                                <th className="py-2.5 px-3">Pasto Animal</th>
                                                <th className="py-2.5 px-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {animaisDoLote.map(
                                                ani => (<tr key={ani.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                                                    <td className="py-2 px-3 font-bold text-gray-900 dark:text-gray-100">{ani.brinco}</td>
                                                    <td className="py-2 px-3">{ani.categoria}</td>
                                                    <td className="py-2 px-3 capitalize">{ani.tipo_animal}</td>
                                                    <td className="py-2 px-3">{ani.sexo === "M" ? "Macho" : "Fêmea"}</td>
                                                    <td className="py-2 px-3">{ani.peso_atual ? `${ani.peso_atual} kg` : "-"}</td>
                                                    <td
                                                        className="py-2 px-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                        {ani.pasto_nome || "-"}
                                                    </td>
                                                    <td className="py-2 px-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAnimalDoLote(ani.id)}
                                                            disabled={isUpdating}
                                                            title="Retirar animal do lote"
                                                            className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>)
                                            )}
                                        </tbody>
                                    </table>
                                );
                            })()}
                        </div>
                    </div>
                    <div ref={addAnimalPickerRef} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">Adicionar animais ao lote</h4>
                        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">Selecione animais cadastrados para manter os vínculos atuais e adicionar novos.</p>
                        <div className="mt-3">
                            <Input
                                id="input-adicionar-animal-lote"
                                type="search"
                                icon={Search}
                                placeholder="Buscar animal por brinco ou ID..."
                                value={addAnimalSearch}
                                onFocus={() => setAddAnimalPickerOpen(true)}
                                onChange={event => {
                                    setAddAnimalSearch(event.target.value);
                                    setAddAnimalPickerOpen(true);
                                }}
                                autoComplete="off"
                                role="combobox"
                                aria-expanded={addAnimalPickerOpen}
                                aria-controls="adicionar-animal-lote-options"
                                disabled={isUpdating || isAddingAnimals}
                            />
                            {addAnimalPickerOpen && (
                                <div id="adicionar-animal-lote-options" role="listbox" className="mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                    {animaisDisponiveisParaAdicionar.length > 0 ? animaisDisponiveisParaAdicionar.map(animal => {
                                        const isSelected = animaisParaAdicionarIds.includes(animal.id);
                                        return (
                                            <button
                                                key={animal.id}
                                                type="button"
                                                role="option"
                                                aria-selected={isSelected}
                                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${isSelected
                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                                                    : "text-gray-700 hover:bg-emerald-50 dark:text-gray-200 dark:hover:bg-emerald-950/40"}`}
                                                onClick={() => {
                                                    setAnimaisParaAdicionarIds(ids => isSelected
                                                        ? ids.filter(id => id !== animal.id)
                                                        : [...ids, animal.id]);
                                                    setAddAnimalSearch("");
                                                    setAddAnimalPickerOpen(true);
                                                }}
                                                disabled={isUpdating || isAddingAnimals}
                                            >
                                                <span className="font-medium">Brinco: {animal.brinco}</span>
                                                <span className={`text-xs ${isSelected ? "text-emerald-700 dark:text-emerald-300" : "text-gray-500 dark:text-gray-400"}`}>
                                                    {isSelected ? "Selecionado" : `ID: ${animal.id}`}
                                                </span>
                                            </button>
                                        );
                                    }) : (
                                        <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Nenhum animal disponível para adicionar.</p>
                                    )}
                                </div>
                            )}
                        </div>
                        {animaisParaAdicionarIds.length > 0 && (
                            <div className="mt-2 space-y-2" aria-label="Animais a adicionar">
                                {animaisParaAdicionarIds.map(animalId => {
                                    const animal = animais.find(item => item.id === animalId);
                                    if (!animal) return null;
                                    return (
                                        <div key={animal.id} className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-100/70 px-3 py-2 text-sm dark:border-emerald-800 dark:bg-emerald-900/40">
                                            <span className="text-emerald-900 dark:text-emerald-100">Brinco: <strong>{animal.brinco}</strong></span>
                                            <button
                                                type="button"
                                                aria-label={`Remover animal ${animal.brinco} da seleção`}
                                                className="rounded-md p-1 text-emerald-700 hover:bg-white hover:text-red-600 dark:text-emerald-200 dark:hover:bg-gray-800"
                                                onClick={() => setAnimaisParaAdicionarIds(ids => ids.filter(id => id !== animal.id))}
                                                disabled={isUpdating || isAddingAnimals}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                                <Button
                                    variant="primary"
                                    onClick={handleAddAnimaisAoLote}
                                    loading={isAddingAnimals}
                                    disabled={isUpdating || isAddingAnimals}
                                    className="w-full"
                                >
                                    Salvar animais no lote
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
            {}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => {
                    if (!isDeleting)
                        setDeleteModalOpen(false);
                }}
                title="Excluir Lote"
                actions={<div className="flex items-center justify-end gap-2 w-full">
                    <Button
                        variant="secondary"
                        onClick={() => setDeleteModalOpen(false)}
                        disabled={isDeleting}>Cancelar
                                    </Button>
                    <Button
                        variant="danger"
                        onClick={confirmDelete}
                        loading={isDeleting}
                        disabled={isDeleting}>Sim, Excluir Lote
                                    </Button>
                </div>}>
                <p className="text-sm text-gray-700 dark:text-gray-300">Tem certeza que deseja excluir o lote <strong>{loteToDelete?.nome}</strong>? Os animais não serão excluídos do sistema, apenas o agrupamento.
                            </p>
            </Modal>
        </div>
    );
};