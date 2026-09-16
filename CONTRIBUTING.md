# Como contribuir com o SatBlocks

## Regra principal: tudo fica dentro deste repositório

O SatBlocks é um fork do [BIPES](https://github.com/BIPES/BIPES), mas evoluiu para um projeto próprio da OBSAT, com seu próprio catálogo de blocos, placas e fluxo de trabalho. **Todo o desenvolvimento acontece dentro de `obsat-oficial/satblocks`** — não enviamos Pull Requests para o BIPES/BIPES original.

### ⚠️ Cuidado com o botão "Compare & pull request"

Como este repositório é tecnicamente um fork do GitHub, a própria interface do GitHub costuma mostrar um botão de atalho **"Compare & pull request"** ou **"Contribute"** sugerindo abrir um PR direto para `BIPES/BIPES` sempre que você dá push numa branch nova. **Não clique nesse botão.** Se abrir a tela de criação de PR, confira sempre no topo da página se a comparação está entre:

```
base: obsat-oficial/satblocks:master  ←  compare: obsat-oficial/satblocks:sua-branch
```

e **não**:

```
base: BIPES/BIPES:master  ←  compare: obsat-oficial/satblocks:sua-branch
```

Se aparecer `BIPES/BIPES` como base, troque o repositório de destino no seletor antes de continuar (ou feche a tela e abra o PR pela aba "Pull requests" do próprio `obsat-oficial/satblocks`).

## Fluxo de trabalho recomendado

1. Crie uma branch a partir de `master` para a sua mudança:
   ```
   git checkout -b minha-mudanca
   ```
2. Faça commits normalmente e dê push da branch para `origin` (que já aponta só para `obsat-oficial/satblocks`):
   ```
   git push -u origin minha-mudanca
   ```
3. Abra o Pull Request pela aba **Pull Requests** do repositório `obsat-oficial/satblocks` (não pelo banner de sugestão automática), garantindo que tanto a base quanto o compare apontam para `obsat-oficial/satblocks`.
4. Peça revisão de outro membro da equipe antes de fazer o merge em `master`.

## Blocos criados no SatBlocks Studio

O [SatBlocks Studio](studio/index.html) permite que qualquer pessoa crie blocos customizados. Por segurança, esses blocos **ficam salvos só no navegador de quem criou** (via `localStorage`) — nunca são aplicados automaticamente à plataforma geral, e nunca chegam a este repositório sozinhos.

Quem quiser propor um bloco criado no Studio para virar oficial pode clicar em **"📤 Enviar para Avaliação"** — isso abre uma Issue pré-preenchida (rótulo `bloco-proposto`) neste repositório, com o código gerado, para a equipe avaliar antes de incluir. Não existe (nem deveria existir) um caminho de "commit automático" a partir do navegador: isso exigiria guardar uma credencial de escrita do GitHub em código do lado do cliente, algo que qualquer visitante poderia extrair e usar para alterar o repositório.

## Licença

Este projeto é distribuído sob a **GPL-3.0** (mesma licença do BIPES original) — veja [LICENSE](LICENSE). Qualquer contribuição enviada para este repositório é aceita sob os mesmos termos.
