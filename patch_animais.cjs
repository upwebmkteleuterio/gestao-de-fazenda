const fs = require('fs');

const path = 'src/pages/Animais.tsx';
let content = fs.readFileSync(path, 'utf8');

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
console.log('Animais.tsx slide patched!');
