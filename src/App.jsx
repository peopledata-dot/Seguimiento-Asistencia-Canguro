import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database'; 
import { RefreshCw, Calendar, LogOut, Lock, Search, Save, CheckCircle, BarChart3, ClipboardList, FileSpreadsheet, Users, Activity, AlertCircle, MapPin, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';

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

// Estilos mejorados para KPIs y Tablas
const styles = {
  container: { backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'Inter, sans-serif' },
  wrapper: { maxWidth: '1600px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' },
  kpiCard: (color) => ({
    background: 'linear-gradient(145deg, #111, #050505)',
    borderLeft: `5px solid ${color}`,
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  }),
  filterBox: { 
    backgroundColor: '#111', 
    padding: '20px', 
    borderRadius: '15px', 
    marginBottom: '20px', 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
    gap: '15px',
    border: '1px solid #222'
  },
  input: { backgroundColor: '#000', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '8px', outline: 'none' },
  navBtn: (active) => ({
    backgroundColor: active ? '#fbbf24' : 'transparent',
    color: active ? '#000' : '#888',
    padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', border: active ? 'none' : '1px solid #333', display: 'flex', alignItems: 'center', gap: '8px'
  }),
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' },
  tr: { backgroundColor: '#0a0a0a', transition: '0.3s' },
  td: { padding: '16px', borderBottom: '1px solid #1a1a1a' },
  statusBadge: (status) => ({
    backgroundColor: status === 'ACTIVO' ? '#064e3b' : status === 'SIN ACTIVIDAD' ? '#450a0a' : '#1a1a1a',
    color: status === 'ACTIVO' ? '#34d399' : status === 'SIN ACTIVIDAD' ? '#ef4444' : '#888',
    padding: '8px', borderRadius: '6px', border: 'none', fontWeight: 'bold', width: '100%'
  })
};

const ESTADOS_POSIBLES = ["ACTIVO", "SIN ACTIVIDAD", "VACACIONES", "REPOSO", "EGRESO", "AUSENCIA INJUSTIFICADA"];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("auditoria");
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroRegion, setFiltroRegion] = useState("");
  const [filtroSede, setFiltroSede] = useState("");

  useEffect(() => {
    const dbRef = ref(db, 'personal');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setPersonal(lista);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Listas Dinámicas para los Selects ---
  const regiones = useMemo(() => [...new Set(personal.map(p => p.region || p.Región).filter(Boolean))], [personal]);
  const sedes = useMemo(() => [...new Set(personal.map(p => p.sucursal || p.Sede || p.Sucursal).filter(Boolean))], [personal]);
  const meses = useMemo(() => [...new Set(personal.map(p => (p.mes || p.Mes || "").toUpperCase()).filter(Boolean))], [personal]);

  // --- Lógica de Filtrado ---
  const filtrados = useMemo(() => {
    return personal.filter(p => {
      const pNombre = `${p.Nombre || ''} ${p.Apellido || ''} ${p.ID || ''}`.toLowerCase();
      const pReg = (p.region || p.Región || "").toLowerCase();
      const pSed = (p.sucursal || p.Sede || p.Sucursal || "").toLowerCase();
      const pM = (p.mes || p.Mes || "").toUpperCase();

      const matchSearch = pNombre.includes(busqueda.toLowerCase());
      const matchReg = !filtroRegion || pReg === filtroRegion.toLowerCase();
      const matchSed = !filtroSede || pSed === filtroSede.toLowerCase();
      const matchMes = !filtroMes || pM === filtroMes;

      return matchSearch && matchReg && matchSed && matchMes;
    });
  }, [personal, busqueda, filtroRegion, filtroSede, filtroMes]);

  // --- KPIs Reactivos ---
  const kpis = useMemo(() => ({
    total: filtrados.length,
    activos: filtrados.filter(p => p.status === "ACTIVO").length,
    alertas: filtrados.filter(p => p.status === "SIN ACTIVIDAD").length
  }), [filtrados]);

  const handleGuardar = async (id, statusActual) => {
    if (!statusActual) return alert("Seleccione un estado");
    try {
      await update(ref(db, `personal/${id}`), { status: statusActual, bloqueado: true });
    } catch (e) { alert("Error: " + e.message); }
  };

  if (!isAuthenticated) return (
    <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', backgroundColor:'#000'}}>
        <div style={{textAlign:'center', padding:'40px', background:'#111', borderRadius:'20px', border:'1px solid #333'}}>
            <h2 style={{color:'#fbbf24', marginBottom:'20px'}}>MATRIZ SRT 2026</h2>
            <button onClick={() => setIsAuthenticated(true)} style={{padding:'15px 40px', backgroundColor:'#fbbf24', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer'}}>INGRESAR AL SISTEMA</button>
        </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <header style={styles.header}>
          <div>
            <h1 style={{margin:0, fontSize:'32px', fontWeight:'900'}}>MATRIZ <span style={{color:'#fbbf24'}}>PRO</span></h1>
            <p style={{color:'#555', margin:0}}>Control de Asistencia Nacional</p>
          </div>
          <div style={{display:'flex', gap:'10px'}}>
             <button onClick={() => window.location.reload()} style={styles.navBtn(false)}><RefreshCw size={18}/> {loading ? "Cargando..." : "Refrescar"}</button>
             <button onClick={() => setIsAuthenticated(false)} style={{...styles.navBtn(false), backgroundColor:'#ef4444', color:'#fff', border:'none'}}><LogOut size={18}/> Salir</button>
          </div>
        </header>

        {/* KPIs VISUALES MEJORADOS */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard('#888')}>
            <span style={{color:'#888', fontSize:'14px', fontWeight:'bold'}}>REGISTROS EN VISTA</span>
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
              <Users size={35} color="#fbbf24"/><span style={{fontSize:'40px', fontWeight:'bold'}}>{kpis.total}</span>
            </div>
          </div>
          <div style={styles.kpiCard('#34d399')}>
            <span style={{color:'#34d399', fontSize:'14px', fontWeight:'bold'}}>PERSONAL ACTIVO</span>
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
              <Activity size={35} color="#34d399"/><span style={{fontSize:'40px', fontWeight:'bold'}}>{kpis.activos}</span>
            </div>
          </div>
          <div style={styles.kpiCard('#ef4444')}>
            <span style={{color:'#ef4444', fontSize:'14px', fontWeight:'bold'}}>SIN ACTIVIDAD</span>
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
              <AlertCircle size={35} color="#ef4444"/><span style={{fontSize:'40px', fontWeight:'bold'}}>{kpis.alertas}</span>
            </div>
          </div>
        </div>

        <nav style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
          <button style={styles.navBtn(activeTab === "auditoria")} onClick={() => setActiveTab("auditoria")}><ClipboardList size={18}/> Auditoría</button>
          <button style={styles.navBtn(activeTab === "panel")} onClick={() => setActiveTab("panel")}><BarChart3 size={18}/> Panel Estadístico</button>
        </nav>

        {/* FILTROS DINÁMICOS */}
        <div style={styles.filterBox}>
          <input style={styles.input} placeholder="Buscar por Nombre o ID..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          
          <select style={styles.input} value={filtroRegion} onChange={e=>setFiltroRegion(e.target.value)}>
            <option value="">TODAS LAS REGIONES</option>
            {regiones.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select style={styles.input} value={filtroSede} onChange={e=>setFiltroSede(e.target.value)}>
            <option value="">TODAS LAS SEDES</option>
            {sedes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select style={styles.input} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}>
            <option value="">TODOS LOS MESES</option>
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {activeTab === "auditoria" ? (
          <div style={{overflowX:'auto'}}>
            <table style={styles.table}>
              <thead>
                <tr style={{textAlign:'left', color:'#fbbf24', fontSize:'12px'}}>
                  <th style={{padding:'15px'}}>COLABORADOR</th>
                  <th>UBICACIÓN</th>
                  <th>FECHA CARGA</th>
                  <th style={{textAlign:'center'}}>ESTADO MATRIZ</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{fontWeight:'bold', textTransform:'uppercase'}}>{p.Nombre} {p.Apellido}</div>
                      <div style={{fontSize:'12px', color:'#555'}}>ID: {p.ID}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{display:'flex', alignItems:'center', gap:5, fontSize:'13px', color:'#fbbf24'}}><MapPin size={14}/> {p.region || p.Región}</div>
                      <div style={{display:'flex', alignItems:'center', gap:5, fontSize:'12px'}}><Building2 size={14}/> {p.sucursal || p.Sede || p.Sucursal}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{fontSize:'13px'}}><Calendar size={14} style={{marginRight:5}}/> {p.fecha || p.Fecha || p.FECHA}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{display:'flex', gap:'10px'}}>
                        <select 
                          style={styles.statusBadge(p.status)}
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
                          onClick={() => !p.bloqueado && handleGuardar(p.id, p.status)}
                          style={{backgroundColor: p.bloqueado ? 'transparent' : '#fbbf24', border:'none', padding:'10px', borderRadius:'8px', cursor: p.bloqueado ? 'default' : 'pointer'}}
                        >
                          {p.bloqueado ? <CheckCircle size={18} color="#fbbf24"/> : <Save size={18} color="#000"/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
             <div style={{backgroundColor:'#111', padding:'30px', borderRadius:'15px', border:'1px solid #333'}}>
                <h3 style={{color:'#fbbf24', marginBottom:'20px'}}>Distribución por Estado</h3>
                {ESTADOS_POSIBLES.map(est => {
                  const cant = filtrados.filter(x => x.status === est).length;
                  const porc = filtrados.length > 0 ? (cant / filtrados.length * 100).toFixed(1) : 0;
                  return (
                    <div key={est} style={{marginBottom:'15px'}}>
                      <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'5px'}}>
                        <span>{est}</span>
                        <span>{cant} pers. ({porc}%)</span>
                      </div>
                      <div style={{height:'10px', backgroundColor:'#000', borderRadius:'5px'}}>
                        <div style={{width:`${porc}%`, height:'100%', backgroundColor: est==='ACTIVO'?'#34d399':est==='SIN ACTIVIDAD'?'#ef4444':'#555', borderRadius:'5px'}}></div>
                      </div>
                    </div>
                  )
                })}
             </div>
             <div style={{backgroundColor:'#111', padding:'30px', borderRadius:'15px', border:'1px solid #333', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'}}>
                <h3 style={{color:'#fbbf24'}}>Efectividad Operativa</h3>
                <div style={{fontSize:'70px', fontWeight:'bold', color:'#34d399'}}>
                  {filtrados.length > 0 ? ((kpis.activos / filtrados.length) * 100).toFixed(0) : 0}%
                </div>
                <p style={{color:'#555'}}>Basado en los filtros actuales</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}