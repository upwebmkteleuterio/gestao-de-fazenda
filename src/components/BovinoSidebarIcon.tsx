import React from 'react';

interface BovinoSidebarIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Ícone estilizado de Silhueta Bovina para a barra lateral (Sidebar) e cabeçalhos,
 * proporcionalmente alinhado no grid óptico de 24x24px com fill dinâmico (currentColor),
 * reproduzindo fielmente a imagem de referência fornecida pelo usuário.
 */
export const BovinoSidebarIcon: React.FC<BovinoSidebarIconProps> = ({
  className = 'w-5 h-5',
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <path d="M 3.03 8.91 C 2.82 9.53 2.61 10.92 2.4 12.66 C 2.2 14.05 2.06 15.09 1.92 15.58 C 1.64 15.93 1.5 16.55 1.64 17.18 C 1.71 17.53 1.99 17.81 2.2 17.67 C 2.4 17.39 2.47 16.83 2.54 16.28 C 2.61 15.58 2.54 14.89 2.61 14.05 C 2.68 12.66 2.82 11.27 3.03 10.02 C 3.1 9.46 3.17 9.18 3.24 9.04 C 3.38 9.74 3.59 10.92 3.79 12.31 C 4 13.7 4.21 14.89 4.35 15.44 L 4.42 16.49 L 4.56 18.08 L 5.53 18.08 L 5.53 17.18 L 5.39 15.79 L 5.67 15.58 L 5.88 16.69 L 6.09 18.08 L 7.06 18.08 L 6.99 16.83 L 6.92 15.44 C 7.13 14.89 7.48 14.47 7.9 14.33 C 8.18 14.61 8.45 15.16 8.59 15.72 L 8.73 16 L 8.87 15.65 C 9.01 15.23 9.15 15.16 9.43 15.23 C 9.57 15.51 9.71 15.86 9.77 16.14 L 9.91 16 L 10.05 15.23 C 10.68 14.96 11.86 14.82 13.25 14.75 C 13.95 14.75 14.43 15.09 14.57 15.79 L 14.64 16.83 L 14.71 18.08 L 15.62 18.08 L 15.62 16.97 L 15.55 15.79 L 15.89 15.79 L 16.03 16.83 L 16.17 18.08 L 17.15 18.08 L 17.15 16.83 L 16.94 15.44 C 16.94 14.4 17.22 13.5 17.63 12.66 C 18.05 11.83 18.61 11.13 19.3 10.71 C 20 10.3 20.9 10.16 21.67 10.09 C 22.08 10.02 22.5 9.74 22.43 9.32 C 22.29 8.84 21.67 8.49 20.97 8.21 C 20.21 7.93 19.72 7.58 19.51 7.24 C 19.65 6.89 19.86 6.54 20.14 6.12 C 20 6.12 19.72 6.54 19.44 6.96 C 19.23 6.54 19.02 6.19 18.75 5.92 C 18.68 5.99 18.61 6.4 18.68 6.89 C 18.19 6.96 17.63 7.1 17.22 7.38 C 16.94 7.58 17.22 7.93 17.49 8.07 C 17.77 8.21 18.05 8.21 18.33 8.21 C 17.42 8.35 16.38 8.49 15.34 8.56 C 13.25 8.63 11.17 8.7 9.43 8.7 C 7.69 8.63 5.95 8.56 4.7 8.63 C 3.86 8.7 3.31 8.77 3.03 8.91 Z" />
    </svg>
  );
};
