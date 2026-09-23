import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Switch } from '../components/Switch';
import { Table, Column } from '../components/Table';
import { Tabs } from '../components/Tabs';
import { SlidePanel } from '../components/SlidePanel';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';
import { Plus, Download, Scale, Heart, Shield, Sparkles } from 'lucide-react';

export const UIKitPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('botoes');
  const [switchVal, setSwitchVal] = useState(true);
  const [slideOpen, setSlideOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const sampleData = [
    { id: '1', brinco: 'BR-0001', raca: 'Nelore', peso: '520 kg', status: 'Ativo' },
    { id: '2', brinco: 'BR-0002', raca: 'Angus', peso: '480 kg', status: 'Descarte' },
  ];

  const sampleColumns: Column<any>[] = [
    { header: 'ID / Brinco', accessor: 'brinco', render: (r) => <span className="font-bold text-emerald-600">{r.brinco}</span> },
    { header: 'Raça', accessor: 'raca' },
    { header: 'Peso Atual', accessor: 'peso' },
    { header: 'Status', render: (r) => <Badge variant={r.status === 'Ativo' ? 'success' : 'danger'}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <Badge variant="success" className="mb-2">Design System UI Kit</Badge>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Catálogo de Componentes Visual</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Todos os elementos visuais reutilizáveis padronizados do sistema.
        </p>
      </div>

      <Tabs
        tabs={[
          { id: 'botoes', label: 'Botões & Badges' },
          { id: 'inputs', label: 'Inputs & Switches' },
          { id: 'cards', label: 'Cards & StatCards' },
          { id: 'modais', label: 'SlidePanel & Modais' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'botoes' && (
        <Card title="Botões & Badges">
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase font-bold text-gray-400 mb-3">Variantes de Botão</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" icon={Plus}>Botão Primário</Button>
                <Button variant="secondary" icon={Download}>Botão Secundário</Button>
                <Button variant="ghost">Botão Ghost</Button>
                <Button variant="danger" icon={Shield}>Botão Perigo / Excluir</Button>
                <Button variant="primary" loading>Carregando...</Button>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase font-bold text-gray-400 mb-3">Variantes de Badges</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">Sucesso / Ativo</Badge>
                <Badge variant="warning">Atenção / Pendente</Badge>
                <Badge variant="danger">Perigo / Descarte</Badge>
                <Badge variant="info">Informativo / IATF</Badge>
                <Badge variant="neutral">Neutro / PO</Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'inputs' && (
        <Card title="Formulários & Controles">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Input Texto Padrão" id="test1" placeholder="Digite aqui..." hint="Legenda de ajuda ao usuário" />
            <Select
              label="Select Dropdown"
              id="test2"
              options={[
                { label: 'Opção 01', value: '1' },
                { label: 'Opção 02', value: '2' },
              ]}
            />
            <div className="flex items-center space-x-3 pt-2">
              <Switch checked={switchVal} onChange={setSwitchVal} label="Switch Alternador" />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'cards' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Total Animais" value="1.240" icon={Scale} trend="up" trendValue="+12.5%" subtitle="Cabeças Ativas" />
            <StatCard title="Taxa Prenhez" value="74%" icon={Heart} trend="up" trendValue="Meta Atingida" />
            <StatCard title="Custo/Cabeça" value="R$ 82,50" icon={Sparkles} trend="down" trendValue="-R$ 3,20" />
          </div>

          <Card title="Exemplo de Tabela Padrão UI Kit">
            <Table columns={sampleColumns} data={sampleData} />
          </Card>
        </div>
      )}

      {activeTab === 'modais' && (
        <Card title="Modais & Painéis Deslizantes">
          <div className="flex space-x-4">
            <Button variant="primary" onClick={() => setSlideOpen(true)}>Demonstrar Slide Panel</Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>Demonstrar Modal Confirmação</Button>
            <Button variant="ghost" onClick={() => setToastVisible(true)}>Demonstrar Toast Feedback</Button>
          </div>
        </Card>
      )}

      <SlidePanel
        isOpen={slideOpen}
        onClose={() => setSlideOpen(false)}
        title="Slide Panel (Gaveta Lateral)"
        subtitle="Usado para cadastros completos e edições sem perder o contexto da tabela"
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Conteúdo do Slide Panel com animação fluida e fundo escurecido.
        </p>
      </SlidePanel>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Modal de Confirmação"
        actions={
          <>
            <Button variant="primary" onClick={() => setModalOpen(false)}>Confirmar</Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
          </>
        }
      >
        <p>Tem certeza de que deseja executar esta ação?</p>
      </Modal>

      {toastVisible && (
        <Toast
          message="Ação executada com sucesso! Notificação visual de feedback."
          type="success"
          onClose={() => setToastVisible(false)}
        />
      )}
    </div>
  );
};
