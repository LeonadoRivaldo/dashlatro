# Dashlatro

Aplicação web para acompanhar runs de Balatro com foco em:

- geração de run atual (deck + stake)
- registro de vitória e derrota
- histórico por usuário
- win rate, ranking e win streak (atual e melhor)
- sincronização opcional de eventos vindos do mod

## Stack

- Angular 21 (standalone components + signals)
- AngularFire + Firebase Firestore
- Bootstrap 5 + SCSS
- ngx-translate para i18n

## Funcionalidades

- Login com Google
- Card de Win Rate com mini métricas de Wins, Losses e Win Streak
- Controle de run atual
- Botões de resultado com comportamento visual unificado
- Ranking por combinação deck/stake
- Botão de reset de stats com confirmação do navegador
- Importação de eventos do mod (inbox) com deduplicação por runId

## Requisitos

- Node.js 22+
- npm 11+
- Projeto Firebase configurado

## Variáveis de ambiente

Edite o arquivo src/environments/environment.ts com os dados do seu projeto Firebase.

Campos esperados:

- apiKey
- authDomain
- projectId
- storageBucket
- messagingSenderId
- appId

## Rodando localmente

1. Instale as dependências:

	 npm ci

2. Inicie o ambiente de desenvolvimento:

	 npm run start

3. Abra no navegador:

	 http://localhost:4200/

## Scripts úteis

- npm run start: sobe o servidor local
- npm run build: build de produção
- npm run watch: build em modo watch
- npm run test: testes

## Estrutura resumida

- src/app/dashboard.page.*: tela principal e métricas
- src/app/login.page.*: autenticação
- src/app/stats.service.ts: persistência de stats e importação de eventos
- src/app/stats.model.ts: modelos de dados
- src/app/shared/components/app-button.component.*: botão reutilizável com variantes
- public/: assets estáticos (brand, decks, flags, stakes, i18n)

## Modelo de stats por usuário

Coleção principal:

- userStats/{uid}

Campos principais:

- history: lista de partidas (deck, stake, result, playedAt)
- currentPlaying: run atual
- winStreak:
	- current
	- best
- processedRunIds: controle de deduplicação para eventos de mod

## Deploy no GitHub Pages

Workflow já incluído em:

- .github/workflows/deploy-pages.yml

Como publicar:

1. Faça push para a branch main.
2. No GitHub, vá em Settings > Pages.
3. Em Source, selecione GitHub Actions.
4. Aguarde o job Deploy Dashlatro to GitHub Pages terminar.

URL esperada:

https://leonadorivaldo.github.io/dashlatro/

## Troubleshooting

- Push rejeitado no primeiro envio:
	- confirme remote, branch e commit inicial
- Página em branco no Pages:
	- valide base href de build para /dashlatro/
- Rotas quebrando no refresh:
	- confirme geração de 404.html a partir de index.html no workflow

## Roadmap curto

- filtros avançados por deck/stake/data
- export/import de histórico
- métricas adicionais por stake
- ajustes finos de UX mobile

## Licença

Defina a licença que deseja usar (MIT, Apache-2.0, etc.) e adicione o arquivo LICENSE no repositório.
