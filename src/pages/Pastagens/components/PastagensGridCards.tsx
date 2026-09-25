import React from 'react';
import { AlertCircle, AlertTriangle, ChevronRight, CloudUpload, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Pastagem } from '@/types/database';
import { checkSaidaVencida, calcularStatusLotacao } from '../utils/pastagemUtils';

interface PastagensGridCardsProps {
  pastagens: Pastagem[];
  isLoading: boolean;
  onOpenDetails: (pasto: Pastagem) => void;
}

export const PastagensGridCards: React.FC<PastagensGridCardsProps> = ({
  pastagens,
  isLoading,
  onOpenDetails,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-44 bg-gray-100 dark:bg-gray-800/60 rounded-xl animate-pulse p-5 space-y-3"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {pastagens.map((pasto) => {
        const isVencida = checkSaidaVencida(pasto.data_saida_prevista);
        const { qtd, max, percentual, isExcedido } = calcularStatusLotacao(
          pasto.qtd_animais,
          pasto.lotacao_maxima
        );

        return (
          <div
            key={pasto.id}
            onClick={() => onOpenDetails(pasto)}
            className={`group cursor-pointer rounded-xl bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-lg border transition-all duration-200 relative overflow-hidden ${
              isVencida || isExcedido
                ? 'border-red-300 dark:border-red-800/80 hover:border-red-500'
                : 'border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500'
            }`}
          >
            {/* Alerta banner no topo se vencida */}
            {isVencida && (
              <div className="absolute top-0 inset-x-0 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider py-0.5 text-center flex items-center justify-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>ALERTA: Data de Saída Vencida</span>
              </div>
            )}

            <div className={isVencida ? 'pt-2' : ''}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                    {pasto.nome_pasto}
                    {pasto.syncStatus === 'pending' && (
                      <Badge variant="warning" className="px-1.5 py-0" title="Alteração pendente de sincronização">
                        <CloudUpload className="w-3 h-3" />
                      </Badge>
                    )}
                    {pasto.syncStatus === 'processing' && (
                      <Badge variant="info" className="px-1.5 py-0" title="Sincronização em andamento">
                        <RefreshCw className="w-3 h-3" />
                      </Badge>
                    )}
                    {pasto.syncStatus === 'error' && (
                      <Badge variant="danger" className="px-1.5 py-0" title={pasto.syncError || 'Erro de sincronização'}>
                        <AlertCircle className="w-3 h-3" />
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {pasto.tipo_capim} &middot; {pasto.area_ha} ha
                  </p>
                </div>

                <Badge variant={qtd === 0 ? 'neutral' : isExcedido ? 'danger' : 'success'}>
                  {qtd === 0 ? 'Vazio' : isExcedido ? 'Excedido' : 'Normal'}
                </Badge>
              </div>

              {/* Status Lotação */}
              <div className="space-y-1 my-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-500 dark:text-gray-400">Lotação Atual:</span>
                  <span
                    className={
                      isExcedido
                        ? 'text-red-600 dark:text-red-400 font-bold'
                        : 'text-gray-900 dark:text-gray-100'
                    }
                  >
                    {qtd} / {max} cabeças
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isExcedido ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, percentual)}%` }}
                  />
                </div>
              </div>

              {/* Datas */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block">Entrada:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {pasto.data_entrada || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Saída Prevista:</span>
                  <span
                    className={`font-medium ${
                      isVencida
                        ? 'text-red-600 font-bold dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {pasto.data_saida_prevista || 'Não informada'}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-right">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline inline-flex items-center">
                  Gerenciar Piquete <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
