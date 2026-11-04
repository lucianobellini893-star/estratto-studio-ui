/* Contract drafts for an independent financial-services document workspace.
   Templates are original drafts, NOT Interactive Brokers agreements and NOT legal advice.
   No acceptance, regulatory permission, or signature is inferred by this module. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./contracts-expanded.js'):root.EstrattoContractsExpanded,typeof module==='object'&&module.exports?require('./contracts-clauses.js'):root.EstrattoContractsClauses);if(typeof module==='object'&&module.exports)module.exports=api;else root.EstrattoContractsCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(expanded,clauses){
  'use strict';
  const versions={agreement:'draft-1.0',application:'draft-1.0',risk:'draft-1.0',consent:'draft-1.0'};
  const types=[
    {id:'agreement',title:'Contratto quadro con il cliente',en:'Client Agreement',description:'Termini generali del rapporto, servizi, responsabilità e gestione dei reclami.'},
    {id:'application',title:'Domanda di apertura del conto',en:'Account Opening Application',description:'Dati del richiedente, verifiche e dichiarazioni preliminari.'},
    {id:'risk',title:'Informativa generale sui rischi',en:'General Risk Disclosure',description:'Rischi legati a mercati, strumenti, margine e leva finanziaria.'},
    {id:'consent',title:'Consensi e presa visione',en:'Express Consent / Electronic Acceptance',description:'Scelte esplicite e spazio per i dati di una prova di accettazione.'}
  ];
  function clean(v){return String(v==null?'':v).trim();}
  function v(value){return clean(value)||'[DA COMPLETARE]';}
  function lines(text){return clean(text).split(/\r?\n/).map(clean).filter(Boolean);}
  function checkRequired(profile){
    const required=[
      ['companyName','Ragione sociale'],['companyAddress','Sede legale'],['companyCountry','Paese della società'],
      ['companyRegistration','Numero di registrazione'],['companyEmail','Contatto aziendale'],['governingLaw','Legge applicabile'],
      ['clientName','Nome del cliente'],['clientId','ID cliente']
    ];
    return required.filter(([name])=>!clean(profile[name])).map(([,label])=>label);
  }
  function common(ctx){
    const p=ctx||{};
    return {
      company:v(p.companyName),address:v(p.companyAddress),country:v(p.companyCountry),
      registration:v(p.companyRegistration),regulator:v(p.regulator),authorization:v(p.authorization),
      email:v(p.companyEmail),web:v(p.companyWebsite),law:v(p.governingLaw),venue:v(p.jurisdiction),
      complaints:v(p.complaintsEmail||p.companyEmail),client:v(p.clientName),clientId:v(p.clientId),
      account:v(p.accountId),residence:v(p.clientCountry),date:v(p.issueDate),
      fees:v(p.feeSchedule),products:v(p.products),services:v(p.services),
      protection:v(p.protectionScheme),signature:v(p.signatureMethod),
      agreementVersion:versions.agreement
    };
  }
  function s(title,paragraphs){return {title,paragraphs:paragraphs.map(clean).filter(Boolean)};}
  function buildAgreement(c){
    return [
      s('1. Parti e ambito del contratto',[
        'Il presente documento è una bozza contrattuale proposta tra '+c.company+' («Società») e '+c.client+' («Cliente»). Non attribuisce di per sé il diritto di offrire servizi finanziari regolamentati.',
        'Sede: '+c.address+'. Paese: '+c.country+'. Numero di registrazione: '+c.registration+'. Contatto: '+c.email+'.',
        'I servizi eventualmente prestati sono esclusivamente quelli descritti in modo completo nei documenti commerciali e autorizzativi della Società: '+c.services+'. La tipologia di strumenti è: '+c.products+'.'
      ]),
      s('2. Apertura, identificazione e ammissibilità',[
        'L’apertura di un conto è subordinata alla verifica dell’identità, dell’eventuale titolare effettivo e degli obblighi antiriciclaggio, sanzioni e adeguata verifica applicabili.',
        'La Società può richiedere documenti aggiornati, dati fiscali, attestazioni sulla provenienza dei fondi e ulteriori informazioni pertinenti prima di attivare il rapporto.',
        'Il Cliente si impegna a comunicare tempestivamente cambiamenti rilevanti nei propri dati e nella propria capacità di operare.'
      ]),
      s('3. Natura dei servizi e limiti',[
        'Le caratteristiche concrete del servizio, inclusi eventuali servizi di esecuzione, custodia, consulenza o semplice supporto tecnologico, devono essere precisate in un allegato specifico e approvato prima dell’uso.',
        'Nessuna espressione contenuta in questa bozza costituisce dichiarazione di autorizzazione, garanzia di rendimento o idoneità del servizio per il Cliente.',
        'Ove applicabile, la Società deve illustrare separatamente le modalità di esecuzione degli ordini, i conflitti di interesse e le regole di custodia degli strumenti o del denaro dei clienti.'
      ]),
      s('4. Ordini e operazioni',[
        'Le istruzioni sono ricevute attraverso i canali espressamente indicati dalla Società. Le modalità di ricezione, autenticazione, annullamento e rifiuto degli ordini devono essere documentate.',
        'Il Cliente è responsabile delle istruzioni impartite con le proprie credenziali, salvo quanto diversamente previsto dalla normativa applicabile e dalle misure di sicurezza della Società.',
        'Prezzi e disponibilità possono cambiare; una richiesta non equivale necessariamente a esecuzione fino a quando non risulti confermata nei registri operativi.'
      ]),
      s('5. Prezzi, commissioni e spese',[
        'Tariffe e oneri devono essere specificati in un prospetto allegato e consegnato al Cliente prima della conclusione del contratto: '+c.fees+'.',
        'Costi di mercato, cambio, finanziamento, custodia, prelievo e imposte possono incidere sul risultato economico. Nessuna tariffa non descritta deve essere rappresentata come già accettata.'
      ]),
      s('6. Finanziamento, leva e richieste di margine',[
        'Le operazioni con margine o leva finanziaria, se offerte lecitamente, sono soggette a condizioni specifiche, requisiti di garanzia e possibili liquidazioni forzate.',
        'Il Cliente può perdere l’intero capitale e, in determinati prodotti o ordinamenti, importi ulteriori. L’Informativa sui rischi deve essere fornita separatamente prima dell’operatività rilevante.'
      ]),
      s('7. Rendicontazione, errori e contestazioni',[
        'Le conferme e gli estratti conto, se previsti, riportano le informazioni risultanti dai registri. Un PDF generato da strumenti interni non sostituisce la verifica delle registrazioni sottostanti.',
        'Il Cliente deve avere un canale per contestare omissioni o errori. Modalità e termini devono rispettare la normativa applicabile e non comprimere diritti inderogabili.'
      ]),
      s('8. Conflitti di interesse e protezione dei clienti',[
        'La Società deve rendere disponibile la propria politica sui conflitti di interesse ove richiesta e comunicare la natura di eventuali incentivi o rapporti con terzi.',
        'Eventuali schemi di tutela o compensazione degli investitori sono applicabili soltanto ove effettivamente previsti e verificati. Informazioni sullo schema: '+c.protection+'.',
        'Autorità di vigilanza dichiarata, da verificare con le registrazioni ufficiali: '+c.regulator+'. Numero autorizzativo verificato: '+c.authorization+'.'
      ]),
      s('9. Privacy, sicurezza e comunicazioni',[
        'Il trattamento dei dati personali richiede un’informativa privacy separata che specifichi titolare, finalità, basi giuridiche, destinatari, tempi di conservazione e diritti.',
        'Le comunicazioni elettroniche possono essere utilizzate nei limiti consentiti e secondo le preferenze del Cliente. Nessuna casella preselezionata costituisce automaticamente consenso valido.'
      ]),
      s('10. Sospensione e cessazione',[
        'Condizioni di sospensione, recesso, chiusura delle posizioni e restituzione di eventuali disponibilità devono essere determinate in conformità alle leggi applicabili.',
        'La cessazione del rapporto non estingue obblighi di rendicontazione, conservazione o cooperazione dovuti per legge.'
      ]),
      s('11. Reclami, controversie e legge applicabile',[
        'Per reclami e richieste documentali: '+c.complaints+'. La Società deve specificare tempi, eventuali organismi di risoluzione alternativa e autorità competenti.',
        'Legge proposta: '+c.law+'. Foro o organismo competente: '+c.venue+'. Queste indicazioni richiedono verifica legale per la clientela e le giurisdizioni interessate.'
      ]),
      s('12. Allegati e conclusione',[
        'I documenti separati da consegnare, se applicabili, comprendono: domanda di apertura, informativa sui rischi, prospetto dei costi, privacy policy, policy di esecuzione e registrazioni di eventuali consensi.',
        'Una copia generata da questo strumento è una bozza: non dimostra che il Cliente abbia ricevuto, letto o accettato il testo. Una prova di accettazione deve derivare dal sistema che ha realmente registrato l’azione.'
      ])
    ];
  }
  function buildApplication(c){
    return [
      s('1. Dati identificativi della domanda',[
        'Richiedente: '+c.client+'. ID cliente interno: '+c.clientId+'. Numero conto, se assegnato: '+c.account+'. Paese di residenza: '+c.residence+'.',
        'Società destinataria della richiesta: '+c.company+'. La compilazione del presente modulo non costituisce apertura o approvazione automatica di un conto.'
      ]),
      s('2. Identità e contatti',[
        'Campi da raccogliere tramite procedura protetta: data e luogo di nascita, cittadinanza, indirizzo di residenza, recapiti, documenti identificativi e scadenza, ove necessari e leciti.',
        'I documenti sensibili devono essere raccolti in un sistema conforme ai requisiti di privacy e sicurezza, non attraverso campi di testo pubblicamente condivisi.'
      ]),
      s('3. Residenza fiscale e classificazioni',[
        'Devono essere richieste dichiarazioni fiscali e di residenza pertinenti (es. FATCA/CRS quando applicabili), con identificativi fiscali e modulistica ufficiale.',
        'La classificazione del Cliente come retail, professionale o controparte qualificata, se rilevante, deve essere determinata secondo le disposizioni effettivamente applicabili.'
      ]),
      s('4. Occupazione, situazione economica ed esperienza',[
        'La Società deve raccogliere, quando richiesto dalle regole applicabili, informazioni su impiego, patrimonio, reddito, obiettivi di investimento, tolleranza al rischio ed esperienza.',
        'L’adeguatezza o appropriatezza degli strumenti non può essere dedotta dal solo fatto che il Cliente abbia compilato questa domanda.'
      ]),
      s('5. Titolarità effettiva e provenienza dei fondi',[
        'La domanda deve indicare titolarità del conto e soggetti che ne esercitano il controllo, ove applicabile.',
        'La provenienza dei fondi, eventuali persone politicamente esposte, restrizioni, sanzioni e ulteriori elementi di due diligence sono soggetti a verifiche indipendenti.'
      ]),
      s('6. Servizi e prodotti richiesti',[
        'Servizi selezionati dal Cliente: '+c.services+'. Strumenti potenzialmente interessati: '+c.products+'.',
        'Le abilitazioni effettive sono concesse solo dopo le verifiche richieste. La semplice presenza di una categoria in questa bozza non significa che la Società sia autorizzata ad offrirla.'
      ]),
      s('7. Dichiarazioni del richiedente',[
        'Il Cliente deve poter dichiarare che le informazioni trasmesse sono accurate alla data della domanda e di impegnarsi a comunicarne variazioni rilevanti.',
        'Le dichiarazioni non devono risultare preselezionate. La data dell’effettiva sottoscrizione e l’identità del sottoscrittore devono derivare da un processo verificabile.'
      ]),
      s('8. Documenti da fornire',[
        'Elenco operativo da completare prima dell’utilizzo: prova d’identità; prova dell’indirizzo; dati fiscali; documenti societari, se necessario; dichiarazione di titolarità effettiva; altre verifiche richieste.',
        'La Società deve indicare come e dove trasmettere i documenti e i criteri di conservazione e protezione.'
      ]),
      s('9. Valutazione, approvazione e rifiuto',[
        'La Società valuta la richiesta, può chiedere chiarimenti e comunica separatamente l’eventuale approvazione. Non viene qui attestata alcuna verifica KYC completata.',
        'Il rifiuto o la sospensione della richiesta segue le procedure legali e regolamentari applicabili.'
      ]),
      s('10. Sottoscrizione e tracciabilità',[
        'Il campo di firma o di accettazione deve essere completato soltanto mediante un processo reale e documentato. Una data digitata manualmente non è una prova sufficiente di consenso.',
        'Riferimento alla versione dei documenti presentati al Cliente: '+c.agreementVersion+'. Non inventare timestamp, indirizzi IP o altri dati non registrati.'
      ])
    ];
  }
  function buildRisk(c){
    return [
      s('1. Avvertenza generale',[
        'La negoziazione di strumenti finanziari comporta rischi, inclusa la perdita parziale o totale delle somme investite. I risultati passati non garantiscono quelli futuri.',
        'Il presente testo è una bozza generale e non sostituisce le informative specifiche di prodotto o le valutazioni prescritte dalla legge.'
      ]),
      s('2. Oscillazioni dei prezzi e liquidità',[
        'Mercati volatili possono determinare perdite rapide, differenze tra prezzo richiesto e prezzo eseguito, sospensioni di negoziazione o impossibilità di chiudere posizioni.',
        'La liquidità può diminuire improvvisamente, soprattutto durante notizie rilevanti e fasi di stress.'
      ]),
      s('3. Leva finanziaria e margine',[
        'La leva amplifica profitti e perdite. Piccoli movimenti contrari possono esaurire rapidamente il margine disponibile; possono intervenire richieste aggiuntive di garanzia.',
        'Le posizioni possono essere chiuse automaticamente a prezzi sfavorevoli; in alcuni casi e giurisdizioni può esistere una perdita superiore al saldo versato.'
      ]),
      s('4. Derivati, opzioni e futures',[
        'Opzioni e altri derivati possono contenere strutture complesse e rischi asimmetrici. Un venditore di opzioni non coperte può subire perdite molto elevate.',
        'Futures e prodotti analoghi possono richiedere regolamenti, margini giornalieri e consegne secondo regole specifiche.'
      ]),
      s('5. Valute e mercati esteri',[
        'Il rischio di cambio può aumentare o ridurre il rendimento quando il valore dell’investimento e la valuta del conto differiscono.',
        'Titoli e mercati esteri comportano differenze normative, fiscali, operative e di orario che possono aggravare il rischio.'
      ]),
      s('6. Azioni, obbligazioni e credito',[
        'Le azioni possono perdere valore fino all’azzeramento. Le obbligazioni sono esposte a tassi d’interesse, inflazione, insolvenza dell’emittente e scarsa liquidità.',
        'Le protezioni e le priorità dei creditori possono differire da prodotto a prodotto.'
      ]),
      s('7. Criptoattività e strumenti digitali',[
        'Se incluse nell’offerta effettivamente autorizzata, le criptoattività possono essere altamente speculative e soggette a volatilità, perdita delle chiavi, vulnerabilità tecniche o insolvenza dei custodi.',
        'Alcune criptoattività possono non beneficiare di tutele equivalenti a quelle degli strumenti finanziari regolamentati.'
      ]),
      s('8. Tecnologia, cyber-risk e operatività',[
        'Interruzioni di rete, guasti software, indisponibilità di piattaforme, incidenti informatici e errori dei fornitori possono limitare la capacità di inviare o modificare ordini.',
        'Conservare copie delle comunicazioni e utilizzare le procedure di emergenza ufficialmente comunicate.'
      ]),
      s('9. Controparti, custodia e insolvenza',[
        'Il fallimento di intermediari, emittenti, controparti o custodi può comportare perdite e ritardi nel recupero delle attività.',
        'L’applicabilità di un sistema di tutela deve essere verificata espressamente, senza presumere l’esistenza di una garanzia. Sistema dichiarato: '+c.protection+'.'
      ]),
      s('10. Costi, imposte e interessi',[
        'Commissioni, spread, interessi, spese di conversione e imposte riducono i risultati. Tariffe e condizioni concrete: '+c.fees+'.',
        'La situazione fiscale dipende da giurisdizione e circostanze personali. Il Cliente può necessitare di una consulenza fiscale indipendente.'
      ]),
      s('11. Scenari estremi e ordini protettivi',[
        'Gli ordini stop non garantiscono un prezzo di uscita. In presenza di gap, sospensioni o illiquidità, l’esecuzione può avvenire a prezzi sensibilmente diversi.',
        'Non investire somme la cui perdita possa compromettere bisogni essenziali o obblighi finanziari.'
      ]),
      s('12. Informazione e decisioni del Cliente',[
        'Prima di operare il Cliente dovrebbe valutare obiettivi, esperienza, tolleranza alle perdite e capacità finanziaria, e ottenere chiarimenti sui prodotti non compresi.',
        'La visione di questa informativa non prova l’avvenuta accettazione. Eventuali consensi devono essere raccolti e registrati da una procedura verificabile.'
      ])
    ];
  }
  function buildConsent(c){
    return [
      s('1. Finalità e documenti',[
        'Questo modulo è predisposto per presentare in modo separato le scelte e le prese visione del Cliente: '+c.client+' (ID: '+c.clientId+').',
        'Documenti di riferimento: Contratto quadro ('+c.agreementVersion+'), Domanda di apertura del conto, Informativa generale sui rischi e ulteriori allegati effettivamente resi disponibili.'
      ]),
      s('2. Presa visione del contratto',[
        'La Società deve fornire accesso al testo integrale della versione vigente del contratto prima di proporne l’accettazione.',
        'La casella di presa visione deve essere vuota per impostazione predefinita e collegata alla versione esatta del documento consegnato.'
      ]),
      s('3. Presa visione delle informazioni sui rischi',[
        'Il Cliente deve poter leggere e scaricare l’informativa generale sui rischi e le schede aggiuntive per i prodotti rilevanti.',
        'Un’eventuale conferma di presa visione non elimina i doveri di protezione del cliente imposti alla Società dalla legge.'
      ]),
      s('4. Comunicazioni elettroniche',[
        'Il Cliente deve essere informato su modalità di consegna, accessibilità, formato, conservazione e possibilità di ottenere copie delle comunicazioni.',
        'Consensi opzionali e preferenze di marketing devono essere separati dall’accettazione del contratto e non preselezionati.'
      ]),
      s('5. Privacy e trattamenti facoltativi',[
        'Il trattamento necessario per obblighi di legge o esecuzione contrattuale non deve essere presentato come se dipendesse sempre dal consenso.',
        'Gli eventuali consensi richiesti per finalità facoltative devono essere specifici, granulari, informati e revocabili ove previsto.'
      ]),
      s('6. Metodo di firma e autenticazione',[
        'Metodo previsto, da convalidare con il fornitore di firma e con i requisiti legali: '+c.signature+'.',
        'Una firma grafica generata, una casella spuntata in un PDF o un nome digitato dal personale non dimostrano di per sé che il Cliente abbia firmato.'
      ]),
      s('7. Metadati di prova: da un sistema verificabile',[
        'Se la firma è effettivamente avvenuta, il sistema di registrazione deve fornire: identificativo della sessione, data e ora con fuso orario, utente autenticato, versione e impronta del documento, azione eseguita e riferimenti all’eventuale firma.',
        'Questi dati non vengono generati automaticamente dal presente editor e non devono essere inventati o attribuiti al Cliente senza evidenze.'
      ]),
      s('8. Conservazione e recupero',[
        'La Società deve prevedere conservazione sicura e recupero del testo accettato, della prova di integrità e delle informazioni sulla firma per il periodo richiesto.',
        'Una semplice esportazione PDF effettuata nel browser non costituisce un registro di audit indipendente e immutabile.'
      ]),
      s('9. Revoche e gestione delle preferenze',[
        'La Società deve spiegare quali preferenze possono essere modificate e quali effetti derivano dalla revoca di un consenso facoltativo, senza pregiudicare diritti inderogabili.'
      ]),
      s('10. Esito della procedura',[
        'STATO DI QUESTO MODULO: BOZZA NON FIRMATA. La presente esportazione non certifica alcuna accettazione o firma.',
        'Una conferma valida può essere generata soltanto utilizzando prove autentiche prodotte dal sistema di registrazione e verificate con le relative procedure.'
      ])
    ];
  }
  const builders={agreement:buildAgreement,application:buildApplication,risk:buildRisk,consent:buildConsent};
  function build(type,profile){
    if(!Object.prototype.hasOwnProperty.call(builders,type))throw new Error('Tipo documento non riconosciuto.');
    const c=common(profile);
    return {id:type,version:versions[type],title:types.find(item=>item.id===type).title,englishTitle:types.find(item=>item.id===type).en,
      sections:type==='agreement'&&expanded?(clauses?clauses.extend(expanded.build(profile)):expanded.build(profile)):builders[type](c),missing:checkRequired(profile),draft:true};
  }
  return {types,versions,build,checkRequired};
});