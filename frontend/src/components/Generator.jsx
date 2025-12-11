import React, { useState } from 'react'

// util: generate password
function makePassword(length, opts){
  const lowers = 'abcdefghijklmnopqrstuvwxyz'
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const specials = '!@#$%^&*()-_=+[]{};:,.<>?'
  let charset = ''
  if (opts.lower) charset += lowers
  if (opts.upper) charset += uppers
  if (opts.digits) charset += digits
  if (opts.special) charset += specials
  if (!charset) charset = lowers
  let out = ''
  const cryptoObj = window.crypto || window.msCrypto
  const random = new Uint32Array(length)
  cryptoObj.getRandomValues(random)
  for (let i=0;i<length;i++){ out += charset[random[i] % charset.length] }
  return out
}

// webcrypto helpers (AES-GCM)
async function importKey(raw) {
  return await window.crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt','decrypt'])
}
async function encryptString(keyBytes, plaintext){
  const key = await importKey(keyBytes)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ct = await window.crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(plaintext))
  return {ciphertext: arrayBufferToBase64(ct), iv: arrayBufferToBase64(iv)}
}
function arrayBufferToBase64(buf){
  const bytes = new Uint8Array(buf)
  let binary=''
  for (let i=0;i<bytes.byteLength;i++) binary+=String.fromCharCode(bytes[i])
  return btoa(binary)
}
function base64ToArrayBuffer(str){
  const binary = atob(str)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i=0;i<len;i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export default function Generator(){
  const [length, setLength] = useState(16)
  const [opts, setOpts] = useState({lower:true, upper:true, digits:true, special:false})
  const [password, setPassword] = useState('')
  const [link, setLink] = useState(null)
  const [expireMode, setExpireMode] = useState('onView')
  const [duration, setDuration] = useState(3600)

  function toggleOpt(k){ setOpts(s=>({...s, [k]: !s[k]})) }

  function generate(){
    const pwd = makePassword(length, opts)
    setPassword(pwd)
  }

  async function share(){
    if (!password) return alert('Génère d\'abord un mot de passe')

    // generate random AES key (256 bits)
    const keyBytes = window.crypto.getRandomValues(new Uint8Array(32))
    const {ciphertext, iv} = await encryptString(keyBytes, password)

    // send ciphertext to backend
    const expiresInSec = expireMode === 'duration' ? duration : null
    const resp = await fetch('/api/create', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ciphertext, iv, expiresInSec, expireOnView: expireMode === 'onView'})
    })
    if (!resp.ok) return alert('Erreur création')
    const j = await resp.json()
    const id = j.id

    // key to share: base64 of keyBytes
    const keyB64 = btoa(String.fromCharCode(...keyBytes))
    const url = `${window.location.origin}/p/${id}#${keyB64}`
    setLink(url)
  }

  return (
    <div style={{display:'grid', gap:12}}>
      <div style={{display:'flex', gap:12, alignItems:'center'}}>
        <label>Longueur: <strong>{length}</strong></label>
        <input type="range" min={6} max={32} value={length} onChange={e=>setLength(parseInt(e.target.value))} />
      </div>

      <div style={{display:'flex', gap:12}}>
        <label><input type="checkbox" checked={opts.lower} onChange={()=>toggleOpt('lower')} /> minuscules</label>
        <label><input type="checkbox" checked={opts.upper} onChange={()=>toggleOpt('upper')} /> majuscules</label>
        <label><input type="checkbox" checked={opts.digits} onChange={()=>toggleOpt('digits')} /> chiffres</label>
        <label><input type="checkbox" checked={opts.special} onChange={()=>toggleOpt('special')} /> spéciaux</label>
      </div>

      <div style={{display:'flex', gap:8}}>
        <button onClick={generate} style={{padding:'8px 12px', borderRadius:8, background:'#204070', color:'#fff', border:'none'}}>Générer</button>
        <button onClick={share} style={{padding:'8px 12px', borderRadius:8, background:'#2a6bd6', color:'#fff', border:'none'}}>Partager (lien éphémère)</button>
      </div>

      {password && (
        <div style={{padding:12, background:'#071021', borderRadius:8}}>
          <label style={{fontSize:12, color:'#9fb7ff'}}>Mot de passe</label>
          <div style={{fontFamily:'monospace', marginTop:6}}>{password}</div>
        </div>
      )}

      <div style={{padding:12, background:'#071021', borderRadius:8}}>
        <label style={{fontSize:12, color:'#9fb7ff'}}>Expiration</label>
        <div style={{display:'flex', gap:12, marginTop:6}}>
          <label><input type="radio" name="exp" checked={expireMode==='onView'} onChange={()=>setExpireMode('onView')} /> À la première consultation</label>
          <label><input type="radio" name="exp" checked={expireMode==='duration'} onChange={()=>setExpireMode('duration')} /> Durée</label>
        </div>
        {expireMode==='duration' && (
          <div style={{marginTop:8}}>
            <input type="range" min={3600} max={259200} step={Math.floor((259200-3600)/9)} value={duration} onChange={e=>setDuration(parseInt(e.target.value))} />
            <div>{Math.round(duration/3600*100)/100} heures</div>
          </div>
        )}
      </div>

      {link && (
        <div style={{padding:12, background:'#081226', borderRadius:8}}>
          <label style={{fontSize:12, color:'#9fb7ff'}}>Lien éphémère (copier + envoyer)</label>
          <input readOnly value={link} style={{width:'100%', marginTop:6, background:'#071021', color:'#cfe8ff', border:'1px solid rgba(255,255,255,0.04)', padding:8}}/>
          <div style={{marginTop:8, fontSize:12, color:'#9fb7ff'}}>Important: la partie après <code>#</code> (clé) n'est pas transmise au serveur. Envoie le lien complet au destinataire.</div>
        </div>
      )}
    </div>
  )
}
