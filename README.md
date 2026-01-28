# App Escalas

PWA gerador de escalas de missa baseado em Vite + React + TypeScript.

## Principais recursos

- Geração anual base com rotação contínua de ministérios e regra especial para o 5º domingo.
- Calendário mensal com edição rápida (modal) e armazenamento de exceções via localStorage.
- Visual Card de Escala com exportação em PNG usando html-to-image.
- Sessão de configurações para ajustar ministérios, dias ativos, ano e ministério do 5º domingo.
- Backup com importação/exportação de JSON e persistência offline via vite-plugin-pwa.

## Scripts úteis

- npm install – instala dependências.
- npm run dev – inicia o servidor de desenvolvimento com suporte PWA.
- npm run build – compila o app e gera o service worker + manifest.
- npm run test – executa os testes unitários do gerador de escalas (vitest).

## Estrutura relevante

- src/domain/scheduleGenerator.ts – lógica base para a rota de ministérios e 5º domingo.
- src/domain/exceptionsStore.ts – persistência e merge de exceções.
- src/pages/AppTabs.tsx – interface com tabs, calendário, card e configurações.
- src/components/MonthlyCalendar.tsx, ScaleCard.tsx, EditEventDrawer.tsx – UI central.

## Observações

- O PWA registra o service worker automaticamente durante o build (vite-plugin-pwa).
- As configurações padrão incluem os ministérios solicitados e o ministério fixo do 5º domingo.
# Escalas-de-Missa
