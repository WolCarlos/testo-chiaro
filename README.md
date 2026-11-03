# Wol Edit Text

<img src="build/icon.png" alt="Icona di Wol Edit Text" width="112" />

Wol Edit Text è un’app desktop locale per pulire la formattazione dei testi copiati, convertire Markdown ed esportare documenti leggibili in PDF, HTML, Markdown o TXT.

## Funzioni principali

- Rimozione selettiva di colori, sfondi, caratteri, stili e impaginazione.
- Conservazione opzionale di titoli, elenchi, tabelle, collegamenti e immagini.
- Copia HTML pulita e testo semplice, adatta anche a Thunderbird.
- Editor e anteprima Markdown in tempo reale.
- Tema chiaro/scuro separato per l’anteprima.
- Area semantica dedicata alla Lettura automatica di Windows.
- Elaborazione locale: i testi non vengono inviati online.
- Aggiornamenti dell’app tramite GitHub Releases.

## Installazione

Scarica l’installer Windows più recente dalla pagina [Releases](https://github.com/WolCarlos/testo-chiaro/releases/latest) ed eseguilo.

Dalla versione 1.2.0 l’app controlla automaticamente gli aggiornamenti all’avvio. È anche possibile usare il pulsante **Aggiornamenti** nell’intestazione. Quando una nuova versione è pronta, l’app propone **Aggiorna e riavvia**.

Le versioni precedenti devono essere aggiornate una volta alla 1.2.0 o successiva tramite installer manuale.

## Privacy

I contenuti incollati o importati vengono elaborati sul dispositivo. Il controllo aggiornamenti contatta esclusivamente GitHub e non trasmette il contenuto dei documenti. Immagini remote eventualmente conservate possono essere caricate dal loro indirizzo originale durante la visualizzazione.

## Sviluppo

Requisiti: Node.js 24 o successivo e npm.

```bash
npm install
npm run dev:desktop
```

Comandi disponibili:

```bash
npm test           # test delle conversioni
npm run test:desktop  # test dell’interfaccia Electron e del PDF
npm run build      # build web di produzione
npm run dist       # installer per il sistema operativo corrente
```

Gli installer vengono creati in `packages/<versione>/`. Queste cartelle, le build e i risultati dei test non sono versionati.

## Pubblicare una release

1. Aggiorna `version` in `package.json`.
2. Esegui i test e `npm run dist`.
3. Crea e pubblica un tag Git nel formato `vX.Y.Z`.

Il workflow GitHub Actions `.github/workflows/release.yml` compila l’installer Windows e pubblica nella release gli artifact necessari ad `electron-updater`: installer EXE, blockmap e `latest.yml`.
