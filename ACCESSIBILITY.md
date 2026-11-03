# Accessibilità di Wol Edit Text

## Obiettivo

Wol Edit Text è progettato con riferimento alle **WCAG 2.1 livello AA** e ai principi di accessibilità richiamati dalla normativa italiana, inclusa la Legge Stanca. Il documento è un’autovalutazione tecnica, non una dichiarazione di conformità certificata.

## Misure implementate

- Struttura semantica con intestazioni, pannelli, moduli, finestre di dialogo e stato degli aggiornamenti.
- Area `role="document"` separata per il testo convertito e attivabile tramite **Leggi da qui**.
- Testo reale selezionabile, senza conversione in immagini o canvas.
- Navigazione da tastiera, focus visibile, scorciatoia per raggiungere l’anteprima e controlli con etichette accessibili.
- Tema chiaro/scuro indipendente per l’anteprima e contrasto elevato nei due temi.
- Supporto a `prefers-reduced-motion`.
- Ridimensionamento responsive dell’interfaccia e contenuto con interruzioni di riga sicure.
- Messaggi di stato tramite `aria-live` per copia, errori e aggiornamenti.
- Download e installazione degli aggiornamenti solo tramite azioni esplicite.

## Verifiche effettuate

- Test automatici su Windows 11 dell’area di lettura e del focus.
- Controllo del testo estraibile nei PDF generati.
- Verifica visiva dei temi chiaro/scuro e delle finestre di dialogo.

## Limiti e audit

La compatibilità completa con tutte le versioni di screen reader, browser e tecnologie assistive non è garantita dai soli test automatici. Per una dichiarazione formale di conformità è necessario un audit manuale documentato, inclusi test con utenti e tecnologie assistive rappresentative.

Segnalazioni di accessibilità: usare GitHub Issues senza allegare documenti privati.
