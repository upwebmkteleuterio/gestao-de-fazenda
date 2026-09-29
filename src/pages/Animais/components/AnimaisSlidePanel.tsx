/* MODO VISUALIZAÇÃO SOMENTE LEITURA */
/* REGISTROS ABCZ (CDC e CDN) NO MODO VISUALIZAÇÃO */
/* MODO CADASTRO / EDIÇÃO FORMULÁRIO DINÂMICO */
/* ROW 1: Tipo e Brinco */
/* SEÇÃO: Tipo de Reprodução (Inseminação / Monta Natural) */
/* ROW 2: Nascimento ou Idade */
/* ROW 3: Classificação automática e Raça */
/* Lógica de Descarte (Global para qualquer tipo de animal) */
/* CONDICIONAL: SE BEZERRO/A */
/* Seção Específica para Bezerro/a: Registros ABCZ (CDC e CDN) */
/* CONDICIONAL: SE MATRIZ / VACA / NOVILHA */
/* Acordeões / Abas Internas Matriz */
// Opcional, para ver o campo de descarte
/* Lançamento de Toque */
/* Histórico Ano a Ano */
/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */
import React from "react";
import { SlidePanel } from "../../../components/SlidePanel";
import { Input } from "../../../components/Input";
import { Select } from "../../../components/Select";
import { Button } from "../../../components/Button";
import { Badge } from "../../../components/Badge";

import {
    Trash2,
    Syringe,
    Wheat,
    Activity,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    X,
    Edit,
} from "lucide-react";

import { MontaNaturalIcon } from "../../../components/MontaNaturalIcon";
import { InseminacaoIcon } from "../../../components/InseminacaoIcon";

import {
    Animal,
    CategoriaAnimal,
    StatusAnimal,
    SexoAnimal,
    RegistroToqueAno,
    TipoCobertura,
    Lote,
} from "../../../types/database";

import { Tabs } from "../../../components/Tabs";
import { animalTypeLabels } from "@/services/animalClassification";
import { isPlausibleAnimalWeight } from "@/services/domainValidation";
import { useAnimalChildren } from "@/hooks/useAnimais";
import { MaeSearchInput } from "./MaeSearchInput";
import { TouroSearchInput } from "./TouroSearchInput";
import { AnimalAvatar } from "./AnimalAvatar";
type MatrizTab = "cobertas" | "paridas" | "solteiras" | "toque";
type Toast = (message: string, type?: "success" | "error" | "info") => void;

interface AnimaisSlidePanelProps {
    slideOpen: boolean;
    setSlideOpen: (value: boolean) => void;
    slideMode: "create" | "edit" | "view";
    setSlideMode: (mode: "create" | "edit" | "view") => void;
    selectedAnimal: Animal | null;
    formData: Partial<Animal>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Animal>>>;
    handleSave: (event: React.FormEvent) => void;
    matrizTab: MatrizTab;
    setMatrizTab: (tab: MatrizTab) => void;
    novoToqueData: string;
    setNovoToqueData: (value: string) => void;
    novoToqueResultado: "cheia" | "vazia";
    setNovoToqueResultado: (value: "cheia" | "vazia") => void;
    novoToqueObs: string;
    setNovoToqueObs: (value: string) => void;
    handleAddToque: () => void;
    handleRemoveToque: (id: string) => void;
    isSaving: boolean;
    calcularIdadeFormatada: (date: string) => string;
    showToast: Toast;
    animais?: Animal[];
    pastagens?: Array<{
        id: string;
        nome_pasto: string;
    }>;
    lotes?: Lote[];
    handleCreateFilho?: (maeId: string) => void;
    handleOpenChild?: (animal: Animal) => void;
}

export const AnimaisSlidePanel: React.FC<AnimaisSlidePanelProps> = (
    {
        slideOpen,
        setSlideOpen,
        slideMode,
        setSlideMode,
        selectedAnimal,
        formData,
        setFormData,
        handleSave,
        matrizTab,
        setMatrizTab,
        novoToqueData,
        setNovoToqueData,
        novoToqueResultado,
        setNovoToqueResultado,
        novoToqueObs,
        setNovoToqueObs,
        handleAddToque,
        handleRemoveToque,
        isSaving,
        calcularIdadeFormatada,
        showToast,
        animais = [],
        pastagens = [],
        lotes = [],
        handleCreateFilho,
        handleOpenChild
    }
) => {
    const [idadeMode, setIdadeMode] = React.useState<"data" | "meses">("data");
    const childrenParentId = slideMode === "view" && selectedAnimal && ["vaca", "matriz", "novilha"].includes(selectedAnimal.tipo_animal) ? selectedAnimal.id : undefined;
    const childrenQuery = useAnimalChildren(childrenParentId);
    const children = childrenQuery.data?.data ?? [];

    const parentLabel = (reference?: string) => {
        if (!reference)
            return "";

        const parent = animais.find(animal => animal.id === reference || animal.brinco === reference);
        return parent ? `${parent.brinco} (${parent.tipo_animal})` : `${reference} (referência legada)`;
    };

    const pastureName = selectedAnimal?.pasto_nome || pastagens.find(pastagem => pastagem.id === selectedAnimal?.pasto_id)?.nome_pasto;
    const selectedPastureId = formData.pasto_id || pastagens.find(pastagem => pastagem.nome_pasto === formData.pasto_nome)?.id || "";
    const coveredBull = selectedAnimal?.touro_cobertura
        ? animais.find(animal => animal.id === selectedAnimal.touro_cobertura)
        : undefined;
    const coveredBullLabel = coveredBull
        ? `${coveredBull.brinco} (${coveredBull.tipo_animal})`
        : selectedAnimal?.touro_cobertura;
    const linkedLotes = selectedAnimal ? lotes.filter(lote => lote.animais_ids.includes(selectedAnimal.id)) : [];

    return (
        <>
            <datalist id="pais-list">
                {animais.filter(a => ["touro", "garrote"].includes(a.tipo_animal)).map(
                    a => (<option key={a.brinco} value={a.brinco}>{a.brinco}({a.raca || "Sem raça"})</option>)
                )}
            </datalist>
            <SlidePanel
                isOpen={slideOpen}
                onClose={() => {
                    if (!isSaving)
                        setSlideOpen(false);
                }}
                title={slideMode === "create" ? "Cadastrar Novo Animal" : slideMode === "edit" ? `Editar Animal [${formData.brinco}]` : `Ficha do Animal [${formData.brinco}]`}
                subtitle={slideMode === "view" ? "Visualização somente leitura para segurança" : "Preencha os dados do formulário"}
                width="lg"
                actions={slideMode !== "view" ? (<>
                    <Button variant="ghost" onClick={() => setSlideOpen(false)} disabled={isSaving}>Cancelar
                                      </Button>
                    <Button variant="primary" onClick={handleSave} loading={isSaving}>Salvar Animal
                                      </Button>
                </>) : (<Button variant="primary" icon={Edit} onClick={() => setSlideMode("edit")}>Editar este Animal
                                </Button>)}>
                {}
                {slideMode === "view" && selectedAnimal ? (<div className="space-y-6">
                    <AnimalAvatar tipo={selectedAnimal.tipo_animal} />
                    <div
                        className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50 flex justify-between items-center">
                        <div>
                            <span
                                className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">Identificação</span>
                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">{selectedAnimal.brinco}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{selectedAnimal.tipo_animal}· {selectedAnimal.raca || "Nelore"}</p>
                        </div>
                        {selectedAnimal.brinco_duplicado && (<div
                            className="mt-3 col-span-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Conflito legado: há outro animal ativo com este brinco. Os históricos continuam separados pelo ID interno; novos cadastros com este brinco são bloqueados.
                                            </div>)}
                        <Badge variant={selectedAnimal.status === "ativo" ? "success" : "danger"}>
                            {selectedAnimal.status.toUpperCase()}
                        </Badge>
                    </div>
                    <div
                        className="grid grid-cols-2 gap-4 text-sm bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Sexo</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{selectedAnimal.sexo === "F" ? "Fêmea" : "Macho"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Idade Calculada</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{calcularIdadeFormatada(selectedAnimal.data_nascimento)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Data de Nascimento</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{new Date(`${selectedAnimal.data_nascimento}T00:00:00`).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Categoria</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                                {selectedAnimal.categoria === "PA" && "PA – Puro por Avaliação"}
                                {selectedAnimal.categoria === "PC" && "PC – Puro por Cruzamento"}
                                {selectedAnimal.categoria === "PO" && "PO – Puro de Origem"}
                                {selectedAnimal.categoria === "CO" && "CO – Comum"}
                                {!["PA", "PC", "PO", "CO"].includes(selectedAnimal.categoria) && selectedAnimal.categoria}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Peso Atual</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{selectedAnimal.peso_atual ? `${selectedAnimal.peso_atual} kg` : "N/I"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Tipo de Reprodução</p>
                            <p
                                className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                {selectedAnimal.tipo_cobertura === "IATF" ? (<>
                                    <InseminacaoIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />IATF
                                                        </>) : selectedAnimal.tipo_cobertura === "Inseminacao" || selectedAnimal.tipo_cobertura === "Inseminação" ? (<>
                                    <InseminacaoIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />Inseminação
                                                        </>) : (<>
                                    <span
                                        className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                                        <MontaNaturalIcon
                                            className="w-4 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 inline-block" />
                                    </span>Monta Natural
                                                        </>)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Cor / Pelagem</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{selectedAnimal.cor || "N/I"}</p>
                        </div>
                        {selectedAnimal.mae_id && (<div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Mãe</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{parentLabel(selectedAnimal.mae_id)}</p>
                        </div>)}
                        {selectedAnimal.pai_id && (<div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Pai</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{parentLabel(selectedAnimal.pai_id)}</p>
                        </div>)}
                        {selectedAnimal.status === "descarte" && (<div className="col-span-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-red-500 font-bold uppercase">Motivo do Descarte</p>
                            <p className="text-gray-700 dark:text-gray-300 font-medium">{selectedAnimal.motivo_descarte || "Sem motivo informado"}</p>
                            <p className="text-xs text-red-500 font-bold uppercase mt-2">Data do Descarte</p>
                            <p className="text-gray-700 dark:text-gray-300 font-medium">
                                {selectedAnimal.data_descarte ? new Date(`${selectedAnimal.data_descarte}T00:00:00`).toLocaleDateString("pt-BR") : "Não informada"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Histórico de descartes para este brinco: <span className="font-bold">{selectedAnimal.qtd_descartes_brinco || 1}</span>
                            </p>
                        </div>)}
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Pasto atual</p>
                        <p className="mt-1 font-medium text-gray-800 dark:text-gray-200">{pastureName || "Nenhum pasto vinculado"}</p>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Lotes vinculados</p>
                            {linkedLotes.length > 0 && <Badge variant="neutral">{linkedLotes.length}</Badge>}
                        </div>
                        {linkedLotes.length > 0 ? (
                            <ul className="mt-2 space-y-1.5 text-sm text-gray-800 dark:text-gray-200">
                                {linkedLotes.map(lote => <li key={lote.id} className="rounded-lg bg-white/80 px-3 py-2 dark:bg-gray-800/80">{lote.nome}</li>)}
                            </ul>
                        ) : (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Nenhum lote vinculado.</p>
                        )}
                    </div>
                    {}
                    {(["bezerro", "bezerra"].includes(selectedAnimal.tipo_animal) || selectedAnimal.cdc || selectedAnimal.cdn) && (<div
                        className="bg-blue-50/70 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-800/40 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4
                                className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span>Registros ABCZ (Associação Brasileira dos Criadores de Zebu)
                                                  </h4>
                            <Badge variant="neutral">Genealogia Zebuína</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div
                                className="bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg border border-blue-100/70 dark:border-blue-900/40">
                                <p
                                    className="text-xs text-blue-700 dark:text-blue-400 uppercase font-semibold">CDC - Cadastro de Cobertura</p>
                                <p className="font-bold text-gray-900 dark:text-white mt-0.5">{selectedAnimal.cdc || "Não informado"}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Registro de cobertura oficial ABCZ</p>
                            </div>
                            <div
                                className="bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg border border-blue-100/70 dark:border-blue-900/40">
                                <p
                                    className="text-xs text-blue-700 dark:text-blue-400 uppercase font-semibold">CDN - Cadastro de Nascimento</p>
                                <p className="font-bold text-gray-900 dark:text-white mt-0.5">{selectedAnimal.cdn || "Não informado"}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Registro de nascimento oficial ABCZ</p>
                            </div>
                        </div>
                    </div>)}
                    {childrenParentId && (<div
                        className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h4
                                    className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">Filhos vinculados</h4>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">Relacionamento calculado pelo ID interno em mae_id.</p>
                            </div>
                            {children.length > 0 && <Badge variant="neutral">{children.length}</Badge>}
                        </div>
                        {childrenQuery.isLoading && <p className="text-xs text-gray-500 dark:text-gray-400">Carregando filhos...</p>}
                        {childrenQuery.isError && <p className="text-xs text-red-600 dark:text-red-400">Não foi possível carregar os filhos. Tente novamente.</p>}
                        {!childrenQuery.isLoading && !childrenQuery.isError && children.length === 0 && (<p
                            className="rounded-lg border border-dashed border-amber-200 px-3 py-3 text-xs text-gray-500 dark:border-amber-800 dark:text-gray-400">Nenhum filho vinculado a esta mãe.</p>)}
                        <div className="space-y-2">
                            {children.map(child => (<button
                                key={child.id}
                                type="button"
                                onClick={() => handleOpenChild?.(child)}
                                className="flex w-full items-center justify-between gap-3 rounded-lg border border-white bg-white px-3 py-2 text-left shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30">
                                <span className="min-w-0">
                                    <span
                                        className="block truncate text-sm font-bold text-gray-900 dark:text-gray-100">{child.brinco}</span>
                                    <span className="block text-xs capitalize text-gray-500 dark:text-gray-400">{child.tipo_animal}· {child.sexo === "F" ? "Fêmea" : "Macho"}· Nascimento {new Date(`${child.data_nascimento}T00:00:00`).toLocaleDateString("pt-BR")}</span>
                                    <span className="block text-[11px] text-blue-700 dark:text-blue-300">CDC: {child.cdc || "Não informado"}· CDN: {child.cdn || "Não informado"}</span>
                                </span>
                                <span
                                    className="shrink-0 text-right text-[11px] text-gray-500 dark:text-gray-400">
                                    <span className="block">{calcularIdadeFormatada(child.data_nascimento)}</span>
                                    <span className="block">{child.raca || "Raça N/I"}{child.peso_atual ? ` · ${child.peso_atual} kg` : ""}</span>
                                </span>
                            </button>))}
                        </div>
                        {childrenQuery.data?.source === "local" && <p className="text-[11px] text-amber-700 dark:text-amber-300">Exibindo filhos do cache local/offline.</p>}
                    </div>)}
                    {["matriz", "vaca", "novilha"].includes(selectedAnimal.tipo_animal) && (<div
                        className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800/40 space-y-4">
                        <h4
                            className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase">Ficha Reprodutiva</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p
                                    className="text-xs text-purple-600 dark:text-purple-400 uppercase font-semibold">Status Reprodutivo</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{selectedAnimal.status_reprodutivo || "N/I"}</p>
                            </div>
                            <div>
                                <p
                                    className="text-xs text-purple-600 dark:text-purple-400 uppercase font-semibold">Touro Cobertura</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{coveredBullLabel || "N/I"}</p>
                            </div>
                        </div>
                        {selectedAnimal.historico_toque && selectedAnimal.historico_toque.length > 0 && (<div className="pt-2 border-t border-purple-100 dark:border-purple-800/40">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Histórico de Toques (Diagnósticos)</p>
                            <div className="space-y-2">
                                {selectedAnimal.historico_toque.map((toq: RegistroToqueAno) => (<div
                                    key={toq.id}
                                    className="p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg flex justify-between items-center text-sm">
                                    <div>
                                        <span className="font-bold">{toq.ano}</span>- {new Date(toq.data + "T00:00:00").toLocaleDateString("pt-BR")}
                                        {toq.observacoes && <span className="block text-xs text-gray-500 mt-1">{toq.observacoes}</span>}
                                    </div>
                                    <Badge variant={toq.resultado === "cheia" ? "success" : "danger"}>
                                        {toq.resultado === "cheia" ? "Cheia" : "Vazia"}
                                    </Badge>
                                </div>))}
                            </div>
                        </div>)}
                    </div>)}
                    <div
                        className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Observações</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedAnimal.observacoes || "Nenhuma observação registrada."}</p>
                    </div>
                </div>) : (<>
                    <div className="mb-5">
                        <AnimalAvatar tipo={formData.tipo_animal} />
                    </div>
                    <form onSubmit={handleSave} className="space-y-5">
                        {}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Select
                                label="Sexo *"
                                id="sexo"
                                value={formData.sexo || "F"}
                                onChange={e => setFormData({
                                    ...formData,
                                    sexo: e.target.value as SexoAnimal
                                })}
                                options={[{
                                    label: "Fêmea",
                                    value: "F"
                                }, {
                                    label: "Macho",
                                    value: "M"
                                }]}
                                noMargin />
                            <Input
                                label="ID / Brinco *"
                                id="brinco"
                                value={formData.brinco || ""}
                                onChange={e => setFormData({
                                    ...formData,
                                    brinco: e.target.value
                                })}
                                placeholder="Ex: BR-0099"
                                maxLength={200}
                                required
                                noMargin />
                        </div>
                        {}
                        <div
                            className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/40 p-3.5 rounded-xl space-y-2.5">
                            <div
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <label
                                    htmlFor="tipo_cobertura"
                                    className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Tipo de Reprodução *
                                                    </label>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">Origem da concepção do animal</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    id="opcao_inseminacao"
                                    onClick={() => setFormData({
                                        ...formData,
                                        tipo_cobertura: "Inseminação"
                                    })}
                                    className={`py-2.5 px-4 rounded-lg text-sm font-semibold border flex items-center justify-center gap-2.5 transition-all cursor-pointer ${formData.tipo_cobertura === "Inseminação" || formData.tipo_cobertura === "Inseminacao" || formData.tipo_cobertura === "IATF" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-emerald-50/40 dark:hover:bg-gray-700/60"}`}>
                                    <span className="inline-flex items-center justify-center" aria-hidden="true">
                                        <InseminacaoIcon className="w-5 h-5 transition-transform group-hover:scale-105" />
                                    </span>
                                    <span>Inseminação</span>
                                </button>
                                <button
                                    type="button"
                                    id="opcao_monta_natural"
                                    onClick={() => setFormData({
                                        ...formData,
                                        tipo_cobertura: "Monta Natural"
                                    })}
                                    className={`py-2.5 px-4 rounded-lg text-sm font-semibold border flex items-center justify-center gap-2.5 transition-all cursor-pointer ${formData.tipo_cobertura === "Monta Natural" || formData.tipo_cobertura === "Monta" || !formData.tipo_cobertura ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-emerald-50/40 dark:hover:bg-gray-700/60"}`}>
                                    <span className="inline-flex items-center justify-center" aria-hidden="true">
                                        <MontaNaturalIcon className="w-5 h-4 transition-transform group-hover:scale-105" />
                                    </span>
                                    <span>Monta Natural</span>
                                </button>
                            </div>
                            <Select
                                id="tipo_cobertura"
                                value={formData.tipo_cobertura === "IATF" ? "IATF" : formData.tipo_cobertura === "Inseminação" || formData.tipo_cobertura === "Inseminacao" ? "Inseminação" : "Monta Natural"}
                                onChange={e => setFormData({
                                    ...formData,
                                    tipo_cobertura: e.target.value as TipoCobertura
                                })}
                                options={[{
                                    label: "💉 Inseminação",
                                    value: "Inseminação"
                                }, {
                                    label: "⏱️ IATF (Inseminação em Tempo Fixo)",
                                    value: "IATF"
                                }, {
                                    label: "🌿 Monta Natural (Touro & Vaca a Campo)",
                                    value: "Monta Natural"
                                }]}
                                noMargin />
                        </div>
                        {}
                        <div
                            className="bg-gray-50/50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 p-4 rounded-xl space-y-3 col-span-1 sm:col-span-2">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Registro de Idade</label>
                                <div className="flex bg-gray-200/50 dark:bg-gray-800 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setIdadeMode("data")}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${idadeMode === "data" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>Data Exata
                                                          </button>
                                    <button
                                        type="button"
                                        onClick={() => setIdadeMode("meses")}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${idadeMode === "meses" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>Aproximada (Meses)
                                                          </button>
                                </div>
                            </div>
                            <div>
                                {idadeMode === "data" ? (<Input
                                    id="data_nascimento"
                                    type="date"
                                    value={formData.data_nascimento || ""}
                                    onChange={e => setFormData({
                                        ...formData,
                                        data_nascimento: e.target.value
                                    })}
                                    max={new Date().toISOString().split("T")[0]}
                                    noMargin
                                    hint={formData.data_nascimento ? `Idade atualizada: ${calcularIdadeFormatada(formData.data_nascimento)}` : ""} />) : (<Input
                                    id="idade_estimada"
                                    type="number"
                                    min={0}
                                    max={600}
                                    step={1}
                                    placeholder="Quantos meses o animal tem hoje?"
                                    onChange={e => {
                                        const rawValue = e.target.value;
                                        const meses = Number(rawValue);

                                        if (rawValue === "" || !Number.isInteger(meses) || meses < 0 || meses > 600) {
                                            setFormData({
                                                ...formData,
                                                data_nascimento: ""
                                            });

                                            return;
                                        }

                                        const d = new Date();
                                        d.setMonth(d.getMonth() - meses);

                                        setFormData({
                                            ...formData,
                                            data_nascimento: d.toISOString().split("T")[0]
                                        });
                                    }}
                                    noMargin
                                    hint={formData.data_nascimento ? `Data de nascimento calculada: ${new Date(formData.data_nascimento).toLocaleDateString("pt-BR")} (${calcularIdadeFormatada(formData.data_nascimento)})` : ""} />)}
                            </div>
                        </div>
                        {}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label
                                    htmlFor="tipo_animal_automatico"
                                    className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Animal (automático)
                                                    </label>
                                <div
                                    id="tipo_animal_automatico"
                                    className="flex min-h-[42px] items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                    aria-live="polite">
                                    {animalTypeLabels[formData.tipo_animal || "vaca"]}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Calculado pelo sexo, idade e informações reprodutivas.</p>
                            </div>
                            <Input
                                label="Raça"
                                id="raca"
                                value={formData.raca || ""}
                                onChange={e => setFormData({
                                    ...formData,
                                    raca: e.target.value
                                })}
                                placeholder="Ex: Nelore, Angus..."
                                maxLength={200} />
                            <Select
                                label="Categoria *"
                                id="categoria"
                                value={formData.categoria || "PA"}
                                onChange={e => setFormData({
                                    ...formData,
                                    categoria: e.target.value as CategoriaAnimal
                                })}
                                options={[{
                                    label: "PA – Puro por Avaliação",
                                    value: "PA"
                                }, {
                                    label: "PC – Puro por Cruzamento",
                                    value: "PC"
                                }, {
                                    label: "PO – Puro de Origem",
                                    value: "PO"
                                }, {
                                    label: "CO – Comum",
                                    value: "CO"
                                }]} />
                            <Select
                                label="Status do Animal *"
                                id="status"
                                value={formData.status || "ativo"}
                                onChange={e => setFormData({
                                    ...formData,
                                    status: e.target.value as StatusAnimal
                                })}
                                options={[{
                                    label: "Ativo",
                                    value: "ativo"
                                }, {
                                    label: "Descarte",
                                    value: "descarte"
                                }, {
                                    label: "Vendido",
                                    value: "vendido"
                                }, {
                                    label: "Morto",
                                    value: "morto"
                                }]} />
                            <Select
                                label="Pasto atual"
                                id="pasto_id"
                                value={selectedPastureId}
                                onChange={e => {
                                    const pastagem = pastagens.find(item => item.id === e.target.value);
                                    setFormData({
                                        ...formData,
                                        pasto_id: pastagem?.id || undefined,
                                        pasto_nome: pastagem?.nome_pasto || undefined,
                                    });
                                }}
                                options={[{
                                    label: "Sem pasto vinculado",
                                    value: ""
                                }, ...pastagens.map(pastagem => ({
                                    label: pastagem.nome_pasto,
                                    value: pastagem.id
                                }))]} />
                            <Input
                                label="Pelagem / Cor"
                                id="cor"
                                value={formData.cor || ""}
                                onChange={e => setFormData({
                                    ...formData,
                                    cor: e.target.value
                                })}
                                placeholder="Ex: Castanho, Vermelho, Preto"
                                maxLength={200} />
                            <Input
                                label="Peso Atual (kg)"
                                id="peso_atual"
                                type="number"
                                min={0}
                                max={5000}
                                step="0.1"
                                value={formData.peso_atual ?? ""}
                                onChange={e => setFormData({
                                    ...formData,
                                    peso_atual: Number(e.target.value)
                                })}
                                hint={formData.peso_atual && isPlausibleAnimalWeight(formData.peso_atual) ? "Atenção: este peso está fora da faixa usual. Confirme o valor antes de salvar." : "Use 0 somente quando o peso ainda não estiver informado."} />
                        </div>
                        {}
                        {formData.status === "descarte" && (<div
                            className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 space-y-2 mt-4">
                            <Input
                                label="Motivo do Descarte *"
                                id="motivo_descarte"
                                value={formData.motivo_descarte || ""}
                                onChange={e => setFormData({
                                    ...formData,
                                    motivo_descarte: e.target.value
                                })}
                                placeholder="Ex: Idade avançada, problema reprodutivo..."
                                maxLength={200} />
                            <Input
                                label="Data do Descarte"
                                id="data_descarte"
                                type="date"
                                value={formData.data_descarte || ""}
                                onChange={e => setFormData({
                                    ...formData,
                                    data_descarte: e.target.value
                                })}
                                min={formData.data_nascimento || undefined}
                                max={new Date().toISOString().split("T")[0]}
                                required />
                            <div
                                className="text-xs font-medium text-red-700 dark:text-red-300 flex justify-between items-center pt-1">
                                <span>Quantidade de animais descartados por este brinco:</span>
                                <span
                                    className="font-bold text-sm bg-red-100 dark:bg-red-900 text-red-950 dark:text-red-100 border border-red-300 dark:border-red-700 px-2.5 py-0.5 rounded-full">
                                    {formData.qtd_descartes_brinco || 1}
                                </span>
                            </div>
                        </div>)}
                        {}
                        {["bezerro", "bezerra"].includes(formData.tipo_animal) && (<div
                            className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-800/40 mt-4">
                            <div
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <h4
                                    className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide">Ficha de Filiação & Genealogia (Bezerro/a)
                                                      </h4>
                                <span
                                    className="text-[11px] font-medium text-blue-700 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/40 px-2 py-0.5 rounded">Genealogia ABCZ
                                                      </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <MaeSearchInput
                                    value={formData.mae_id}
                                    onChange={maeId => setFormData({
                                        ...formData,
                                        mae_id: maeId
                                    })}
                                    excludeId={selectedAnimal?.id}
                                    availableAnimals={animais} />
                                <Select
                                    label="Pai (animal de referência)"
                                    id="pai_id"
                                    value={formData.pai_id || ""}
                                    onChange={e => setFormData({
                                        ...formData,
                                        pai_id: e.target.value || undefined
                                    })}
                                    options={[{
                                        label: "Sem pai informado",
                                        value: ""
                                    }, ...animais.filter(
                                        a => ["touro", "novilho", "garrote", "bezerro"].includes(a.tipo_animal) && a.id !== selectedAnimal?.id
                                    ).map(a => ({
                                        label: `${a.brinco} - ${a.tipo_animal}`,
                                        value: a.id
                                    }))]} />
                            </div>
                            {}
                            <div
                                className="pt-3 border-t border-blue-100 dark:border-blue-800/40 space-y-2.5">
                                <div
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div>
                                        <h5
                                            className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>Registros Oficiais ABCZ (Associação Brasileira dos Criadores de Zebu)
                                                                  </h5>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Informe os números de cadastro de cobertura e de nascimento junto à ABCZ
                                                                  </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    <Input
                                        label="CDC - Cadastro de Cobertura (ABCZ)"
                                        id="cdc"
                                        value={formData.cdc || ""}
                                        onChange={e => setFormData({
                                            ...formData,
                                            cdc: e.target.value
                                        })}
                                        placeholder="Ex: CDC-123456"
                                        hint="Número do Cadastro de Cobertura emitido pela ABCZ"
                                        noMargin />
                                    <Input
                                        label="CDN - Cadastro de Nascimento (ABCZ)"
                                        id="cdn"
                                        value={formData.cdn || ""}
                                        onChange={e => setFormData({
                                            ...formData,
                                            cdn: e.target.value
                                        })}
                                        placeholder="Ex: CDN-987654"
                                        hint="Número do Cadastro de Nascimento emitido pela ABCZ"
                                        noMargin />
                                </div>
                            </div>
                        </div>)}
                        {}
                        {["matriz", "vaca", "novilha"].includes(formData.tipo_animal) && (<div
                            className="space-y-4 p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-800/40 mt-4">
                            <h4
                                className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase">Controle de Matriz Reprodutiva</h4>
                            {}
                            <Tabs
                                tabs={[{
                                    id: "cobertas",
                                    label: "Matrizes Cobertas"
                                }, {
                                    id: "paridas",
                                    label: "Matrizes Paridas"
                                }, {
                                    id: "solteiras",
                                    label: "Matrizes Solteiras"
                                }, {
                                    id: "toque",
                                    label: "Toque Ano a Ano"
                                }]}
                                activeTab={matrizTab}
                                onChange={t => setMatrizTab(t as MatrizTab)} />
                            {matrizTab === "cobertas" && (<div className="space-y-3 pt-2">
                                <TouroSearchInput
                                    value={formData.touro_cobertura}
                                    animais={animais}
                                    onChange={value => setFormData({
                                        ...formData,
                                        touro_cobertura: value
                                    })}
                                />
                                <Select
                                    label="Tipo de Cobertura"
                                    id="tipo_cobertura"
                                    value={formData.tipo_cobertura || "Monta"}
                                    onChange={e => setFormData({
                                        ...formData,
                                        tipo_cobertura: e.target.value as TipoCobertura
                                    })}
                                    options={[{
                                        label: "Monta Natural",
                                        value: "Monta"
                                    }, {
                                        label: "Inseminação Artificial",
                                        value: "Inseminacao"
                                    }, {
                                        label: "IATF",
                                        value: "IATF"
                                    }]} />
                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="text-xs py-1.5 px-3"
                                        loading={isSaving}>Salvar Cobertura e Animal
                                                              </Button>
                                </div>
                            </div>)}
                            {matrizTab === "paridas" && (<div className="space-y-3 pt-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Registre bezerros vinculados a esta matriz.
                                                        </p>
                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="text-xs py-1.5 px-3"
                                        icon={Activity}
                                        onClick={() => {
                                            if (slideMode === "create") {
                                                showToast("Salve a matriz antes de vincular bezerros.", "error");
                                                return;
                                            }

                                            setSlideOpen(false);

                                            setTimeout(() => {
                                                if (handleCreateFilho && selectedAnimal)
                                                    handleCreateFilho(selectedAnimal.id);
                                            }, 300);
                                        }}>Vincular Novo Bezerro</Button>
                                </div>
                            </div>)}
                            {matrizTab === "solteiras" && (<div className="space-y-3 pt-2 text-center py-4">
                                <Wheat className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p
                                    className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">Matriz não possui registros de cobertura ou prenhez no momento.
                                                        </p>
                                <div className="flex justify-center pt-2">
                                    <Button
                                        type="button"
                                        variant="danger"
                                        className="text-xs py-1.5 px-3"
                                        onClick={() => {
                                            setFormData({
                                                ...formData,
                                                status: "descarte"
                                            });

                                            showToast("Vaca marcada como Descarte.", "info");
                                            window.scrollTo(0, 0);
                                        }}>Encaminhar Vaca para Descarte
                                                              </Button>
                                </div>
                            </div>)}
                            {matrizTab === "toque" && (<div className="space-y-4 pt-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Histórico anual de diagnóstico de gestação.
                                                        </p>
                                {}
                                <div
                                    className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-100 dark:border-purple-800/40 space-y-3">
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">Lançar Exame de Toque Diagnóstico
                                                              </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Input
                                            label="Data do Toque *"
                                            id="toque_data"
                                            type="date"
                                            value={novoToqueData}
                                            max={new Date().toISOString().split("T")[0]}
                                            onChange={e => setNovoToqueData(e.target.value)} />
                                        <Input
                                            label="Número do Brinco"
                                            id="toque_brinco"
                                            value={formData.brinco || ""}
                                            disabled />
                                    </div>
                                    <div>
                                        <label
                                            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Resultado do Toque *
                                                                    </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setNovoToqueResultado("cheia")}
                                                className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center space-x-1 transition-all ${novoToqueResultado === "cheia" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}>
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>Cheia (Gestante)</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNovoToqueResultado("vazia")}
                                                className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center space-x-1 transition-all ${novoToqueResultado === "vazia" ? "bg-red-600 text-white border-red-600 shadow-sm" : "bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}>
                                                <X className="w-3.5 h-3.5" />
                                                <span>Vazia</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="w-full">
                                        <label
                                            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Observações do Exame
                                                                    </label>
                                        <textarea
                                            rows={2}
                                            value={novoToqueObs}
                                            onChange={e => setNovoToqueObs(e.target.value)}
                                            maxLength={2000}
                                            placeholder="Condição corporal, tamanho uterino..."
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleAddToque}
                                        className="w-full justify-center bg-purple-700 hover:bg-purple-800 text-white font-bold">Salvar Toque na Matriz
                                                              </Button>
                                </div>
                                {}
                                <div className="space-y-2 mt-4">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Histórico de Toques Ano a Ano ({(formData.historico_toque || []).length})
                                                              </span>
                                    {(formData.historico_toque || []).length === 0 ? (<div
                                        className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                        <Calendar className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Nenhum exame registrado</p>
                                    </div>) : (<div className="space-y-2">
                                        {(formData.historico_toque || []).map((toq: RegistroToqueAno) => (<div
                                            key={toq.id}
                                            className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div
                                                    className={`w-2 h-2 rounded-full ${toq.resultado === "cheia" ? "bg-emerald-500" : "bg-red-500"}`} />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                        {toq.ano}- <span className="font-medium">{new Date(toq.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                                                    </p>
                                                    {toq.observacoes && (<p
                                                        className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                                                        {toq.observacoes}
                                                    </p>)}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Badge variant={toq.resultado === "cheia" ? "success" : "danger"}>
                                                    {toq.resultado === "cheia" ? "Cheia" : "Vazia"}
                                                </Badge>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const historico = formData.historico_toque || [];
                                                        const updated = historico.filter((t: RegistroToqueAno) => t.id !== toq.id);

                                                        setFormData({
                                                            ...formData,
                                                            historico_toque: updated
                                                        });

                                                        showToast("Registro de toque removido.", "info");
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>))}
                                    </div>)}
                                </div>
                            </div>)}
                        </div>)}
                        <div className="w-full">
                            <label
                                htmlFor="observacoes"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações Adicionais
                                              </label>
                            <textarea
                                id="observacoes"
                                rows={3}
                                value={formData.observacoes || ""}
                                onChange={e => setFormData({
                                    ...formData,
                                    observacoes: e.target.value
                                })}
                                maxLength={2000}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Histórico sanitário, genética, observações de pasto..." />
                        </div>
                    </form>
                </>)}
            </SlidePanel>
            {}
        </>
    );
};