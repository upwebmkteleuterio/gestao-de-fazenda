const fs = require('fs');
const path = 'src/services/sanitarioService.ts';
let content = fs.readFileSync(path, 'utf8');

const oldUpdate = `        // Se alterou de 'andamento' para 'concluido', dispara baixa automática de estoque
        if (previous.status !== 'concluido' && updatedItem.status === 'concluido' && updatedItem.medicamentos.length > 0) {
          for (const med of updatedItem.medicamentos) {
            if (med.insumo_id && med.quantidade_total > 0) {
              await insumosService.registrarMovimentacao({
                insumo_id: med.insumo_id,
                nome_insumo: med.nome_produto,
                tipo: 'saida',
                quantidade: med.quantidade_total,
                data_movimento: updatedItem.data_manejo,
                origem_manejo_id: id,
                observacao: \`Baixa automática via Conclusão do Manejo Sanitário \${updatedItem.nome_lote}\`,
              });
            }
          }
        }`;

const newUpdate = `        // Se alterou de 'andamento' para 'concluido', dispara baixa automática de estoque
        if (previous.status !== 'concluido' && updatedItem.status === 'concluido' && updatedItem.medicamentos.length > 0) {
          for (const med of updatedItem.medicamentos) {
            if (med.insumo_id && med.quantidade_total > 0) {
              await insumosService.registrarMovimentacao({
                insumo_id: med.insumo_id,
                nome_insumo: med.nome_produto,
                tipo: 'saida',
                quantidade: med.quantidade_total,
                data_movimento: updatedItem.data_manejo,
                origem_manejo_id: id,
                observacao: \`Baixa automática via Conclusão do Manejo Sanitário \${updatedItem.nome_lote}\`,
              });
            }
          }
        } 
        // Se alterou de 'concluido' para 'andamento', reverte a baixa (rollback)
        else if (previous.status === 'concluido' && updatedItem.status !== 'concluido') {
          try {
            const rawMovs = localStorage.getItem('farmnexus_mov_insumos_db');
            if (rawMovs) {
              let movs = JSON.parse(rawMovs);
              const movsToDelete = movs.filter((mov: any) => mov.origem_manejo_id === id);
              
              const rawInsumos = localStorage.getItem('farmnexus_insumos_db');
              if (rawInsumos) {
                let insumos = JSON.parse(rawInsumos);
                // Rollback estoque
                for (const mDel of movsToDelete) {
                  const idx = insumos.findIndex((ins: any) => ins.id === mDel.insumo_id);
                  if (idx !== -1 && mDel.tipo === 'saida') {
                    insumos[idx].estoque_atual += mDel.quantidade;
                  }
                }
                localStorage.setItem('farmnexus_insumos_db', JSON.stringify(insumos));
              }
              
              // Remove as movimentações geradas por este manejo
              movs = movs.filter((mov: any) => mov.origem_manejo_id !== id);
              localStorage.setItem('farmnexus_mov_insumos_db', JSON.stringify(movs));
            }
          } catch(e) {
            console.error('Erro ao reverter movimentacoes', e);
          }
        }`;

content = content.replace(oldUpdate, newUpdate);
fs.writeFileSync(path, content);
