import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './styles.css';

const COMPANY = {
  name: 'Aura Energy Myanmar',
  phone: '09 - 255955556, 09750056925',
  address: 'No.474, Yadanar Pone St, 132 Quarter, East Dagon, Yangon, Myanmar',
  email: 'auraenergymyanmar@gmail.com',
  tagline: 'Powering a Brighter Tomorrow.'
};

const PRODUCT_PRESETS = [
  ['JA','JAM72D42-615/LB-Bifacial','JA 615W Bifacial'],
  ['SOFAR','HYD6000-EP','HYD6000-EP 6kW'],
  ['SOFAR','HYD20KTL-3PH','HYD20KTL-3PH 20kW'],
  ['SOFAR','100KTLX-G4','100KTLX-G4 100kW'],
  ['SOFAR','125KTLX-G4','125KTLX-G4 125kW'],
  ['SOFAR','BTS 5K','BTS 5K Battery'],
  ['SOFAR','BTS 5K-BDU','BTS 5K-BDU'],
  ['SOFAR','GTX5000S','GTX5000S 5.12kWh'],
  ['SOFAR','CH1000A','CH1000A Control Hub'],
  ['SOFAR','Smart Meter','Smart Meter'],
  ['DAPA POWER','DP-512314','DAPA Power 51.2V 314Ah']
];

const money = n => new Intl.NumberFormat('en-US').format(Math.round(Number(n) || 0));
const today = () => new Date().toISOString().slice(0,10);
const makeNo = prefix => `${prefix}${String(Date.now()).slice(-6)}`;

function amountWords(num){
  const n = Math.round(Number(num)||0);
  if (!n) return 'Zero MMKs Only';
  const ones=['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const under100=x=>x<20?ones[x]:tens[Math.floor(x/10)]+(x%10?` ${ones[x%10]}`:'');
  const under1000=x=>x<100?under100(x):`${ones[Math.floor(x/100)]} Hundred${x%100?' '+under100(x%100):''}`;
  const parts=[]; let x=n;
  if(x>=1e9){parts.push(under1000(Math.floor(x/1e9))+' Billion');x%=1e9}
  if(x>=1e6){parts.push(under1000(Math.floor(x/1e6))+' Million');x%=1e6}
  if(x>=1000){parts.push(under1000(Math.floor(x/1000))+' Thousand');x%=1000}
  if(x) parts.push(under1000(x));
  return parts.join(' ')+' MMKs Only';
}

function blankItem(){ return {brand:'', product:'', code:'', qty:1, unitPrice:''}; }
function newDocument(type){
  return {
    type,
    date:today(),
    number:makeNo(type==='invoice'?'INV':'RCPT'),
    customerName:'', customerId:'', phone:'', address:'', paymentType:'COD',
    advance:'', paid:'', items:[blankItem()],
    customerApproved:'', accountName:'', approvedBy:'Myat Htun Thu', approvedDate:today()
  };
}

function App(){
  const [page,setPage]=useState('home');
  const [docType,setDocType]=useState('invoice');
  const [doc,setDoc]=useState(()=>newDocument('invoice'));
  const [history,setHistory]=useState(()=>JSON.parse(localStorage.getItem('aura_docs')||'[]'));
  const [notice,setNotice]=useState('');
  const previewRef=useRef(null);

  useEffect(()=>{ localStorage.setItem('aura_docs',JSON.stringify(history)); },[history]);
  const total=useMemo(()=>doc.items.reduce((s,i)=>s+(Number(i.qty)||0)*(Number(i.unitPrice)||0),0),[doc.items]);
  const balance=docType==='invoice' ? Math.max(total-(Number(doc.advance)||0),0) : 0;
  const receiptPaid=Number(doc.paid)||0;

  const update=(key,val)=>setDoc(d=>({...d,[key]:val}));
  const updateItem=(idx,key,val)=>setDoc(d=>({...d,items:d.items.map((it,i)=>i===idx?{...it,[key]:val}:it)}));
  const addItem=()=>setDoc(d=>({...d,items:[...d.items,blankItem()]}));
  const removeItem=i=>setDoc(d=>({...d,items:d.items.filter((_,idx)=>idx!==i)}));
  const choosePreset=(idx,val)=>{
    const p=PRODUCT_PRESETS.find(x=>x[1]===val);
    if(!p) return;
    setDoc(d=>({...d,items:d.items.map((it,i)=>i===idx?{...it,brand:p[0],code:p[1],product:p[2]}:it)}));
  };
  const reset=()=>setDoc(newDocument(docType));
  const switchType=t=>{setDoc(newDocument(t));setDocType(t);setPage('documents');setNotice('');};
  const save=()=>{
    const entry={...doc,type:docType,id:crypto.randomUUID(),total:docType==='invoice'?total:receiptPaid,createdAt:new Date().toISOString()};
    setHistory(h=>[entry,...h].slice(0,50)); setNotice(`${docType==='invoice'?'Invoice':'Receipt'} saved.`);
  };
  const loadEntry=e=>{setDoc({...e});setDocType(e.type);setPage('documents');setNotice('Loaded from history.');};

  const exportImage=async()=>{
    if(!previewRef.current)return;
    const canvas=await html2canvas(previewRef.current,{scale:2,backgroundColor:'#fff',useCORS:true});
    const a=document.createElement('a'); a.download=`${doc.number}.png`; a.href=canvas.toDataURL('image/png'); a.click();
  };
  const exportPdf=async()=>{
    if(!previewRef.current)return;
    const canvas=await html2canvas(previewRef.current,{scale:2,backgroundColor:'#fff',useCORS:true});
    const img=canvas.toDataURL('image/jpeg',0.95);
    const pdf=new jsPDF('p','mm','a4');
    const w=210, h=canvas.height*w/canvas.width;
    pdf.addImage(img,'JPEG',0,0,w,Math.min(h,297)); pdf.save(`${doc.number}.pdf`);
  };

  return <div className="app-shell">
    <header className="appbar"><div className="appbar-inner">
      <button className="brand-button" onClick={()=>setPage('home')}><img src="/aura-logo-header.png"/><span>AURA DOCUMENT CENTER<small>Invoice • Receipt</small></span></button>
      <nav><button className={page==='home'?'active':''} onClick={()=>setPage('home')}>Home</button><button className={page==='documents'?'active':''} onClick={()=>setPage('documents')}>Documents</button><button className={page==='history'?'active':''} onClick={()=>setPage('history')}>History <b>{history.length}</b></button></nav>
    </div></header>

    {page==='home'&&<Home onInvoice={()=>switchType('invoice')} onReceipt={()=>switchType('receipt')} />}
    {page==='documents'&&<DocumentEditor {...{doc,docType,total,balance,receiptPaid,update,updateItem,addItem,removeItem,choosePreset,reset,save,exportImage,exportPdf,previewRef,notice,setNotice,setDocType}}/>}
    {page==='history'&&<History history={history} loadEntry={loadEntry} clear={()=>{if(confirm('Clear all saved documents?'))setHistory([])}}/>}
  </div>
}

function Home({onInvoice,onReceipt}){return <main className="home container">
  <section className="hero-panel"><div><div className="eyebrow">AURA ENERGY MYANMAR</div><h1>Invoice & Receipt<br/><em>from your phone.</em></h1><p>Create professional AURA documents without Excel. Fill in the form, preview the exact document layout, then save it as PDF or PNG and share it.</p><div className="hero-actions"><button className="primary" onClick={onInvoice}>＋ Create Sale Invoice</button><button className="secondary" onClick={onReceipt}>＋ Create Receipt</button></div></div><div className="phone-card"><div className="phone-top">AURA DOCUMENT CENTER</div><div className="mini-doc"><strong>SALE INVOICE</strong><span>Customer • Items • Total</span><span>Advance • Balance</span><div className="mini-line"/><b>PDF / PNG</b></div></div></section>
  <section className="feature-grid"><Feature n="01" title="Mobile First" text="Designed for Android phone use. No Excel required."/><Feature n="02" title="Two Templates" text="Sale Invoice and Receipt are separate, based on your existing documents."/><Feature n="03" title="Auto Calculate" text="Quantity × unit price, total, advance, balance and amount in words."/><Feature n="04" title="Save & Share" text="Keep recent documents on the device and export PDF / PNG."/></section>
  <section className="info-panel"><div><span className="eyebrow">CURRENT TEMPLATES</span><h2>Built from your actual AURA documents.</h2><p>The Sale Invoice follows your supplied layout with Bill To, date/invoice/customer ID/payment type, product table, total/advance/balance and signature areas. The Receipt follows your supplied Payment Detail, Paid Amount and Amount in Word layout.</p></div><div className="template-pills"><span>SALE INVOICE</span><span>RECEIPT</span><span>MMK</span><span>PDF</span><span>PNG</span></div></section>
</main>}
function Feature({n,title,text}){return <div className="feature"><b>{n}</b><strong>{title}</strong><span>{text}</span></div>}

function DocumentEditor(p){
 const {doc,docType,total,balance,receiptPaid,update,updateItem,addItem,removeItem,choosePreset,reset,save,exportImage,exportPdf,previewRef,notice,setNotice,setDocType}=p;
 return <main className="editor-wrap container">
   <div className="editor-toolbar"><div><span className="eyebrow">DOCUMENT BUILDER</span><h2>{docType==='invoice'?'Sale Invoice':'Receipt'}</h2></div><div className="type-switch"><button className={docType==='invoice'?'on':''} onClick={()=>{setDocType('invoice');setDoc(newDocument('invoice'))}}>Invoice</button><button className={docType==='receipt'?'on':''} onClick={()=>{setDocType('receipt');setDoc(newDocument('receipt'))}}>Receipt</button></div></div>
   {notice&&<div className="notice">✓ {notice}<button onClick={()=>setNotice('')}>×</button></div>}
   <div className="builder-grid">
    <section className="form-panel">
      <div className="panel-head"><h3>Enter Details</h3><button className="ghost" onClick={reset}>Clear / New</button></div>
      <div className="form-section"><h4>Document</h4><div className="form-grid"><label>Date<input type="date" value={doc.date} onChange={e=>update('date',e.target.value)}/></label><label>{docType==='invoice'?'Invoice No.':'Receipt No.'}<input value={doc.number} onChange={e=>update('number',e.target.value)}/></label><label>{docType==='invoice'?'Customer ID':'Payment Method'}<input value={docType==='invoice'?doc.customerId:doc.paymentType} onChange={e=>update(docType==='invoice'?'customerId':'paymentType',e.target.value)} placeholder={docType==='invoice'?'25':'Bank / Cash / Transfer'}/></label>{docType==='invoice'&&<label>Payment Type<select value={doc.paymentType} onChange={e=>update('paymentType',e.target.value)}><option>COD</option><option>Bank</option><option>Cash</option><option>Transfer</option><option>Credit</option></select></label>}</div></div>
      <div className="form-section"><h4>Customer</h4><div className="form-grid"><label>Customer Name<input value={doc.customerName} onChange={e=>update('customerName',e.target.value)} placeholder="Customer / Company"/></label><label>Phone<input value={doc.phone} onChange={e=>update('phone',e.target.value)} placeholder="09…"/></label><label className="wide">Address<textarea value={doc.address} onChange={e=>update('address',e.target.value)} rows="2" placeholder="Customer address"/></label></div></div>
      <div className="form-section"><div className="items-title"><h4>Products / Payment Detail</h4><button className="small-btn" onClick={addItem}>＋ Add Item</button></div>{doc.items.map((it,i)=><div className="item-editor" key={i}><div className="item-index">{i+1}</div><div><label>Brand<input value={it.brand} onChange={e=>updateItem(i,'brand',e.target.value)} placeholder="JA / SOFAR"/></label></div><div><label>Product<input list="product-list" value={it.product} onChange={e=>updateItem(i,'product',e.target.value)} placeholder="Product description"/></label></div><div><label>Code<input list="code-list" value={it.code} onChange={e=>{const val=e.target.value;const p=PRODUCT_PRESETS.find(x=>x[1]===val);if(p) choosePreset(i,val); else updateItem(i,'code',val)}} placeholder="Product code"/></label></div><div><label>Qty<input type="number" min="0" value={it.qty} onChange={e=>updateItem(i,'qty',e.target.value)}/></label></div><div><label>Unit Price<input type="number" min="0" value={it.unitPrice} onChange={e=>updateItem(i,'unitPrice',e.target.value)} placeholder="MMK"/></label></div><div className="item-amount">{money((Number(it.qty)||0)*(Number(it.unitPrice)||0))}</div>{doc.items.length>1&&<button className="remove" onClick={()=>removeItem(i)}>×</button>}</div>)}<datalist id="product-list">{PRODUCT_PRESETS.map(x=><option key={x[1]} value={x[2]}/>)}</datalist><datalist id="code-list">{PRODUCT_PRESETS.map(x=><option key={x[1]} value={x[1]}/>)}</datalist></div>
      {docType==='invoice'?<div className="form-section"><h4>Invoice Summary</h4><div className="form-grid"><label>Advance Deposit<input type="number" min="0" value={doc.advance} onChange={e=>update('advance',e.target.value)} placeholder="0"/></label><label>Balance (auto)<input value={money(balance)} readOnly/></label></div><div className="summary-total">TOTAL <strong>MMK {money(total)}</strong></div></div>:<div className="form-section"><h4>Receipt Payment</h4><div className="form-grid"><label>Paid Amount<input type="number" min="0" value={doc.paid} onChange={e=>update('paid',e.target.value)} placeholder="Paid amount"/></label><label>Amount in Words<input value={amountWords(receiptPaid)} readOnly/></label></div></div>}
      <div className="form-section"><h4>Signatures</h4><div className="form-grid"><label>{docType==='invoice'?'Customer Name':'Authorized Name'}<input value={docType==='invoice'?doc.customerApproved:doc.approvedBy} onChange={e=>update(docType==='invoice'?'customerApproved':'approvedBy',e.target.value)} placeholder="Name"/></label><label>Approved By<input value={doc.approvedBy} onChange={e=>update('approvedBy',e.target.value)}/></label><label>Approved Date<input type="date" value={doc.approvedDate} onChange={e=>update('approvedDate',e.target.value)}/></label></div></div>
      <div className="action-row"><button className="primary" onClick={save}>💾 Save</button><button className="secondary" onClick={exportPdf}>📄 PDF</button><button className="secondary" onClick={exportImage}>🖼️ PNG</button><button className="ghost" onClick={()=>window.print()}>🖨 Print</button></div>
    </section>
    <section className="preview-panel"><div className="preview-head"><h3>Live Preview</h3><span>A4</span></div><div className="paper-holder"><div ref={previewRef} className="document-paper">{docType==='invoice'?<InvoicePaper doc={doc} total={total} balance={balance}/>:<ReceiptPaper doc={doc} paid={receiptPaid}/>}</div></div></section>
   </div>
 </main>
}

function DocHeader({title}){return <div className="doc-header"><img src="/aura-logo-header.png"/><div className="company-title"><strong>Aura Energy Myanmar</strong><span>No.474, Yadanar Pone St, 132 Quarter, East Dagon, Yangon, Myanmar</span><span>09 - 255955556, 09750056925</span></div><div className="doc-title">{title}</div></div>}
function InvoicePaper({doc,total,balance}){const rows=[...doc.items,...Array(Math.max(0,13-doc.items.length)).fill(null)];return <div className="paper-content invoice-paper"><DocHeader title="SALE INVOICE"/><div className="invoice-meta"><div className="billto"><div className="bluebar">BILL TO</div><div className="bill-lines"><b>Customer Name</b><span>{doc.customerName}</span><b>Ph No.</b><span>{doc.phone}</span><b>Adress</b><span>{doc.address}</span></div></div><div className="meta-box"><div><b>DATE</b><span>{doc.date}</span></div><div><b>INVOICE No.</b><span>{doc.number}</span></div><div><b>CUSTOMER ID</b><span>{doc.customerId}</span></div><div><b>Payment Type</b><span>{doc.paymentType}</span></div></div></div><table className="doc-table"><thead><tr><th rowSpan="2">No.</th><th colSpan="2">DESCRIPTION</th><th rowSpan="2">Brand Name</th><th rowSpan="2">QTY</th><th rowSpan="2">UNIT PRICE(MMK)</th><th rowSpan="2">AMOUNT(MMK)</th></tr><tr><th>Product</th><th>Code</th></tr></thead><tbody>{rows.map((it,i)=><tr key={i}><td>{it?i+1:''}</td><td>{it?.product||''}</td><td>{it?.code||''}</td><td>{it?.brand||''}</td><td>{it?.qty||''}</td><td>{it?.unitPrice?money(it.unitPrice):''}</td><td>{it?(Number(it.qty)||0)*(Number(it.unitPrice)||0)?money((Number(it.qty)||0)*(Number(it.unitPrice)||0)):'':''}</td></tr>)}</tbody></table><div className="invoice-bottom"><div className="thank">Thank you for your business!</div><div className="totals"><div><span>TOTAL</span><b>{money(total)}</b></div><div><span>ADVANCE DEPOSIT</span><b>{money(doc.advance)}</b></div><div className="balance"><span>BALANCE</span><b>{money(balance)}</b></div></div></div><SignatureRow doc={doc} invoice/></div>}
function ReceiptPaper({doc,paid}){return <div className="paper-content receipt-paper"><DocHeader title="RECEIPT"/><div className="receipt-meta"><div><b>To</b><strong>{doc.customerName}</strong><span>{doc.address}</span></div><div className="right"><div><span>Receipt No.</span><b>{doc.number}</b></div><div><span>Receipt Date</span><b>{doc.date}</b></div><div><span>Payment Method</span><b>{doc.paymentType}</b></div></div></div><div className="payment-detail-title">PAYMENT DETAIL</div><table className="doc-table receipt-table"><thead><tr><th rowSpan="2">No.</th><th colSpan="2">DESCRIPTION</th><th rowSpan="2">Brand Name</th><th rowSpan="2">QTY</th><th rowSpan="2">UNIT PRICE(MMK)</th><th rowSpan="2">AMOUNT(MMK)</th></tr><tr><th>Product</th><th>Code</th></tr></thead><tbody>{doc.items.map((it,i)=><tr key={i}><td>{i+1}</td><td>{it.product}</td><td>{it.code}</td><td>{it.brand}</td><td>{it.qty}</td><td>{it.unitPrice?money(it.unitPrice):''}</td><td>{money((Number(it.qty)||0)*(Number(it.unitPrice)||0))}</td></tr>)}</tbody></table><div className="paid-band"><span>Paid Amount</span><b>MMK {money(paid)}</b></div><div className="receipt-word"><b>Amount In Word</b><strong>{amountWords(paid)}</strong></div><SignatureRow doc={doc}/></div>}
function SignatureRow({doc,invoice}){return <div className={invoice?'signature-row invoice-sign':'signature-row'}>{invoice&&<div><u>Customer</u><span>Sign ................................</span><span>Name {doc.customerApproved||'................................'}</span><span>Date ................................</span></div>}{invoice&&<div><u>Account</u><span>Sign ................................</span><span>Name ................................</span><span>Date ................................</span></div>}<div className="approved"><u>{invoice?'Approved By':'Authorized Signature'}</u><div className="signature-mark">✍</div><span>Sign ................................</span><span>Name - {doc.approvedBy}</span><span>Date - {doc.approvedDate}</span></div></div>}

function History({history,loadEntry,clear}){return <main className="container history-page"><div className="page-title"><div><span className="eyebrow">LOCAL HISTORY</span><h2>Saved Documents</h2></div>{history.length>0&&<button className="ghost danger" onClick={clear}>Clear All</button>}</div>{history.length===0?<div className="empty">No saved invoices or receipts yet.<br/>Create a document and tap <b>Save</b>.</div>:<div className="history-list">{history.map(e=><div className="history-card" key={e.id}><div className="history-icon">{e.type==='invoice'?'INV':'REC'}</div><div><strong>{e.number}</strong><span>{e.customerName||'No customer'} • {e.date}</span><small>{e.type==='invoice'?'Sale Invoice':'Receipt'} • MMK {money(e.total||0)}</small></div><button className="secondary" onClick={()=>loadEntry(e)}>Open</button></div>)}</div>}</main>}

createRoot(document.getElementById('root')).render(<App/>);
