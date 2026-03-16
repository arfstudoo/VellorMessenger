
import React from 'react';

export const PrimeWatch: React.FC = () => {
  return (
    <svg width="100%" height="100%" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        {/* Полированная сталь */}
        <linearGradient id="steelCase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#ffffff' }} />
          <stop offset="30%" style={{ stopColor: '#cbd5e1' }} />
          <stop offset="60%" style={{ stopColor: '#64748b' }} />
          <stop offset="100%" style={{ stopColor: '#1e293b' }} />
        </linearGradient>

        {/* Кожа ремешка */}
        <linearGradient id="leatherBase" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#0a0a0a' }} />
          <stop offset="50%" style={{ stopColor: '#1c1c1c' }} />
          <stop offset="100%" style={{ stopColor: '#0a0a0a' }} />
        </linearGradient>

        {/* Текстура пор кожи */}
        <pattern id="leatherGrain" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill="white" opacity="0.07" />
        </pattern>

        {/* Фильтр глубины корпуса */}
        <filter id="caseShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="5" floodOpacity="0.6"/>
        </filter>
      </defs>

      {/* ГРУППА ЗУМА И ЛЕВИТАЦИИ (УВЕЛИЧЕН МАСШТАБ) */}
      <g style={{ transformOrigin: '250px 280px' }}>
        {/* SCALE INCREASED: 1.25 base, up to 1.5 */}
        <animateTransform attributeName="transform" type="scale" 
          values="1.25; 1.25; 1.5; 1.5; 1.25" 
          keyTimes="0; 0.33; 0.45; 0.8; 1" 
          dur="12s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1" />
        
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="0,0; 0,-20; 0,-10; 0,-10; 0,0" 
          keyTimes="0; 0.33; 0.45; 0.8; 1" 
          dur="12s" repeatCount="indefinite" />

        {/* Поворот для 3D ракурса */}
        <g transform="rotate(7, 250, 280)">
          
          {/* РЕМЕШОК С ДЕТАЛЯМИ */}
          <g>
            {/* Верх */}
            <path d="M200 110 Q250 30 300 110 L285 200 L215 200 Z" fill="url(#leatherBase)" stroke="#000" strokeWidth="0.5" />
            <path d="M200 110 Q250 30 300 110 L285 200 L215 200 Z" fill="url(#leatherGrain)" />
            <path d="M210 115 Q250 45 290 115 M225 195 L228 140 M272 195 L269 140" fill="none" stroke="#333" strokeWidth="2" strokeDasharray="4,2" />
            
            {/* Низ */}
            <path d="M215 350 L200 450 Q250 480 300 450 L285 350 Z" fill="url(#leatherBase)" stroke="#000" strokeWidth="0.5" />
            <path d="M215 350 L200 450 Q250 480 300 450 L285 350 Z" fill="url(#leatherGrain)" />
            <path d="M212 442 Q250 468 288 442 M228 355 L215 435 M272 355 L285 435" fill="none" stroke="#333" strokeWidth="2" strokeDasharray="4,2" />
          </g>

          {/* КОРПУС */}
          <g filter="url(#caseShadow)">
            <path d="M165 240 Q165 190 205 185 L295 185 Q335 190 335 240 L335 320 Q335 370 295 375 L205 375 Q165 370 165 320 Z" fill="url(#steelCase)" stroke="#334155" strokeWidth="0.5" />
            {/* Глянец на грани */}
            <path d="M172 240 Q172 196 205 192 L295 192 Q328 196 328 240" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="1.2" />
          </g>

          {/* КНОПКА ( Crown ) */}
          <g>
            <rect x="335" y="245" width="16" height="26" rx="5" fill="url(#steelCase)" stroke="#1e293b" />
            {/* Анимация нажатия на 4-й секунде */}
            <animateTransform attributeName="transform" type="translate" 
              values="0,0; 0,0; -6,0; -6,0; 0,0" 
              keyTimes="0; 0.35; 0.45; 0.8; 0.9" 
              dur="12s" repeatCount="indefinite" />
            <line x1="339" y1="248" x2="339" y2="268" stroke="black" opacity="0.2" />
          </g>
          <rect x="328" y="295" width="18" height="26" rx="5" fill="url(#steelCase)" stroke="#1e293b" />

          {/* БЕЗЕЛЬ И ЦИФЕРБЛАТ */}
          <circle cx="250" cy="280" r="88" fill="url(#steelCase)" stroke="#475569" strokeWidth="0.5" />
          <circle cx="250" cy="280" r="68" fill="#e5d5a9" stroke="#8d6e63" strokeWidth="1.5" />
          
          {/* ЧИСЛА 1-12 */}
          <g fontFamily="Verdana" fontSize="11" fill="#3e2723" fontWeight="bold" textAnchor="middle">
            <text x="250" y="226">12</text><text x="282" y="234">1</text><text x="306" y="256">2</text><text x="312" y="285">3</text>
            <text x="306" y="312">4</text><text x="282" y="335">5</text><text x="250" y="344">6</text><text x="218" y="335">7</text>
            <text x="194" y="312">8</text><text x="188" y="285">9</text><text x="194" y="256">10</text><text x="218" y="234">11</text>
          </g>

          {/* Метка 12 часов */}
          <line x1="250" y1="194" x2="250" y2="206" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />

          {/* СТРЕЛКИ (Нормальный ход -> Ускорение -> Возврат) */}
          <g transform="translate(250, 280)">
            {/* Секундная */}
            <g>
              <line x1="0" y1="15" x2="0" y2="-65" stroke="#ef4444" strokeWidth="1.5" />
              <circle r="3.5" fill="#ef4444" />
              {/* 0-24 градуса за 4 сек, затем 10 кругов, затем до 360 градусов */}
              <animateTransform attributeName="transform" type="rotate" 
                values="0; 24; 3624; 3624; 360" 
                keyTimes="0; 0.33; 0.7; 0.85; 1" 
                dur="12s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1" />
            </g>
            {/* Минутная */}
            <g>
              <path d="M-2.5 0 L0 -58 L2.5 0 Z" fill="#1a1a1a" />
              <animateTransform attributeName="transform" type="rotate" 
                values="0; 2; 722; 722; 0" 
                keyTimes="0; 0.33; 0.7; 0.85; 1" 
                dur="12s" repeatCount="indefinite" />
            </g>
          </g>

          {/* Блик на стекле */}
          <path d="M190 250 Q230 215 310 240" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="20" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
};
