
import React from 'react';

export const CosmicPot: React.FC = () => {
  return (
    <svg width="100%" height="100%" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" fill="none" className="w-full h-full">
      <defs>
        {/* Материал: Глубокий зеркальный обсидиан */}
        <linearGradient id="obsidianDeep" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#334155' }} />
          <stop offset="50%" style={{ stopColor: '#020617' }} />
          <stop offset="100%" style={{ stopColor: '#1e293b' }} />
        </linearGradient>

        {/* Улучшенный тонкий блик (без серых блоков) */}
        <linearGradient id="refinedShine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="45%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity="0.4" />
          <stop offset="55%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Свечение (Bloom) */}
        <filter id="premiumGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Маска, чтобы блик не вылетал за пределы котла */}
        <clipPath id="cauldronShape">
          <path d="M150 220 Q150 380 250 380 Q350 380 350 220 L360 210 Q375 190 250 190 Q125 190 140 210 Z" />
        </clipPath>
      </defs>

      {/* Мягкая тень под объектом */}
      <ellipse cx="250" cy="440" rx="70" ry="15" fill="black" opacity="0.3">
        <animate attributeName="rx" values="70;55;70" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="4s" repeatCount="indefinite" />
      </ellipse>

      {/* ГРУППА АНИМАЦИИ ОБЪЕКТА (УВЕЛИЧЕН МАСШТАБ) */}
      <g style={{ transformOrigin: '250px 250px' }}>
        {/* SCALE INCREASED HERE: 1.1 to 1.3 */}
        <animateTransform attributeName="transform" type="scale" 
           values="1.15; 1.15; 1.35; 1.35; 1.15" 
           keyTimes="0; 0.35; 0.5; 0.85; 1" 
           dur="12s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1" />

        <g>
          <animateTransform attributeName="transform" type="translate" 
            values="0,0; 0,-25; 0,0" dur="4s" repeatCount="indefinite" 
            calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />

          {/* КОРПУС И БЛИКИ (Внутри маски) */}
          <g clipPath="url(#cauldronShape)">
            {/* Само тело котла */}
            <path d="M150 220 Q150 380 250 380 Q350 380 350 220 L360 210 Q375 190 250 190 Q125 190 140 210 Z" 
              fill="url(#obsidianDeep)" stroke="#475569" strokeWidth="1" />
            
            {/* Анимированный блик */}
            <rect x="0" y="0" width="1000" height="500" fill="url(#refinedShine)">
              <animateTransform attributeName="transform" type="translate" from="-500,0" to="500,0" dur="4s" repeatCount="indefinite" />
            </rect>
            
            {/* Магическая руна */}
            <path d="M242 335 L250 327 L258 335 L250 343 Z" fill="none" strokeWidth="2" filter="url(#premiumGlow)">
              <animate attributeName="stroke" values="#7c3aed;#06b6d4;#10b981;#f59e0b;#7c3aed" dur="10s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
            </path>
          </g>

          {/* ВНУТРЕННЯЯ ЧАСТЬ (ГОРЛЫШКО И ВОДА) */}
          <clipPath id="innerPotClip">
            <path d="M165 225 Q165 370 250 370 Q335 370 335 225 Z" />
          </clipPath>

          <g clipPath="url(#innerPotClip)">
            {/* Жидкость */}
            <rect x="100" y="210" width="300" height="200">
              <animate attributeName="fill" values="#7c3aed;#06b6d4;#10b981;#f59e0b;#7c3aed" dur="10s" repeatCount="indefinite" />
            </rect>
            {/* Пузырьки */}
            <circle cx="220" cy="350" r="4" fill="white" opacity="0.3">
              <animate attributeName="cy" values="370;210" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* ГОРЛЫШКО (Создает эффект глубины) */}
          <ellipse cx="250" cy="205" rx="105" ry="20" fill="#020617" stroke="#334155" strokeWidth="1" />
          <ellipse cx="250" cy="202" rx="112" ry="24" fill="none" stroke="#475569" strokeWidth="2" />

          {/* ЭФФЕКТ МАГИЧЕСКОГО ПАРА */}
          <ellipse cx="250" cy="208" rx="85" ry="12" fill="white" opacity="0.1" filter="url(#premiumGlow)">
            <animate attributeName="opacity" values="0.05;0.2;0.05" dur="3s" repeatCount="indefinite" />
            <animate attributeName="fill" values="#7c3aed;#06b6d4;#f59e0b;#7c3aed" dur="10s" repeatCount="indefinite" />
          </ellipse>

          {/* ГЛАЗ (Центр) */}
          <g transform="translate(250, 260)">
            <circle r="38" fill="white" filter="url(#premiumGlow)" />
            <g>
              <circle r="20" fill="#020617" />
              <circle r="9">
                <animate attributeName="fill" values="#7c3aed;#06b6d4;#10b981;#f59e0b;#7c3aed" dur="10s" repeatCount="indefinite" />
              </circle>
              <circle cx="-7" cy="-7" r="5" fill="white" opacity="0.8" />
              <animateTransform attributeName="transform" type="translate" 
                values="-4,-2; 4,2; 0,5; -4,-2" dur="6s" repeatCount="indefinite" />
            </g>
          </g>

          {/* МАГИЧЕСКИЕ ЧАСТИЦЫ */}
          <g filter="url(#premiumGlow)">
            <path d="M0 -10 L2 -2 L10 0 L2 2 L0 10 L-2 2 L-10 0 L-2 -2 Z" opacity="0">
              <animate attributeName="fill" values="#f0abfc;#67e8f9;#fcd34d;#f0abfc" dur="10s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="250,195; 170,70" dur="2.5s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="rotate" additive="sum" from="0" to="360" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" />
            </path>
            <path d="M0 -8 L1.5 -1.5 L8 0 L1.5 1.5 L0 8 L-1.5 1.5 L-8 0 L-1.5 -1.5 Z" opacity="0">
              <animate attributeName="fill" values="#7c3aed;#06b6d4;#f59e0b;#7c3aed" dur="10s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="250,195; 330,90" dur="3.2s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="rotate" additive="sum" from="0" to="-360" dur="3.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0" dur="3.2s" repeatCount="indefinite" />
            </path>
          </g>
        </g>
      </g>
    </svg>
  );
};
