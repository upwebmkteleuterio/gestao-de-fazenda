import React from 'react';

interface MontaNaturalIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  figureColor?: string;
}

/**
 * Ícone estilizado da Vaca Leiteira para Monta Natural,
 * reproduzindo fielmente a silhueta bovina da imagem enviada pelo usuário
 * (perfil lateral voltado para a direita com chifres, orelha, chanfro, barbela/peito largo,
 * aprumos/cascos, úbere com tetos e cauda com penacho).
 */
export const MontaNaturalIcon: React.FC<MontaNaturalIconProps> = ({
  className = 'w-5 h-4',
  figureColor,
  ...props
}) => {
  const color = figureColor || 'currentColor';

  return (
    <svg
      viewBox="0 0 325 195"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      {/* 
        Silhueta de alta precisão da vaca leiteira/bovina,
        reproduzindo com fidelidade o contorno anatômico fornecido na imagem de referência:
        - Chifres curvos e orelha atenta
        - Focinho e queixo delineados
        - Peito/barbela profundo
        - Aprumos dianteiros e traseiros com cascos firmes
        - Úbere com tetos visíveis
        - Cauda pendente com penacho e abertura natural em relação ao quarto traseiro
        - Linha de dorso e garupa harmoniosa
      */}
      <path
        d="M 32 53 C 29 62 26 82 23 107 C 20 127 18 142 16 149 C 12 154 10 163 12 172 C 13 177 17 181 20 179 C 23 175 24 167 25 159 C 26 149 25 139 26 127 C 27 107 29 87 32 69 C 33 61 34 57 35 55 C 37 65 40 82 43 102 C 46 122 49 139 51 147 L 52 162 L 54 185 L 68 185 L 68 172 L 66 152 L 70 149 L 73 165 L 76 185 L 90 185 L 89 167 L 88 147 C 91 139 96 133 102 131 C 106 135 110 143 112 151 L 114 155 L 116 150 C 118 144 120 143 124 144 C 126 148 128 153 129 157 L 131 155 L 133 144 C 142 140 159 138 179 137 C 189 137 196 142 198 152 L 199 167 L 200 185 L 213 185 L 213 169 L 212 152 L 217 152 L 219 167 L 221 185 L 235 185 L 235 167 L 232 147 C 232 132 236 119 242 107 C 248 95 256 85 266 79 C 276 73 289 71 300 70 C 306 69 312 65 311 59 C 309 52 300 47 290 43 C 279 39 272 34 269 29 C 271 24 274 19 278 13 C 276 13 272 19 268 25 C 265 19 262 14 258 10 C 257 11 256 17 257 24 C 250 25 242 27 236 31 C 232 34 236 39 240 41 C 244 43 248 43 252 43 C 239 45 224 47 209 48 C 179 49 149 50 124 50 C 99 49 74 48 56 49 C 44 50 36 51 32 53 Z"
      />
    </svg>
  );
};
