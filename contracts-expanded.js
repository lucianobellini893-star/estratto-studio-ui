/* Original, independently drafted contractual outline aligned to the thematic
   architecture (A-H and schedules) of the 2026 IBUK/IBLLC sample, without
   reproducing their copyrighted clauses or claiming regulatory equivalence.
   Only real approvals and actual services may be represented. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EstrattoContractsExpanded=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const text=x=>String(x||'').trim();
 const value=x=>text(x)||'[TO BE COMPLETED]';
 function build(p){
   const company=value(p.companyName),client=value(p.clientName),country=value(p.companyCountry);
   const address=value(p.companyAddress),registration=value(p.companyRegistration);
   const website=value(p.companyWebsite),email=value(p.companyEmail);
   const products=value(p.products),services=value(p.services),fees=value(p.feeSchedule);
   const regulator=value(p.regulator),license=value(p.authorization),law=value(p.governingLaw);
   const venue=value(p.jurisdiction),complaints=value(p.complaintsEmail||p.companyEmail),protection=value(p.protectionScheme);
   const each=(head,items)=>items.map(([title,...paragraphs])=>({title:head+' — '+title,paragraphs}));
   const parts=[];
   parts.push(...each('PART A: GETTING STARTED',[
     ['A1. Contractual framework and scope',
      'These proposed terms describe the relationship between '+company+' (the Company) and '+client+' (the Client), subject to all mandatory rules applicable to the Company and the Client.',
      'The Client Agreement, account application, relevant risk notices, published fees and any separate product agreements are intended to be read together. If an inconsistency exists, mandatory law takes priority; otherwise the order of precedence must be expressly settled in the final approved contract.'],
     ['A2. The Company and its services',
      'The Company is registered in '+country+' under registration number '+registration+'. Its registered address is '+address+'. Website: '+website+'. Contact: '+email+'.',
      'Services proposed for this account: '+services+'. Products proposed: '+products+'. Actual availability depends on the Company’s verified legal permissions, onboarding checks, product approvals and applicable restrictions.',
      'An authorisation or supervisory body may only be named if independently confirmed: regulator '+regulator+'; authorisation reference '+license+'. Neither mention here constitutes evidence of authorisation.'],
     ['A3. Execution-only or advisory services',
      'Unless an expressly signed agreement says otherwise and the Company is authorised to provide advice, information about instruments, markets or execution facilities must not be construed as personalised investment advice.',
      'Any suitability, appropriateness or product-governance assessment required by law must be conducted before the relevant service is enabled. No clause waives mandatory investor-protection duties.'],
     ['A4. Investment and operational risk',
      'Investments may decline in value; losses may be rapid or exceed deposits for some products. Platform interruptions, inaccurate market data, exchange outages and cyber incidents may prevent instructions from being submitted or executed.',
      'The Client must be given the separate risk disclosure and any additional product-specific warning applicable to permissions actually requested.'],
     ['A5. Client onboarding and verification',
      'The opening and operation of an account may depend on identification, beneficial-ownership checks, tax declarations, sanctions screening, source-of-funds enquiries and other lawful due-diligence steps.',
      'The Company must explain its identity-verification procedure, when an account becomes active and when it may decline an application. Submitting information is not equivalent to approval.'],
     ['A6. Accurate and current information',
      'The Client should provide accurate and complete details and notify the Company of material changes to address, residency, tax status, beneficial ownership or contact information in accordance with applicable law.',
      'The Company may request updated documents where legally necessary and will process personal data under an appropriate privacy notice.'],
     ['A7. Account access and security',
      'The Company must communicate permitted access channels and suitable authentication measures. The Client should protect credentials, promptly report suspected compromise and follow documented security instructions.',
      'Responsibility for unauthorised transactions must be assessed under applicable consumer, payment and investment law; it cannot be allocated absolutely to the Client by this template.'],
     ['A8. Charges, third-party costs and taxes',
      'Charges must be disclosed accurately before the service. The applicable schedule is: '+fees+'. No unpublished charge is incorporated merely by reference to an unspecified document.',
      'Currency conversion, financing, exchange fees, custody charges and applicable taxes may affect net results. The Company must specify what it actually charges and which third parties receive payments.'],
     ['A9. Electronic records and notices',
      'Where legally permitted, confirmations, statements and notices may be made available electronically through designated channels. Availability, delivery and accessibility requirements must be described to the Client.',
      'The Company shall maintain appropriate records of communications and transactions for the periods imposed by law. A PDF created manually does not prove that an electronic notice was delivered.'],
     ['A10. Communications and complaints',
      'Clients must have a clear channel to ask questions or complain: '+complaints+'. The Company must publish its actual complaint-handling procedure, deadlines and any external dispute-resolution avenues.',
      'This document does not exclude access to applicable courts, regulators or ombudsman services.'],
     ['A11. Withdrawal, cancellation and account closing',
      'Any cancellation or withdrawal period must reflect the Client’s actual legal rights and the nature of the service. The Company should explain consequences for open orders, positions, funds and fees.',
      'Termination does not remove accrued obligations, legal record-retention duties or the Client’s non-waivable rights.']
   ]));
   parts.push(...each('PART B: TRADING AND ACCOUNT OPERATIONS',[
     ['B1. Funding and withdrawals',
      'Deposits and withdrawals may be subject to verified ownership, approved payment methods, anti-money-laundering checks and lawful account restrictions.',
      'The Company must identify the entity that receives and holds customer money and set out applicable processing times, fees and restrictions.'],
     ['B2. Instructions and orders',
      'The Client may submit orders only through permitted channels. An instruction received by the system may remain unexecuted, partially executed or rejected until execution is confirmed.',
      'Order types, time-in-force instructions, trading sessions, routing venues and limitations must be described accurately in the applicable trading policy.'],
     ['B3. Modifying or cancelling orders',
      'A request to cancel or amend an order is not guaranteed to succeed if the order has already been executed, routed or entered a market process.',
      'The platform should provide clear status information and preserve authoritative transaction records.'],
     ['B4. Execution quality and conflicts',
      'Where legally required, the Company must take the applicable steps regarding execution quality and disclose its order execution arrangements.',
      'Material conflicts of interest, inducements, dealing capacities and relationships with execution or custody providers must be disclosed when relevant.'],
     ['B5. Market halts and restrictions',
      'Markets, venues or systems may suspend trading and limit liquidity. The Company may apply only contractually and legally permitted restrictions and must communicate material consequences where required.'],
     ['B6. Corporate actions and entitlements',
      'Dividends, voting instructions, rights issues, tender offers and other corporate actions are subject to issuer, venue and intermediary deadlines.',
      'The Company must specify whether it or a third party handles the instruction and how entitlements and communications are recorded.'],
     ['B7. Statements and corrections',
      'Confirmations and account statements should reflect transactions and balances derived from verified back-office records.',
      'Clients require a stated means to report errors. Corrections must be documented; the Company may not represent simulated or manually fabricated trades as verified executions.'],
     ['B8. Operational incidents',
      'The Company should explain support procedures for failed connections, inaccessible platforms, erroneous orders and other operational incidents, including any lawful limitations of liability.']
   ]));
   parts.push(...each('PART C: CLIENT MONEY AND ASSET PROTECTION',[
     ['C1. Custody and segregation arrangements',
      'The approved contract must identify the precise institution or legal entity holding the Client’s cash and instruments, how assets are recorded, and whether segregation or trust protections apply.',
      'This draft does not claim that '+company+' holds protected client funds or offers custody services; those assertions must be supported by actual arrangements and regulatory obligations.'],
     ['C2. Insolvency and compensation',
      'Any investor-compensation or deposit-protection arrangement must be described with exact eligibility conditions, limits and exclusions, based on the relevant scheme and legal entity.',
      'Company-provided information about protection, awaiting verification: '+protection+'. No UK FSCS or US SIPC coverage is implied for the Client.'],
     ['C3. Nominees, sub-custodians and third parties',
      'If assets are held via nominees, clearing firms, depositaries or overseas sub-custodians, the final agreement must explain the resulting legal rights, insolvency risks and jurisdictional differences.'],
     ['C4. Security interests and rights of use',
      'Any lien, pledge, set-off right, rehypothecation or reuse of Client assets requires an express and legally valid basis and applicable disclosure.',
      'This template does not grant such rights by itself. Product-specific wording should be added only where arrangements genuinely exist and are lawful.'],
     ['C5. Client asset reconciliations',
      'The Company must follow any applicable reconciliation, segregation, reporting and shortfall-handling duties. Responsibilities allocated to third parties must be identified without misrepresenting their status.']
   ]));
   parts.push(...each('PART D: RESTRICTIONS, DEFAULT AND ENFORCEMENT',[
     ['D1. Account restrictions',
      'Restrictions may be appropriate to comply with sanctions, law, market rules, genuine security incidents or contractually permitted risk controls. Criteria and client-notification duties must be defined.',
      'Mandatory notice, review and appeal rights cannot be excluded.'],
     ['D2. Events of default',
      'The final contract should define objective and enforceable defaults, such as unpaid obligations, misrepresentations or breaches of valid trading requirements, subject to mandatory legal limitations.',
      'A default determination must follow due process and evidence; no event is assumed merely from this template.'],
     ['D3. Close-outs and liquidation',
      'If the Company actually provides margin or derivatives services, any right to liquidate or close positions must reflect its authorisation, risk disclosures and governing law.',
      'Costs, valuation methods, timing, notice requirements and treatment of remaining balances must be specified in approved terms.'],
     ['D4. Set-off and recovery',
      'Any right to set off obligations, retain amounts or seek recovery must be clearly defined and legally reviewed. This draft does not itself create an enforceable charge against customer property.'],
     ['D5. Changes to terms',
      'The Company should identify what changes are permitted, the notice period, delivery channel and any right to reject or terminate changes, consistent with applicable law.'],
     ['D6. Termination and survival',
      'Termination must provide for open positions, unsettled trades, fees, account balances, record retention and ongoing statutory duties, without excluding non-waivable protections.']
   ]));
   parts.push(...each('PART E: GENERAL LEGAL PROVISIONS',[
     ['E1. Electronic systems and intellectual property',
      'Platform software and access credentials may be used only in accordance with their documented licence and applicable law. Client access does not transfer intellectual-property ownership.'],
     ['E2. Data protection and confidentiality',
      'The Company must provide a separate privacy notice explaining lawful purposes, data categories, processors, international transfers, retention and data-subject rights.',
      'Customer data may only be disclosed as authorised by law and valid privacy arrangements.'],
     ['E3. Communications and records',
      'Permitted communication languages, official contact points, records and means of delivering contractual notices should be stated clearly.'],
     ['E4. Responsibility and limitations',
      'Any limitation of liability must be reviewed for fairness and enforceability, and cannot exclude fraud, deliberate wrongdoing or duties that the applicable law prohibits excluding.'],
     ['E5. Governing law and disputes',
      'Proposed governing law: '+law+'. Proposed dispute forum or mechanism: '+venue+'. Mandatory consumer protections and applicable cross-border rules take precedence where required.'],
     ['E6. Entire agreement, severability and assignment',
      'The final agreement should define which signed documents it comprises, how invalid provisions are treated, and under what circumstances any party may assign rights or obligations.',
      'Clauses should not eliminate statutory rights or misrepresent the identity of contracting entities.']
   ]));
   parts.push(...each('PART F: MARGIN TRADING — ONLY IF ENABLED',[
     ['F1. Optional feature and eligibility',
      'This Part applies only if margin trading is actually offered by an appropriately authorised provider and expressly enabled for the Client after relevant checks.',
      'Where margin is unavailable, this Part must not be represented as an operative service.'],
     ['F2. Financing, collateral and interest',
      'The approved margin agreement must specify lending entity, eligibility, collateral valuation, margin methodology, interest rates, payment obligations and any right to change requirements.'],
     ['F3. Margin calls and liquidation',
      'A Client may need to deposit additional funds or securities immediately following adverse price movements. If legally permitted, positions may be liquidated with limited or no prior warning.',
      'Any right of sale, application of proceeds and remaining Client debt must be explained in actual product terms.'],
     ['F4. Potential losses',
      'Leverage magnifies losses, and short positions, volatile markets or illiquid instruments may create losses beyond the original margin. Only accurate jurisdiction-specific protections may be claimed.']
   ]));
   parts.push(...each('PART G: FOREIGN EXCHANGE — ONLY IF ENABLED',[
     ['G1. Multi-currency features',
      'Currency conversion and balances involve exchange-rate, liquidity, settlement and operational risks. Fees and available order types must be disclosed.'],
     ['G2. Conversion execution and settlement',
      'Applicable FX services must specify their provider, venue or pricing methodology, settlement practice and any contractual currency-conversion authority.'],
     ['G3. FX borrowing and exposure',
      'If currency borrowing or leveraged FX is actually available, financing charges, margin requirements and potential losses must be separately agreed.']
   ]));
   parts.push(...each('PART H: COMPLEX PRODUCTS — ONLY IF ENABLED',[
     ['H1. Product permissions and eligibility',
      'Options, futures, short sales and other complex products require product-specific permission, disclosures and any mandatory assessment before trading.'],
     ['H2. Options and short selling',
      'Option writers may face losses materially exceeding premiums. Short sales may entail theoretically unlimited losses, borrow recalls and rapidly changing financing costs.'],
     ['H3. Futures and clearing',
      'Futures positions may be subject to daily variation margin, liquidation, delivery, contract expiry and exchange or clearing-house rules.'],
     ['H4. Exercise, assignment and settlement',
      'Options can be exercised or assigned under market rules, sometimes on terms different from expectations. The approved contract should specify deadlines and exercise instructions.'],
     ['H5. Physical delivery and operational constraints',
      'Where physically settled futures are enabled, the approved product terms must describe delivery eligibility, deadlines and any obligation to close positions before delivery.']
   ]));
   parts.push(...each('SCHEDULE 1: SERVICE RESPONSIBILITY MATRIX',[
     ['S1. Services and responsible legal entities',
      'Identify each contracting entity involved in account opening, order transmission, execution, clearing, safeguarding, funding and statements, and link it to its real licence and agreement.',
      'For this draft the proposed contracting company is '+company+'. No additional broker or affiliate is assumed.']
   ]));
   parts.push(...each('SCHEDULE 2: DEFINITIONS',[
     ['S2. Key defined terms',
      'Account: an account approved and maintained pursuant to an effective agreement. Client: '+client+'. Company: '+company+'. Services: only the activities actually offered and lawfully authorised.',
      'Order: an instruction submitted by an approved channel. Trading Platform: any service actually designated by the provider. Collateral, Margin and Complex Products apply only if those features are enabled.']
   ]));
   parts.push(...each('SCHEDULE 3: APPLICABLE DOCUMENTS',[
     ['S3. Referenced policies and disclosures',
      'The approved version should link to the Company’s real privacy policy, fee schedule, risk disclosures, order-execution policy, complaints procedure and relevant third-party terms.',
      'Website: '+website+'. Statements that external documents apply must be accompanied by copies or links available to the Client at acceptance.']
   ]));
   parts.push(...each('SCHEDULE 4: CUSTOMER CLASSIFICATION',[
     ['S4. Retail and professional client protections',
      'Retail or professional classification and the rights that follow may only be assigned using the applicable legal criteria and a documented decision.',
      'The Company must disclose which protections apply and whether any lawful election to change classification has been made.']
   ]));
   parts.push(...each('SCHEDULE 5: PHYSICAL DELIVERY CONDITIONS',[
     ['S5. Physically settled derivatives',
      'If physical-delivery products are enabled, a separate, approved schedule must identify contract categories, delivery restrictions, notice periods and any forced close-out policy.',
      'Where the feature does not exist, this Schedule is not operative.']
   ]));
   return parts;
 }
 return {build};
});