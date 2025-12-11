import React from 'react'
import Generator from '../components/Generator'

export default function Home(){
  return (
    <div style={{maxWidth:900, margin:'0 auto', display:'grid', gap:20}}>
      <div style={{background:'#0f1724', padding:20, borderRadius:12}}>
        <h2 style={{color:'#e6f0ff'}}>Générateur de mots de passe</h2>
        <p style={{color:'#bcd'}}>Aucune donnée n'est stockée en clair sur le serveur. Le mot de passe est chiffré côté client (AES-GCM) et seul le fragment contient la clé de déchiffrement.</p>
        <Generator />
      </div>
    </div>
  )
}
