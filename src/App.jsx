import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database'; 
import { RefreshCw, Calendar, LogOut, Lock, Search, Save, CheckCircle, BarChart3, ClipboardList, FileSpreadsheet, Users, Activity, AlertCircle, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';

// CONFIGURACIÓN FIREBASE (Manteniendo Realtime Database para evitar errores de cuota)
const firebaseConfig = {
  apiKey: "AIzaSyB2k-WOoIy_hSnzlkClaf7DCL3ERTbs-Qg",
  authDomain: "matrizpro-c27c6.firebaseapp.com",
  projectId: "matrizpro-c27c6",
  databaseURL: "https://matrizpro-c27c6-default-rtdb.firebaseio.com",
  storageBucket: "matrizpro-c27c6.firebasestorage.app",
  messagingSenderId: "529048990599",
  appId: "1:529048990599:web:787453dd2185ea06801922"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const styles = {
  container: { backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  wrapper: { width: '100%', maxWidth: '1600px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  logoSection: { display: 'flex', alignItems: 'center', gap: '15px' },
  
  // KPIs con el estilo de tu imagen
  kpiGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '25px' },
  kpiCard: (borderColor) => ({
    backgroundColor: '#0a0a0a',
    border: `1px solid ${borderColor}`,
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  }),
  
  // Filtros y Navegación
  navBtn: (active) => ({
    backgroundColor: active ? '#fbbf24' : '#0a0a0a',
    color: active ? '#000' : '#888',
    border: active ? 'none' : '1px solid #222',
    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
  }),
  filterRow: { display: 'flex', gap: '10px', marginBottom: '20px' },
  inputSearch: { backgroundColor: '#0a0a0a', border: '1px solid #222', color: '#fff', padding: '12px', borderRadius: '8px', flex: 2, display: 'flex', alignItems: 'center', gap: '10px' },
  select: { backgroundColor: '#0a0a0a', border: '1px solid #222', color: '#fff', padding: '12px', borderRadius: '8px', flex: 1, cursor: 'pointer' },
  
  // Tabla Estilo Original
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { color: '#fbbf24', textAlign: 'left', padding: '15px', fontSize: '12px', borderBottom: '1px solid #222', textTransform: 'uppercase' },
  td: { padding: '15px', borderBottom: '1px solid #111', verticalAlign: 'middle' },
  
  // Badge de Estado
  statusSelect: (status) => ({
    backgroundColor: '#0a0a0a',
    color: status === 'ACTIVO' ? '#34d399' : status === 'SIN ACTIVIDAD' ? '#ef4444' : '#fff',
    border: '1px solid #333',
    padding: '8px',
    borderRadius: '6px',
    width: '100%',
    fontWeight: 'bold'
  })
};

const ESTADOS_POSIBLES = ["ACTIVO", "SIN ACTIVIDAD", "VACACIONES", "REPOSO", "EGRESO", "AUSENCIA INJUSTIFICADA"];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("auditoria");
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros originales
  const [busqueda, setBusqueda] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  useEffect(() => {
    const dbRef = ref(db, 'personal');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Mapeo flexible para nombres de columnas (ID, Sede, region, etc)
        const lista = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setPersonal(lista);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Lógica de filtrado reactivo
  const filtrados = useMemo(() => {
    return personal.filter(p => {
      const nombreCompleto = `${p.Nombre || ''} ${p.Apellido || ''} ${p.ID || ''} ${p.region || p.Región || ''}`.toLowerCase();
      const pMes = (p.mes || p.Mes || "").toUpperCase();
      const pFecha = (p.fecha || p.Fecha || p.FECHA || "");

      const matchBusqueda = nombreCompleto.includes(busqueda.toLowerCase());
      const matchMes = !filtroMes || pMes === filtroMes;
      const matchFecha = !filtroFecha || pFecha === filtroFecha;

      return matchBusqueda && matchMes && matchFecha;
    });
  }, [personal, busqueda, filtroMes, filtroFecha]);

  // Listas para los selects
  const listaMeses = useMemo(() => [...new Set(personal.map(p => (p.mes || p.Mes || "").toUpperCase()).filter(Boolean))], [personal]);
  const listaFechas = useMemo(() => [...new Set(personal.map(p => p.fecha || p.Fecha || p.FECHA).filter(Boolean))].sort(), [personal]);

  const cantActivos = filtrados.filter(p => p.status === "ACTIVO").length;
  const cantSinActividad = filtrados.filter(p => p.status === "SIN ACTIVIDAD").length;

  const handleSave = async (id, status) => {
    if(!status) return;
    try {
      await update(ref(db, `personal/${id}`), { status, bloqueado: true });
    } catch (e) { alert("Error al guardar"); }
  };

  if (!isAuthenticated) return (
    <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', backgroundColor:'#000'}}>
      <button onClick={() => setIsAuthenticated(true)} style={{padding:'15px 30px', backgroundColor:'#fbbf24', fontWeight:'bold', cursor:'pointer', borderRadius:'8px'}}>ENTRAR A MATRIZ PRO</button>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        
        {/* HEADER ORIGINAL */}
        <header style={styles.header}>
          <div style={styles.logoSection}>
             <img src="/logo-canguro.png" alt="Canguro" style={{width:'40px'}} />
             <div>
                <h1 style={{margin:0, fontSize:'24px', fontWeight:'900'}}>MATRIZ ASISTENCIA <span style={{color:'#fbbf24'}}>PRO</span></h1>
                <p style={{margin:0, fontSize:'12px', color:'#555', fontWeight:'bold'}}>SISTEMA NACIONAL 2026</p>
             </div>
          </div>
          <div style={{display:'flex', gap:'10px'}}>
            <button style={{backgroundColor:'#166534', color:'#fff', border:'none', padding:'8px 15px', borderRadius:'6px', display:'flex', alignItems:'center', gap:5, cursor:'pointer'}}><FileSpreadsheet size={16}/> EXCEL</button>
            <button onClick={() => window.location.reload()} style={{backgroundColor:'#333', color:'#fff', border:'none', padding:'8px 15px', borderRadius:'6px', display:'flex', alignItems:'center', gap:5, cursor:'pointer'}}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""}/> {loading ? "CARGANDO..." : "REFRESCAR"}
            </button>
            <button onClick={() => setIsAuthenticated(false)} style={{backgroundColor:'#ef4444', color:'#fff', border:'none', padding:'8px 15px', borderRadius:'6px', display:'flex', alignItems:'center', gap:5, cursor:'pointer'}}><LogOut size={16}/> SALIR</button>
          </div>
        </header>

        {/* KPIs ORIGINALES (Imagen 6) */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard('#222')}>
            <span style={{fontSize:'10px', color:'#888', fontWeight:'bold'}}>REGISTROS FILTRADOS</span>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'10px'}}>
              <Users size={24} color="#888"/> <span style={{fontSize:'32px', fontWeight:'bold'}}>{filtrados.length}</span>
            </div>
          </div>
          <div style={styles.kpiCard('#fbbf24')}>
            <span style={{fontSize:'10px', color:'#fbbf24', fontWeight:'bold'}}>ACTIVOS</span>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'10px'}}>
              <Activity size={24} color="#fbbf24"/> <span style={{fontSize:'32px', fontWeight:'bold'}}>{cantActivos}</span>
            </div>
          </div>
          <div style={styles.kpiCard('#ef4444')}>
            <span style={{fontSize:'10px', color:'#ef4444', fontWeight:'bold'}}>SIN ACTIVIDAD</span>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'10px'}}>
              <AlertCircle size={24} color="#ef4444"/> <span style={{fontSize:'32px', fontWeight:'bold'}}>{cantSinActividad}</span>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN TABS */}
        <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
          <button style={styles.navBtn(activeTab === "auditoria")} onClick={() => setActiveTab("auditoria")}><ClipboardList size={18}/> AUDITORÍA</button>
          <button style={styles.navBtn(activeTab === "panel")} onClick={() => setActiveTab("panel")}><BarChart3 size={18}/> PANEL</button>
        </div>

        {/* FILTROS ORIGINALES */}
        <div style={styles.filterRow}>
          <div style={styles.inputSearch}>
            <Search size={18} color="#444"/>
            <input 
              style={{backgroundColor:'transparent', border:'none', color:'#fff', width:'100%', outline:'none'}} 
              placeholder="Buscar ID, Nombre, Región..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)} 
            />
          </div>
          <select style={styles.select} value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
            <option value="">MES (TODOS)</option>
            {listaMeses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select style={styles.select} value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}>
            <option value="">FECHA (TODAS)</option>
            {listaFechas.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {activeTab === "auditoria" ? (
          <div style={{backgroundColor:'#0a0a0a', borderRadius:'12px', border:'1px solid #222'}}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>COLABORADOR</th>
                  <th style={styles.th}>REGIÓN / SUCURSAL</th>
                  <th style={styles.th}>FECHA CARGA</th>
                  <th style={{...styles.th, textAlign:'center'}}>ESTADO EN MATRIZ</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id}>
                    <td style={styles.td}>
                      <div style={{fontWeight:'bold', fontSize:'14px', textTransform:'uppercase'}}>{p.Nombre} {p.Apellido}</div>
                      <div style={{fontSize:'11px', color:'#555'}}>Identificación: {p.ID}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{color:'#fbbf24', fontSize:'13px', display:'flex', alignItems:'center', gap:4}}>
                        <MapPin size={12}/> {p.region || p.Región}
                      </div>
                      <div style={{fontSize:'12px', color:'#888'}}>{p.sucursal || p.Sede || p.Sucursal}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{fontSize:'13px', color:'#fff', display:'flex', alignItems:'center', gap:6}}>
                        <Calendar size={14} color="#888"/> {p.fecha || p.Fecha || p.FECHA}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{display:'flex', gap:'8px'}}>
                        <select 
                          style={styles.statusSelect(p.status)}
                          value={p.status || ""}
                          disabled={p.bloqueado}
                          onChange={(e) => {
                             const val = e.target.value;
                             setPersonal(prev => prev.map(item => item.id === p.id ? {...item, status: val} : item));
                          }}
                        >
                          <option value="">SELECCIONAR</option>
                          {ESTADOS_POSIBLES.map(est => <option key={est} value={est}>{est}</option>)}
                        </select>
                        <button 
                          onClick={() => !p.bloqueado && handleSave(p.id, p.status)}
                          style={{backgroundColor:'#fbbf24', border:'none', borderRadius:'6px', padding:'8px', cursor: p.bloqueado ? 'default' : 'pointer'}}
                        >
                          {p.bloqueado ? <CheckCircle size={18} color="#000"/> : <Save size={18} color="#000"/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* PANEL ESTADÍSTICO SENCILLO */
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
             <div style={{backgroundColor:'#0a0a0a', padding:'25px', borderRadius:'15px', border:'1px solid #222'}}>
                <h3 style={{color:'#fbbf24', marginTop:0}}>DISTRIBUCIÓN</h3>
                {ESTADOS_POSIBLES.map(est => {
                  const cant = filtrados.filter(x => x.status === est).length;
                  const porc = filtrados.length > 0 ? (cant / filtrados.length * 100).toFixed(1) : 0;
                  return (
                    <div key={est} style={{marginBottom:'15px'}}>
                      <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:4}}>
                        <span>{est}</span>
                        <span>{cant} ({porc}%)</span>
                      </div>
                      <div style={{height:'8px', backgroundColor:'#111', borderRadius:'4px', overflow:'hidden'}}>
                        <div style={{width:`${porc}%`, height:'100%', backgroundColor: est==='ACTIVO'?'#fbbf24':est==='SIN ACTIVIDAD'?'#ef4444':'#444'}}></div>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}