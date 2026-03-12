import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from './firebaseConfig';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore'; 
import { RefreshCw, Calendar, LogOut, Lock, Search, Save, CheckCircle, BarChart3, ClipboardList, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const styles = {
  loginOverlay: { backgroundImage: 'url("/BOT.png")', backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', position: 'relative' },
  loginDarken: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1 },
  loginCard: { backgroundColor: '#111', padding: '40px', borderRadius: '20px', border: '1px solid #333', width: '350px', textAlign: 'center', zIndex: 2, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  container: { backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  wrapper: { width: '100%', maxWidth: '1600px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '20px' },
  logoSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  logoImg: { width: '150px', height: '150px', objectFit: 'contain' },
  navBar: { display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid #222', paddingBottom: '15px' },
  navBtn: (active) => ({
    backgroundColor: active ? '#fbbf24' : 'transparent',
    color: active ? '#000' : '#888',
    border: active ? 'none' : '1px solid #333',
    padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.3s'
  }),
  filterBox: { backgroundColor: '#111', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '10px', border: '1px solid #222', flexWrap: 'wrap', alignItems: 'center' },
  input: { backgroundColor: '#000', border: '1px solid #444', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', flex: '1', minWidth: '120px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { color: '#fbbf24', padding: '12px 15px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid #222', letterSpacing: '1px' },
  td: { padding: '10px 15px', borderBottom: '1px solid #111', backgroundColor: '#050505' },
  statusBadge: (status, bloqueado) => ({
    backgroundColor: bloqueado ? '#1a1a1a' : (status === 'SIN ACTIVIDAD' ? '#450a0a' : '#111'),
    color: bloqueado ? '#555' : (status === 'SIN ACTIVIDAD' ? '#ef4444' : '#fff'),
    border: `1px solid ${bloqueado ? '#222' : (status === 'SIN ACTIVIDAD' ? '#ef4444' : '#333')}`,
    padding: '6px 12px', borderRadius: '6px', width: '100%', cursor: bloqueado ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px'
  }),
  btnSave: (bloqueado) => ({
    backgroundColor: bloqueado ? 'transparent' : '#fbbf24',
    color: bloqueado ? '#fbbf24' : '#000',
    border: bloqueado ? '1px solid #fbbf24' : 'none',
    padding: '8px', borderRadius: '8px', cursor: bloqueado ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
  }),
  btnOut: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' },
  dashGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%' },
  dashCard: { backgroundColor: '#111', border: '1px solid #333', borderRadius: '20px', padding: '30px' },
};

const ESTADOS_POSIBLES = ["ACTIVO", "SIN ACTIVIDAD", "VACACIONES", "REPOSO", "EGRESO", "AUSENCIA INJUSTIFICADA"];
const MESES_LISTA = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("auditoria");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [busqueda, setBusqueda] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroRegion, setFiltroRegion] = useState("");
  const [filtroTienda, setFiltroTienda] = useState("");

  const fetchDatos = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const q = query(collection(db, "personal"), orderBy("Nombre", "asc"));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPersonal(docs);
    } catch (error) {
      if (error.message.includes("quota")) alert("⚠️ Límite agotado.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchDatos(); }, [fetchDatos]);

  const fechasDisponibles = useMemo(() => {
    const fechas = personal.map(p => p.fecha || p.Fecha || p.fechaCarga).filter(Boolean);
    return [...new Set(fechas)].sort((a, b) => b.localeCompare(a));
  }, [personal]);

  const regionesDisponibles = useMemo(() => [...new Set(personal.map(p => p.region))].filter(Boolean).sort(), [personal]);
  
  const tiendasDisponibles = useMemo(() => {
    const base = filtroRegion ? personal.filter(p => p.region === filtroRegion) : personal;
    return [...new Set(base.map(p => p.sucursal))].filter(Boolean).sort();
  }, [personal, filtroRegion]);

  // --- LÓGICA DE FILTRADO OPTIMIZADA PARA LA COLUMNA O (mes) ---
  const filtrados = useMemo(() => {
    return personal.filter(p => {
      const pNombre = `${p.Nombre} ${p.Apellido} ${p.ID}`.toLowerCase();
      const pFechaStr = (p.fecha || p.Fecha || p.fechaCarga || "").toString();
      // Tomamos el mes de la columna O y lo pasamos a Mayúsculas para comparar
      const pMesColumna = (p.mes || "").toString().toUpperCase();

      const matchSearch = pNombre.includes(busqueda.toLowerCase());
      // Filtramos directamente comparando el texto del mes
      const matchMes = !filtroMes || pMesColumna === filtroMes;
      const matchFecha = !filtroFecha || pFechaStr === filtroFecha;
      const matchRegion = !filtroRegion || p.region === filtroRegion;
      const matchTienda = !filtroTienda || p.sucursal === filtroTienda;

      return matchSearch && matchMes && matchFecha && matchRegion && matchTienda;
    });
  }, [personal, busqueda, filtroMes, filtroFecha, filtroRegion, filtroTienda]);

  const statsPorEstado = useMemo(() => {
    const total = filtrados.length || 0;
    return ESTADOS_POSIBLES.map(est => {
      const cant = filtrados.filter(p => p.status === est).length;
      return {
        nombre: est, cantidad: cant,
        porcentaje: total > 0 ? ((cant / total) * 100).toFixed(1) : 0,
        color: est === "ACTIVO" ? "#fbbf24" : est === "SIN ACTIVIDAD" ? "#ef4444" : "#555"
      };
    });
  }, [filtrados]);

  const handleGuardar = async (id, statusActual) => {
    if (window.confirm("¿Confirmar guardado en Matriz?")) {
      try {
        await updateDoc(doc(db, "personal", id), { 
          status: statusActual, 
          bloqueado: true, 
          fechaBloqueo: new Date().toISOString() 
        });
        setPersonal(prev => prev.map(p => p.id === id ? { ...p, status: statusActual, bloqueado: true } : p));
      } catch (error) { alert("Error: " + error.message); }
    }
  };

  if (!isAuthenticated) return (
    <div style={styles.loginOverlay}>
      <div style={styles.loginDarken}></div>
      <div style={styles.loginCard}>
        <Lock size={40} color="#fbbf24" style={{marginBottom:'20px'}}/>
        <h2 style={{color:'#fff', marginBottom:'20px'}}>MATRIZ SRT 2026</h2>
        <form onSubmit={(e) => { e.preventDefault(); if (user === "ADMCanguro" && pass === "SRT2026") setIsAuthenticated(true); else alert("Denegado"); }}>
          <input style={{...styles.input, width:'90%', marginBottom:'10px'}} placeholder="Usuario" onChange={e=>setUser(e.target.value)} />
          <input type="password" style={{...styles.input, width:'90%', marginBottom:'20px'}} placeholder="Contraseña" onChange={e=>setPass(e.target.value)} />
          <button type="submit" style={{backgroundColor:'#fbbf24', color:'#000', width:'100%', padding:'12px', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>ENTRAR AL PANEL</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <header style={styles.header}>
          <div style={styles.logoSection}>
            <img src="/logo-canguro.png" alt="Logo" style={styles.logoImg} />
            <div>
              <h1 style={{margin:0, fontSize:'28px', fontStyle:'italic', fontWeight:'900'}}>MATRIZ ASISTENCIA <span style={{color:'#fbbf24'}}>PRO</span></h1>
              <p style={{margin:0, color:'#555', fontSize:'14px', fontWeight:'bold'}}>SISTEMA DE AUDITORÍA NACIONAL 2026</p>
            </div>
          </div>
          <div style={{display:'flex', gap:'10px'}}>
            <button onClick={fetchDatos} style={{...styles.btnOut, backgroundColor: '#333'}}>
              <RefreshCw size={18} className={loading ? "animate-spin" : ""}/> REFRESCAR BDD
            </button>
            <button onClick={()=>setIsAuthenticated(false)} style={styles.btnOut}><LogOut size={18}/> SALIR</button>
          </div>
        </header>

        <nav style={styles.navBar}>
          <button style={styles.navBtn(activeTab === "auditoria")} onClick={() => setActiveTab("auditoria")}>
            <ClipboardList size={18}/> AUDITORÍA DE CAMPO
          </button>
          <button style={styles.navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>
            <BarChart3 size={18}/> DASHBOARD REACTIVO
          </button>
        </nav>

        <div style={styles.filterBox}>
          <div style={{flex:2, display:'flex', alignItems:'center', backgroundColor:'#000', borderRadius:'8px', padding:'0 15px', border:'1px solid #222', minWidth:'220px'}}>
            <Search size={18} color="#444"/><input style={{...styles.input, border:'none'}} placeholder="Buscar por Nombre, ID o Sucursal..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          </div>
          <select style={styles.input} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}>
            <option value="">MES (TODOS)</option>
            {MESES_LISTA.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select style={styles.input} value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)}>
            <option value="">FECHA ESPECÍFICA</option>
            {fechasDisponibles.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select style={styles.input} value={filtroRegion} onChange={e=>{setFiltroRegion(e.target.value); setFiltroTienda("");}}>
            <option value="">REGIÓN</option>
            {regionesDisponibles.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <select style={styles.input} value={filtroTienda} onChange={e=>setFiltroTienda(e.target.value)}>
            <option value="">SUCURSAL</option>
            {tiendasDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {activeTab === "auditoria" ? (
          <div style={{backgroundColor: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #333'}}>
            <table style={styles.table}>
              <thead>
                <tr style={{backgroundColor: '#1a1a1a'}}>
                  <th style={styles.th}>COLABORADOR / SEDE</th>
                  <th style={styles.th}>FECHA</th>
                  <th style={{...styles.th, textAlign:'center'}}>GESTIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id}>
                    <td style={styles.td}>
                      <div style={{textTransform:'uppercase', fontWeight:'bold'}}>{p.Nombre} {p.Apellido}</div>
                      <div style={{fontSize:'13px', color:'#fbbf24'}}>{p.sucursal} | {p.region}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{fontSize:'14px', color:'#666', display:'flex', alignItems:'center', gap:'5px'}}>
                        <Calendar size={14}/> {p.fecha || p.Fecha || '---'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{display:'flex', gap:'8px', justifyContent:'center'}}>
                        <select value={p.status} disabled={p.bloqueado} onChange={(e) => {
                          const val = e.target.value;
                          setPersonal(prev => prev.map(item => item.id === p.id ? {...item, status: val} : item));
                        }} style={styles.statusBadge(p.status, p.bloqueado)}>
                          {ESTADOS_POSIBLES.map(est => <option key={est} value={est}>{est}</option>)}
                        </select>
                        <button onClick={() => !p.bloqueado && handleGuardar(p.id, p.status)} style={styles.btnSave(p.bloqueado)}>
                          {p.bloqueado ? <CheckCircle size={18} /> : <Save size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.dashGrid}>
            <div style={styles.dashCard}>
              <h3 style={{color: '#fbbf24', marginBottom:'25px'}}>MÉTRICAS POR ESTADO</h3>
              {statsPorEstado.map(est => (
                <div key={est.nombre} style={{marginBottom:'15px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px'}}>
                    <span>{est.nombre}</span>
                    <span style={{color: est.color, fontWeight:'bold'}}>{est.cantidad} ({est.porcentaje}%)</span>
                  </div>
                  <div style={{height:'8px', backgroundColor:'#222', borderRadius:'4px', overflow:'hidden'}}>
                    <div style={{width:`${est.porcentaje}%`, height:'100%', backgroundColor: est.color, transition:'width 1s'}}></div>
                  </div>
                </div>
              ))}
            </div>
            <div style={styles.dashCard}>
              <h4 style={{textAlign:'center', color:'#888', marginBottom:'30px'}}>DISTRIBUCIÓN VISUAL</h4>
              <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-around', height:'200px'}}>
                {statsPorEstado.map(est => (
                  <div key={est.nombre+"bar"} style={{display:'flex', flexDirection:'column', alignItems:'center', flex:1}}>
                    <div style={{width:'30px', height:`${Math.max(est.porcentaje, 5)}%`, backgroundColor: est.color, borderRadius:'4px 4px 0 0'}}></div>
                    <span style={{fontSize:'8px', color:'#444', marginTop:'8px'}}>{est.nombre.substring(0,5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}