
import React from 'react';

export const CipherBlade: React.FC = () => {
  return (
    <svg width="100%" height="100%" viewBox="0 0 600 900" xmlns="http://www.w3.org/2000/svg" fill="none" className="w-full h-full">
      <defs>
        {/* Металл: Зеркальный обсидиан (Максимальная детализация) */}
        <linearGradient id="obsidianMirror" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#94a3b8' }} />
          <stop offset="20%" style={{ stopColor: '#1e293b' }} />
          <stop offset="50%" style={{ stopColor: '#0f172a' }} />
          <stop offset="80%" style={{ stopColor: '#020617' }} />
          <stop offset="100%" style={{ stopColor: '#1e293b' }} />
        </linearGradient>

        {/* Динамический цвет луча */}
        <linearGradient id="saberFlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#7c3aed">
            <animate attributeName="stopColor" 
              values="#7c3aed; #00f2ff; #10b981; #f59e0b; #7c3aed" 
              dur="10s" repeatCount="indefinite" />
          </stop>
        </linearGradient>

        {/* Золото высокой пробы (Royal Gold) */}
        <linearGradient id="goldLuxe" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#fef3c7' }} />
          <stop offset="50%" style={{ stopColor: '#fbbf24' }} />
          <stop offset="100%" style={{ stopColor: '#92400e' }} />
        </linearGradient>

        {/* HDR Bloom Filter */}
        <filter id="premiumBloom" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="14" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ГРУППА 1: МАСШТАБ (ЗУМ) (УВЕЛИЧЕН) */}
      <g style={{ transformOrigin: '300px 500px' }}>
        {/* SCALE INCREASED: 1.05 to 1.4 */}
        <animateTransform attributeName="transform" type="scale" 
          values="1.05; 1.05; 1.4; 1.4; 1.05" 
          keyTimes="0; 0.35; 0.5; 0.85; 1" 
          dur="12s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1" />

        {/* ГРУППА 2: ПАРЕНИЕ */}
        <g>
          <animateTransform attributeName="transform" type="translate" 
            values="0,0; 0,-25; 0,0" 
            dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1; 0.42 0 0.58 1" />

          {/* КИНЖАЛ (Cipher) */}
          <g transform="translate(300, 480) rotate(3)">
            
            {/* ЛЕЗВИЕ */}
            <g filter="url(#premiumBloom)">
              {/* Плазменная аура */}
              <path fill="url(#saberFlow)" opacity="0.95">
                <animate attributeName="d" 
                  values="M0 -30 Q30 0 0 240 Q-30 0 0 -30;
                          M0 -30 Q30 0 0 240 Q-30 0 0 -30;
                          M0 -30 Q50 20 0 350 Q-50 20 0 -30;
                          M0 -30 Q50 20 0 350 Q-50 20 0 -30;
                          M0 -30 Q30 0 0 240 Q-30 0 0 -30"
                  keyTimes="0; 0.35; 0.5; 0.85; 1"
                  dur="12s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1" />
              </path>
              {/* Ослепительный центр */}
              <path fill="white">
                 <animate attributeName="d" 
                  values="M0 -25 L4 10 L0 220 L-4 10 Z;
                          M0 -25 L4 10 L0 220 L-4 10 Z;
                          M0 -25 L8 20 L0 335 L-8 20 Z;
                          M0 -25 L8 20 L0 335 L-8 20 Z;
                          M0 -25 L4 10 L0 220 L-4 10 Z"
                  keyTimes="0; 0.35; 0.5; 0.85; 1"
                  dur="12s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1" />
                 <animate attributeName="opacity" values="1; 0.8; 1" dur="0.08s" repeatCount="indefinite" />
              </path>
            </g>

            {/* ГАРДА (Obsidian Guard) */}
            <g>
              <path d="M-95 -40 Q0 -80 95 -40 L105 -5 Q0 -50 -105 -5 Z" fill="url(#obsidianMirror)" stroke="#334155" strokeWidth="0.5" />
              <path d="M-80 -35 Q0 -65 80 -35" fill="none" stroke="url(#goldLuxe)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
              {/* Энергетический вырез */}
              <rect x="-18" y="-25" width="36" height="6" rx="2" fill="#020617" />
              <rect x="-14" y="-23" width="28" height="1.5" rx="0.5" fill="white" opacity="0.5" />
            </g>

            {/* РУКОЯТЬ (ПРЕМИАЛЬНЫЙ ДИЗАЙН БЕЗ ПАТТЕРНОВ) */}
            <g transform="translate(0, -10)">
              {/* Основной корпус */}
              <rect x="-32" y="-115" width="64" height="115" rx="20" fill="url(#obsidianMirror)" stroke="#475569" strokeWidth="0.5" />
              
              {/* Сегментированная обмотка (Отрисована векторами) */}
              <g fill="#0a0a0a" stroke="url(#goldLuxe)" strokeWidth="0.5">
                 <path d="M-28 -105 Q0 -108 28 -105 L28 -85 Q0 -82 -28 -85 Z" opacity="0.9" />
                 <path d="M-28 -80 Q0 -83 28 -80 L28 -60 Q0 -57 -28 -60 Z" opacity="0.9" />
                 <path d="M-28 -55 Q0 -58 28 -55 L28 -35 Q0 -32 -28 -35 Z" opacity="0.9" />
              </g>

              {/* Зеркальный блик на рукояти */}
              <path d="M-20 -110 Q-30 -55 -20 -20" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="8" strokeLinecap="round" />
            </g>

            {/* НАВЕРШИЕ (Crown Pommel - Финальный вариант) */}
            <g transform="translate(0, -125)">
              {/* Чаша */}
              <path d="M-45 0 Q-45 -35 0 -50 Q45 -35 45 0 L35 12 Q0 -5 -35 12 Z" fill="url(#obsidianMirror)" stroke="#334155" strokeWidth="0.5" />
              {/* Верхний золотой ободок */}
              <path d="M-30 -10 Q0 -35 30 -10" fill="none" stroke="url(#goldLuxe)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
              
              {/* Кристалл Бездны */}
              <circle cy="-25" r="18" filter="url(#premiumBloom)">
                 <animate attributeName="fill" 
                   values="#7c3aed; #00f2ff; #10b981; #f59e0b; #7c3aed" 
                   dur="10s" repeatCount="indefinite" />
                 <animate attributeName="r" values="18; 18; 23; 23; 18" keyTimes="0; 0.45; 0.52; 0.85; 1" dur="12s" repeatCount="indefinite" />
              </circle>
              {/* Внутренний блик кристалла */}
              <circle cx="-6" cy="-30" r="5" fill="white" opacity="0.4" />
            </g>

          </g>
        </g>
      </g>
    </svg>
  );
};
