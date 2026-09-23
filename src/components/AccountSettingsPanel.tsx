import React, { useEffect, useState } from 'react';
import { LockKeyhole, Save, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useUIStore } from '@/store/useUIStore';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { SlidePanel } from '@/components/SlidePanel';

interface AccountSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const AccountSettingsPanel: React.FC<AccountSettingsPanelProps> = ({ isOpen, onClose }) => {
  const { session, role, displayName, isLoadingProfile, updateDisplayName } = useAuth();
  const {
    farmName,
    updateFarmName,
    isLoading: isLoadingFarmName,
    isUpdating: isUpdatingFarm,
  } = useAppSettings();
  const { showToast } = useUIStore();
  const [name, setName] = useState(displayName);
  const [farmNameDraft, setFarmNameDraft] = useState(farmName);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(displayName);
    setFarmNameDraft(farmName);
    setPassword('');
    setPasswordConfirmation('');
    setProfileError(null);
    setPasswordError(null);
  }, [displayName, farmName, isOpen]);

  const roleLabel = role === 'superadmin' ? 'Administrador' : 'Assistente';
  const isLoadingAccountData = isLoadingProfile || isLoadingFarmName;

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoadingAccountData) return;

    const nextName = name.trim();
    const nextFarmName = farmNameDraft.trim();

    if (!nextName) {
      setProfileError('Informe seu nome.');
      return;
    }
    if (role === 'superadmin' && !nextFarmName) {
      setProfileError('Informe o nome da fazenda.');
      return;
    }

    setProfileError(null);
    setIsSavingProfile(true);
    try {
      await updateDisplayName(nextName);
      if (role === 'superadmin' && updateFarmName) {
        await updateFarmName(nextFarmName);
      }
      showToast('Perfil e configurações salvos com sucesso.', 'success');
      onClose();
    } catch (error) {
      setProfileError(getErrorMessage(error, 'Não foi possível salvar as alterações.'));
      showToast('Não foi possível salvar as alterações.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoadingAccountData) return;

    setPasswordError(null);

    if (!password) {
      setPasswordError('Informe uma nova senha.');
      return;
    }
    if (password !== passwordConfirmation) {
      setPasswordError('As senhas precisam ser iguais.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setPasswordConfirmation('');
      showToast('Senha atualizada com sucesso.', 'success');
    } catch (error) {
      setPasswordError(getErrorMessage(error, 'Não foi possível atualizar a senha.'));
      showToast('Não foi possível atualizar a senha.', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações da conta"
      subtitle="Atualize seus dados de acesso e da fazenda"
      width="md"
      actions={
        <Button variant="ghost" onClick={onClose} disabled={isSavingProfile || isSavingPassword}>
          Fechar
        </Button>
      }
    >
      <div className="space-y-8">
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
            <UserRound className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Perfil</h3>
          </div>

          <Input
            id="account-display-name"
            label="Nome"
            value={isLoadingProfile ? '' : name}
            onChange={(event) => setName(event.target.value)}
            error={profileError ?? undefined}
            autoComplete="name"
            disabled={isLoadingProfile}
          />
          <Input
            id="account-email"
            label="E-mail"
            value={session?.user.email ?? ''}
            readOnly
            autoComplete="email"
          />
          <Input
            id="account-role"
            label="Papel"
            value={roleLabel}
            readOnly
          />

          {role === 'superadmin' && (
            <Input
              id="account-farm-name"
              label="Nome da fazenda"
              value={isLoadingFarmName ? '' : farmNameDraft}
              onChange={(event) => setFarmNameDraft(event.target.value)}
              disabled={isLoadingFarmName}
            />
          )}

          <Button
            type="submit"
            variant="primary"
            icon={Save}
            disabled={isSavingProfile || isUpdatingFarm || isLoadingAccountData}
            className="w-full justify-center"
          >
            {isSavingProfile ? 'Salvando...' : 'Salvar perfil e fazenda'}
          </Button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-800">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
            <LockKeyhole className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Trocar senha</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">A senha só é enviada quando os dois campos forem preenchidos e confirmados.</p>
          <Input
            id="account-password"
            label="Nova senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            error={passwordError ?? undefined}
          />
          <Input
            id="account-password-confirmation"
            label="Confirmar nova senha"
            type="password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            autoComplete="new-password"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={isSavingPassword || isLoadingAccountData}
            className="w-full justify-center"
          >
            {isSavingPassword ? 'Atualizando...' : 'Atualizar senha'}
          </Button>
        </form>
      </div>
    </SlidePanel>
  );
};
