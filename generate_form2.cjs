const fs = require('fs');

const newFormBlock = `
            {/* CAMPOS COMUNS (Todos os Animais) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <Input
                label="ID / Brinco *"
                id="brinco"
                value={formData.brinco || ''}
                onChange={(e) => setFormData({ ...formData, brinco: e.target.value })}
                placeholder="Ex: BR-0099"
                required
              />
              <Input
                label="Data de Nascimento"
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento || ''}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                hint={\`Idade estimada: \${calcularIdadeFormatada(formData.data_nascimento || '')}\`}
              />

              <Select
                label="Sexo *"
                id="sexo"
                value={formData.sexo || 'F'}
                onChange={(e) => setFormData({ ...formData, sexo: e.target.value as any })}
                disabled={formData.tipo_animal === 'vaca' || formData.tipo_animal === 'matriz' || formData.tipo_animal === 'touro'}
                options={[
                  { label: 'Fêmea', value: 'F' },
                  { label: 'Macho', value: 'M' },
                ]}
              />

              <Input
                label="Raça"
                id="raca"
                value={formData.raca || ''}
                onChange={(e) => setFormData({ ...formData, raca: e.target.value })}
                placeholder="Ex: Nelore, Angus..."
              />

              <Select
                label="Categoria *"
                id="categoria"
                value={formData.categoria || 'PA'}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                options={[
                  { label: 'PA - Puro por Cruza', value: 'PA' },
                  { label: 'PC - Puro por Cruza B', value: 'PC' },
                  { label: 'PO - Puro de Origem', value: 'PO' },
                  { label: 'CO - Controle de Origem', value: 'CO' },
                  { label: 'CE - Certificado Especial', value: 'CE' },
                  { label: 'LA - Livro Aberto', value: 'LA' },
                ]}
              />

              <Select
                label="Status do Animal *"
                id="status"
                value={formData.status || 'ativo'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                options={[
                  { label: 'Ativo', value: 'ativo' },
                  { label: 'Descarte', value: 'descarte' },
                  { label: 'Vendido', value: 'vendido' },
                  { label: 'Morto', value: 'morto' },
                ]}
              />

              <Input
                label="Pelagem / Cor"
                id="cor"
                value={formData.cor || ''}
                onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                placeholder="Ex: Castanho, Vermelho, Preto"
              />

              <Input
                label="Peso Atual (kg)"
                id="peso_atual"
                type="number"
                value={formData.peso_atual || ''}
                onChange={(e) => setFormData({ ...formData, peso_atual: Number(e.target.value) })}
              />
            </div>

            {/* Lógica de Descarte (Global para qualquer tipo de animal) */}
            {formData.status === 'descarte' && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 space-y-2 mt-4">
                <Input
                  label="Motivo do Descarte *"
                  id="motivo_descarte"
                  value={formData.motivo_descarte || ''}
                  onChange={(e) => setFormData({ ...formData, motivo_descarte: e.target.value })}
                  placeholder="Ex: Idade avançada, problema reprodutivo..."
                />
                <div className="text-xs font-medium text-red-700 dark:text-red-300 flex justify-between items-center pt-1">
                  <span>Quantidade de animais descartados por este brinco:</span>
                  <span className="font-bold text-sm bg-red-100 dark:bg-red-900 text-red-950 dark:text-red-100 border border-red-300 dark:border-red-700 px-2.5 py-0.5 rounded-full">
                    {formData.qtd_descartes_brinco || 1}
                  </span>
                </div>
              </div>
            )}

            {/* CONDICIONAL: SE BEZERRO/A */}
            {formData.tipo_animal === 'bezerro' && (
              <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-800/40 mt-4">
                <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase">Ficha de Filiação (Bezerro/a)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Mãe (Input Brinco/ID)"
                    id="mae_id"
                    value={formData.mae_id || ''}
                    onChange={(e) => setFormData({ ...formData, mae_id: e.target.value })}
                    placeholder="BR-0012"
                  />
                  <Input
                    label="Pai (Input Brinco/ID)"
                    id="pai_id"
                    value={formData.pai_id || ''}
                    onChange={(e) => setFormData({ ...formData, pai_id: e.target.value })}
                    placeholder="BR-0102"
                  />
                </div>
              </div>
            )}

            {/* CONDICIONAL: SE MATRIZ */}
            {formData.tipo_animal === 'matriz' && (
              <div className="space-y-4 p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-800/40 mt-4">
                <h4 className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase">Controle de Matriz Reprodutiva</h4>

                {/* Acordeões / Abas Internas Matriz */}
                <Tabs
                  tabs={[
                    { id: 'cobertas', label: 'Matrizes Cobertas' },
                    { id: 'paridas', label: 'Matrizes Paridas' },
                    { id: 'solteiras', label: 'Matrizes Solteiras' },
                    { id: 'toque', label: 'Toque Ano a Ano' },
                  ]}
                  activeTab={matrizTab}
                  onChange={(t) => setMatrizTab(t as any)}
                />

                {matrizTab === 'cobertas' && (
                  <div className="space-y-3 pt-2">
                    <Input
                      label="Touro Cobertura (Opcional)"
                      id="touro_cobertura"
                      value={formData.touro_cobertura || ''}
                      onChange={(e) => setFormData({ ...formData, touro_cobertura: e.target.value })}
                      placeholder="Ex: BR-0102"
                    />
                    <Select
                      label="Tipo de Cobertura"
                      id="tipo_cobertura"
                      value={formData.tipo_cobertura || 'Monta'}
                      onChange={(e) => setFormData({ ...formData, tipo_cobertura: e.target.value as any })}
                      options={[
                        { label: 'Monta Natural', value: 'Monta' },
                        { label: 'Inseminação Artificial', value: 'Inseminacao' },
                        { label: 'IATF', value: 'IATF' },
                      ]}
                    />
                    <div className="flex justify-end pt-2">
                      <Button type="button" variant="primary" className="text-xs py-1.5 px-3">
                        Salvar Cobertura
                      </Button>
                    </div>
                  </div>
                )}

                {matrizTab === 'paridas' && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Registre bezerros vinculados a esta matriz.
                    </p>
                    <div className="flex justify-end pt-2">
                      <Button type="button" variant="secondary" className="text-xs py-1.5 px-3" icon={Activity}>
                        Vincular Novo Bezerro
                      </Button>
                    </div>
                  </div>
                )}

                {matrizTab === 'solteiras' && (
                  <div className="space-y-3 pt-2 text-center py-4">
                    <Wheat className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">
                      Matriz não possui registros de cobertura ou prenhez no momento.
                    </p>
                    <div className="flex justify-center pt-2">
                      <Button type="button" variant="danger" className="text-xs py-1.5 px-3">
                        Encaminhar Vaca para Descarte
                      </Button>
                    </div>
                  </div>
                )}

                {matrizTab === 'toque' && (
                  <div className="space-y-4 pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Histórico anual de diagnóstico de gestação.
                    </p>

                    {/* Lançamento de Toque */}
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-100 dark:border-purple-800/40 space-y-3">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                        Lançar Exame de Toque Diagnóstico
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Data do Toque *"
                          id="toque_data"
                          type="date"
                          value={novoToqueData}
                          onChange={(e) => setNovoToqueData(e.target.value)}
                        />
                        <Input
                          label="Número do Brinco"
                          id="toque_brinco"
                          value={formData.brinco || ''}
                          disabled
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Resultado do Toque *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNovoToqueResultado('cheia')}
                            className={\`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center space-x-1 transition-all \${
                              novoToqueResultado === 'cheia'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                            }\`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Cheia (Gestante)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNovoToqueResultado('vazia')}
                            className={\`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center space-x-1 transition-all \${
                              novoToqueResultado === 'vazia'
                                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                            }\`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Vazia</span>
                          </button>
                        </div>
                      </div>

                      <div className="w-full">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Observações do Exame
                        </label>
                        <textarea
                          rows={2}
                          value={novoToqueObs}
                          onChange={(e) => setNovoToqueObs(e.target.value)}
                          placeholder="Condição corporal, tamanho uterino..."
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={() => {
                            if (!novoToqueData) return;
                            const ano = new Date(novoToqueData + 'T00:00:00').getFullYear();
                            const novoToque = {
                              id: \`toq-\${Date.now()}\`,
                              data: novoToqueData,
                              ano: isNaN(ano) ? new Date().getFullYear() : ano,
                              brinco: formData.brinco || 'N/A',
                              resultado: novoToqueResultado,
                              observacoes: novoToqueObs,
                            };
                            const historico = formData.historico_toque || [];
                            const updated = [novoToque, ...historico];
                            setFormData({
                              ...formData,
                              historico_toque: updated as any,
                              status_reprodutivo: novoToqueResultado === 'cheia' ? 'Gestante' : 'Vazia',
                            });
                            setNovoToqueData(new Date().toISOString().split('T')[0]);
                            setNovoToqueResultado('vazia');
                            setNovoToqueObs('');
                            showToast('Exame de toque registrado com sucesso!', 'success');
                        }}
                        className="w-full justify-center bg-purple-700 hover:bg-purple-800 text-white font-bold"
                      >
                        Salvar Toque na Matriz
                      </Button>
                    </div>

                    {/* Histórico Ano a Ano */}
                    <div className="space-y-2 mt-4">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                        Histórico de Toques Ano a Ano ({(formData.historico_toque || []).length})
                      </span>
                      {(formData.historico_toque || []).length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                          <Calendar className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">Nenhum exame registrado</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(formData.historico_toque || []).map((toq: any) => (
                            <div key={toq.id} className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={\`w-2 h-2 rounded-full \${toq.resultado === 'cheia' ? 'bg-emerald-500' : 'bg-red-500'}\`} />
                                <div>
                                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                    {toq.ano} - <span className="font-medium">{new Date(toq.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                  </p>
                                  {toq.observacoes && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                                      {toq.observacoes}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Badge variant={toq.resultado === 'cheia' ? 'success' : 'danger'}>
                                  {toq.resultado === 'cheia' ? 'Cheia' : 'Vazia'}
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => {
                                     const historico = formData.historico_toque || [];
                                     const updated = historico.filter((t: any) => t.id !== toq.id);
                                     setFormData({
                                       ...formData,
                                       historico_toque: updated,
                                     });
                                     showToast('Registro de toque removido.', 'info');
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
`;

let lines = fs.readFileSync('src/pages/Animais/components/AnimaisSlidePanel.tsx', 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('{/* CAMPOS COMUNS */}'));
const endIndex = lines.findIndex(l => l.includes('Observações Adicionais')) - 2;

lines.splice(startIndex, endIndex - startIndex, newFormBlock);

fs.writeFileSync('src/pages/Animais/components/AnimaisSlidePanel.tsx', lines.join('\n'));

