import React from 'react';

interface InseminacaoIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  figureColor?: string;
}

/**
 * Ícone estilizado de Seringa / Inseminação,
 * reproduzindo fielmente a referência visual (seringa inclinada a 45° com agulha biselada,
 * cone, corpo graduado com êmbolo, aletas de apoio e haste do pistão).
 */
export const InseminacaoIcon: React.FC<InseminacaoIconProps> = ({
  className = 'w-5 h-5',
  figureColor,
  ...props
}) => {
  const color = figureColor || 'currentColor';

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      {/* Seringa orientada a 45° (da parte inferior esquerda para a superior direita) */}
      <g transform="rotate(45 50 50)" fill={color} stroke={color}>
        {/* --- 1. Agulha com ponta biselada --- */}
        {/* Ponta da agulha com corte biselado */}
        <polygon
          points="49,7 48.5,12 51.5,15 51.5,23 48.5,23 48.5,7"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />

        {/* --- 2. Cone / Encaixe da agulha (Hub cônico) --- */}
        <path
          d="M 44 33 C 46.5 28 47.5 24 47.5 23 L 52.5 23 C 52.5 24 53.5 28 56 33 Z"
          strokeWidth="0.5"
        />

        {/* --- 3. Cilindro da Seringa (Corpo transparente com paredes espessas) --- */}
        {/* Parede esquerda */}
        <rect x="38" y="33" width="3.8" height="36" rx="1" />
        {/* Parede direita */}
        <rect x="58.2" y="33" width="3.8" height="36" rx="1" />
        {/* Topo do cilindro (ombro horizontal) */}
        <rect x="38" y="32" width="24" height="3.2" rx="1" />

        {/* --- 4. Pistão / Êmbolo interno (Borracha vedadora escura) --- */}
        <rect x="41.5" y="47" width="17" height="12" rx="1" />

        {/* --- 5. Aletas de apoio para os dedos (Flange do cilindro) --- */}
        <rect x="29" y="67" width="42" height="4.5" rx="2" />

        {/* --- 6. Haste do êmbolo (Haste em cruz com trilhos) --- */}
        {/* Haste central */}
        <rect x="48.2" y="58" width="3.6" height="30" />
        {/* Trilhos laterais da haste entre a borracha e o apoio de dedo */}
        <rect x="43" y="58" width="2.4" height="10" />
        <rect x="54.6" y="58" width="2.4" height="10" />
        {/* Trilhos da haste abaixo da flange */}
        <rect x="43" y="71" width="2.6" height="17" />
        <rect x="54.4" y="71" width="2.6" height="17" />

        {/* --- 7. Botão / Disco de pressão do êmbolo (Polegar) --- */}
        <rect x="36" y="87" width="28" height="4.2" rx="1.8" />
      </g>
    </svg>
  );
};
