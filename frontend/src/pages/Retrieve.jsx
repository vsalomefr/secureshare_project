import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

function base64ToArrayBuffer(str){
  const binary = atob(str)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i=0;i<len;i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function importKey(raw) {
  return await window.crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt','decrypt'])
}

export default function Retrieve(){
  const { id } = useParams()
  const [status, setStatus] = useState('loading')
  const [plaintext, setPlaintext] = useState(null)

  useEffect(()=>{
    (async ()=>{
      try{
        const resp = await fetch(`/api/p/${id}`)
        if (!resp.ok) return setStatus('notfound')
        const j = await resp.json()
        const { ciphertext, iv } = j

        // Get key from fragment
        const frag = window.location.hash.slice(1)
        if (!frag) return setStatus('nokey')
        const keyBytes = new Uint8Array(atob(frag).split('').map(c=>c.charCodeAt(0)))
        const key = await importKey(keyBytes.buffer)

        const ctBuf = base64ToArrayBuffer(ciphertext)
        const ivBuf = base64ToArrayBuffer(iv)
        const dec = await window.crypto.subtle.decrypt({name:'AES-GCM', iv: ivBuf}, key, ctBuf)
        const decText = new TextDecoder().decode(dec)
        setPlaintext(decText)
        setStatus('ok')
      }catch(e){
        console.error(e)
        setStatus('error')
      }
    })()
  },[id])

  if (status==='loading') return <div>Chargement…</div>
  if (status==='notfound') return <div>Introuvable ou expiré.</div>
  if (status==='nokey') return <div>Clé manquante dans l'URL. Assure-toi d'avoir la partie après <code>#</code>.</div>
  if (status==='error') return <div>Erreur lors du déchiffrement. La clé est probablement invalide.</div>

  return (
    <div style={{maxWidth:720, margin:'0 auto', background:'#071021', padding:20, borderRadius:12}}>
      <h2>Secret récupéré</h2>
      <pre style={{whiteSpace:'pre-wrap', fontFamily:'monospace', background:'#021025', padding:12, borderRadius:8}}>{plaintext}</pre>
      <div style={{marginTop:12, fontSize:13}}>Une fois consulté, le secret peut être supprimé (si configuré).</div>
    </div>
  )
}
