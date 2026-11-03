# Firma digitale di Wol Edit Text

## Identità del certificato

- **Common Name:** Carlos H. P. Ross
- **Organizzazione:** WolCarlos
- **Unità organizzativa:** Wol Edit Text
- **Uso:** Authenticode / code signing
- **Validità:** dal 3 novembre 2026 al 5 febbraio 2029
- **Impronta SHA-256:** `E6:53:D8:12:1D:E0:4C:5B:93:9E:DC:07:88:7F:35:2E:00:BA:E5:5A:30:F9:02:DE:B5:76:F2:15:92:95:8B:B0`

Il certificato pubblico è disponibile in `certificates/WolCarlos-code-signing.crt` e `certificates/WolCarlos-code-signing.cer`.

## Limiti della firma autofirmata

Dalla versione 1.4.1, eseguibile e installer Windows sono firmati con Authenticode. La firma permette di verificare integrità dei file e corrispondenza con la chiave di Carlos H. P. Ross / WolCarlos.

Il certificato è **autofirmato**, non emesso da un’autorità di certificazione riconosciuta da Microsoft. Windows non lo considera attendibile automaticamente e SmartScreen può continuare a essere visualizzato. Non è necessario disattivare SmartScreen o altre protezioni.

Un amministratore può decidere di considerare attendibile il certificato solo dopo averne verificato l’impronta e aver compreso le implicazioni di sicurezza. L’installazione manuale di un certificato radice modifica il comportamento di trust del sistema e deve essere una scelta consapevole.

Per ottenere attendibilità pubblica e ridurre efficacemente gli avvisi è necessario sostituire il certificato con un certificato OV o EV emesso da una CA riconosciuta. EV Code Signing offre inoltre un percorso più diretto per la reputazione Microsoft SmartScreen.

## Verifica su Windows

Aprire le **Proprietà** dell’eseguibile o dell’installer, scheda **Firme digitali**, e controllare che il firmatario sia `Carlos H. P. Ross`. Uno stato “certificato non attendibile” è previsto finché il certificato autofirmato non viene riconosciuto dal sistema; non equivale a firma assente.

## Protezione della chiave e GitHub Actions

La chiave privata e la password non sono incluse nel repository, nei pacchetti o nei log. La pipeline usa questi segreti GitHub Actions:

- `WOL_EDIT_TEXT_CSC_BASE64`: certificato PFX codificato in Base64;
- `WOL_EDIT_TEXT_CSC_PASSWORD`: password del PFX.

Per passare a una CA riconosciuta è sufficiente sostituire i valori dei due segreti con quelli del nuovo certificato, senza modificare il workflow o il codice dell’app.
