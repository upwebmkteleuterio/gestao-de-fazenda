const fs = require('fs');

const path = 'src/pages/Animais.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add missing state variables if they are missing
if (!content.includes('const [isSaving, setIsSaving]')) {
  content = content.replace(
    "const [matrizTab, setMatrizTab]",
    "const [isSaving, setIsSaving] = useState(false);\n  const [matrizTab, setMatrizTab]"
  );
}

if (!content.includes('const handleAddToque')) {
  content = content.replace(
    "const handleSave = async",
    `const handleAddToque = () => {
    if (!novoToqueData || !novoToqueResultado) return;
    const novo = {
      id: Math.random().toString(36).substr(2, 9),
      data: novoToqueData,
      ano: parseInt(novoToqueData.split('-')[0]),
      resultado: novoToqueResultado as any,
      observacoes: novoToqueObs
    };
    setFormData(prev => ({
      ...prev,
      historico_toque: [...(prev.historico_toque || []), novo]
    }));
    setNovoToqueData(new Date().toISOString().split('T')[0]);
    setNovoToqueObs('');
  };

  const handleRemoveToque = (id: string) => {
    setFormData(prev => ({
      ...prev,
      historico_toque: (prev.historico_toque || []).filter(t => t.id !== id)
    }));
  };

  const handleSave = async`
  );
}

// 2. Fix the AnimaisSlidePanel props to include all of them
const slideStart = '<AnimaisSlidePanel';
const slideEnd = '/>';
const startIdx = content.lastIndexOf(slideStart);
const endIdx = content.indexOf(slideEnd, startIdx) + slideEnd.length;

const slideNew = `<AnimaisSlidePanel
        animais={todosAnimais}
        handleCreateFilho={handleCreateFilho}
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedAnimal={selectedAnimal}
        formData={formData}
        setFormData={setFormData}
        handleSave={handleSave}
        matrizTab={matrizTab}
        setMatrizTab={setMatrizTab}
        novoToqueData={novoToqueData}
        setNovoToqueData={setNovoToqueData}
        novoToqueResultado={novoToqueResultado}
        setNovoToqueResultado={setNovoToqueResultado}
        novoToqueObs={novoToqueObs}
        setNovoToqueObs={setNovoToqueObs}
        handleAddToque={handleAddToque}
        handleRemoveToque={handleRemoveToque}
        isSaving={isSaving}
        calcularIdadeFormatada={calcularIdadeFormatada}
        showToast={showToast}
      />`;

content = content.slice(0, startIdx) + slideNew + content.slice(endIdx);

fs.writeFileSync(path, content);
console.log('Fixed Animais.tsx state and props');
