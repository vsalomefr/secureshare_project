import React from 'react'
import { Outlet, Link } from 'react-router-dom'

export default function App(){
  return (
    <div style={{minHeight:'100vh', background:'#0b1020', color:'#eef2f7', fontFamily:'Inter, sans-serif'}}>
      <header style={{padding:'1rem 2rem', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1 style={{margin:0, color:'#e6f0ff'}}>SecureShare</h1>
        <nav>
          <Link to="/" style={{color:'#9fb7ff', textDecoration:'none'}}>Générateur</Link>
        </nav>
      </header>
      <main style={{padding:'2rem'}}>
        <Outlet />
      </main>
    </div>
  )
}
