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

L’app controlla gli aggiornamenti all’avvio e tramite il pulsante **Aggiornamenti**. Dalla versione 1.4.0 il download e l’installazione richiedono conferme separate; nessun aggiornamento viene installato automaticamente alla chiusura. Dopo l’aggiornamento la cache dei vecchi installer viene ripulita e al primo avvio viene mostrata la schermata **Novità**.

Le versioni precedenti alla 1.2.0 devono essere aggiornate una volta tramite installer manuale.

## Privacy, accessibilità e licenze

I contenuti incollati o importati vengono elaborati sul dispositivo. Il controllo aggiornamenti contatta esclusivamente GitHub e non trasmette il contenuto dei documenti. Immagini remote eventualmente conservate possono essere caricate dal loro indirizzo originale durante la visualizzazione.

- [Informativa privacy e GDPR](PRIVACY.md)
- [Accessibilità e autovalutazione WCAG 2.1 AA](ACCESSIBILITY.md)
- [Componenti e licenze di terze parti](THIRD_PARTY_NOTICES.md)

## Firma digitale

Dalla versione 1.4.1 eseguibile e installer sono firmati con Authenticode usando il certificato di **Carlos H. P. Ross / WolCarlos**. Il certificato attuale è autofirmato e non elimina automaticamente SmartScreen. Identità, impronta, limiti e procedura per una futura CA OV/EV sono documentati in [SIGNING.md](SIGNING.md).

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
