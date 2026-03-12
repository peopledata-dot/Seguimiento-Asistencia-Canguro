import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database'; 
import { RefreshCw, Calendar, LogOut, Lock, Search, Save, CheckCircle, BarChart3, ClipboardList, FileSpreadsheet, Users, Activity, AlertCircle, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';

// 1. CONFIGURACIÓN FIREBASE
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
  loginOverlay: { backgroundImage: 'url("/BOT.png")', backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', position: 'relative' },
  loginDarken: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1 },
  loginCard: { backgroundColor: '#111', padding: '40px', borderRadius: '20px', border: '1px solid #333', width: '350px', textAlign: 'center', zIndex: 2, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  container: { backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  wrapper: { width: '100%', maxWidth: '1600px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '20px' },
  logoSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  logoImg: { width: '100px', height: '100px', objectFit: 'contain' },
  navBar: { display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid #222', paddingBottom: '15px' },
  navBtn: (active) => ({
    backgroundColor: active ? '#fbbf24' : 'transparent',
    color: active ? '#000' : '#888',
    border: active ? 'none' : '1px solid #333',
    padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.3s'
  }),
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '20px', width: '100%' },
  kpiCard: (color) => ({ backgroundColor: '#111', border: `1px solid ${color || '#222'}`, padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '5px' }),
  filterBox: { backgroundColor: '#111', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '10px', border: '1px solid #222', flexWrap: 'wrap', alignItems: 'center' },
  input: { backgroundColor: '#000', border: '1px solid #444', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', flex: '1', minWidth: '120px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { color: '#fbbf24', padding: '12px 15px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid #222', letterSpacing: '1px' },
  td: { padding: '10px 15px', borderBottom: '1px solid #111', backgroundColor: '#050505' },
  statusBadge: (status, bloqueado) => {
    let bgColor = '#111';
    let textColor = '#fff';
    let borderColor = '#333';

    if (status === 'ACTIVO') { bgColor = '#064e3b'; textColor = '#34d399'; borderColor = '#059669'; }
    if (status === 'SIN ACTIVIDAD') { bgColor = '#450a0a'; textColor = '#ef4444'; borderColor = '#ef4444'; }
    if (bloqueado) { bgColor = '#1a1a1a'; textColor = '#555'; borderColor = '#222'; }

    return {
      backgroundColor: bgColor, color: textColor, border: `1px solid ${borderColor}`,
      padding: '6px 12px', borderRadius: '6px', width: '100%', cursor: bloqueado ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '12px'
    };
  },
  btnSave: (bloqueado) => ({
    backgroundColor: bloqueado ? 'transparent' : '#fbbf24', color: bloqueado ? '#fbbf24' : '#000',
    border: bloqueado ? '1px solid #fbbf24' : 'none', padding: '8px', borderRadius: '8px', cursor: bloqueado ? 'default' : 'pointer', display: 'flex', alignItems: 'center'
  }),
  btnOut: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' },
  btnExcel: { backgroundColor: '#166534', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' },
  dashGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', width: '100%' },
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

  const fetchDatos = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    const dbRef = ref(db, 'personal');
    return onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Array.isArray(data) ? data : Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setPersonal(lista);
      }
      setLoading(false);
    });
  }, [isAuthenticated]);

  useEffect(() => {
    const unsubscribe = fetchDatos();
    return () => unsubscribe && unsubscribe();
  }, [fetchDatos]);

  // --- LÓGICA DE FILTRADO DINÁMICO ---
  const filtrados = useMemo(() => {
    return personal.filter(p => {
      const pNombre = `${p.Nombre || ''} ${p.Apellido || ''} ${p.ID || ''} ${p.region || ''} ${p.sucursal || ''}`.toLowerCase();
      const pFechaStr = (p.fecha || p.Fecha || p.FECHA || "").toString();
      const pMesColumna = (p.mes || p.Mes || "").toString().toUpperCase();

      const matchSearch = pNombre.includes(busqueda.toLowerCase());
      const matchMes = !filtroMes || pMesColumna === filtroMes;
      const matchFecha = !filtroFecha || pFechaStr === filtroFecha;

      return matchSearch && matchMes && matchFecha;
    });
  }, [personal, busqueda, filtroMes, filtroFecha]);

  const fechasDisponibles = useMemo(() => {
    const fechas = personal.map(p => p.fecha || p.Fecha || p.FECHA).filter(Boolean);
    return [...new Set(fechas)].sort((a, b) => b.localeCompare(a));
  }, [personal]);

  // --- KPIs REACTIVOS A LOS FILTROS ---
  const cantActivos = useMemo(() => filtrados.filter(p => p.status === "ACTIVO").length, [filtrados]);
  const cantSinActividad = useMemo(() => filtrados.filter(p => p.status === "SIN ACTIVIDAD").length, [filtrados]);

  const handleGuardar = async (id, statusActual) => {
    if (window.confirm("¿Confirmar en Matriz?")) {
      try {
        const updates = {};
        updates[`/personal/${id}/status`] = statusActual;
        updates[`/personal/${id}/bloqueado`] = true;
        await update(ref(db), updates);
      } catch (e) { alert("Error al guardar: " + e.message); }
    }
  };

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtrados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    XLSX.writeFile(wb, `Matriz_Canguro_${new Date().toLocaleDateString()}.xlsx`);
  };

  if (!isAuthenticated) return (
    <div style={styles.loginOverlay}>
      <div style={styles.loginDarken}></div>
      <div style={styles.loginCard}>
        <Lock size={40} color="#fbbf24" style={{marginBottom:'20px'}}/>
        <h2 style={{color:'#fff', marginBottom:'20px'}}>MATRIZ SRT 2026</h2>
        <form onSubmit={(e) => { e.preventDefault(); if (user === "ADMCanguro" && pass === "SRT2026") setIsAuthenticated(true); else alert("Acceso Denegado"); }}>
          <input style={{...styles.input, width:'90%', marginBottom:'10px'}} placeholder="Usuario" onChange={e=>setUser(e.target.value)} />
          <input type="password" style={{...styles.input, width:'90%', marginBottom:'20px'}} placeholder="Contraseña" onChange={e=>setPass(e.target.value)} />
          <button type="submit" style={{backgroundColor:'#fbbf24', color:'#000', width:'100%', padding:'12px', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>ENTRAR</button>
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
              <p style={{margin:0, color:'#555', fontSize:'14px', fontWeight:'bold'}}>SISTEMA NACIONAL 2026</p>
            </div>
          </div>
          <div style={{display:'flex', gap:'10px'}}>
            <button onClick={exportarExcel} style={styles.btnExcel}><FileSpreadsheet size={18}/> EXCEL</button>
            <button onClick={() => window.location.reload()} style={{...styles.btnOut, backgroundColor: '#333'}}><RefreshCw size={18} /> REFRESCAR</button>
            <button onClick={()=>setIsAuthenticated(false)} style={styles.btnOut}><LogOut size={18}/> SALIR</button>
          </div>
        </header>

        {/* --- TARJETONES KPI (RESTITUIDOS Y DINÁMICOS) --- */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard('#333')}>
            <span style={{fontSize:'12px', color:'#888', fontWeight:'bold'}}>REGISTROS FILTRADOS</span>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <Users size={24} color="#fbbf24"/> <span style={{fontSize:'28px', fontWeight:'bold'}}>{filtrados.length}</span>
            </div>
          </div>
          <div style={styles.kpiCard('#fbbf24')}>
            <span style={{fontSize:'12px', color:'#fbbf24', fontWeight:'bold'}}>ACTIVOS</span>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <Activity size={24} color="#fbbf24"/> <span style={{fontSize:'28px', fontWeight:'bold'}}>{cantActivos}</span>
            </div>
          </div>
          <div style={styles.kpiCard('#ef4444')}>
            <span style={{fontSize:'12px', color:'#ef4444', fontWeight:'bold'}}>SIN ACTIVIDAD</span>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <AlertCircle size={24} color="#ef4444"/> <span style={{fontSize:'28px', fontWeight:'bold'}}>{cantSinActividad}</span>
            </div>
          </div>
        </div>

        <nav style={styles.navBar}>
          <button style={styles.navBtn(activeTab === "auditoria")} onClick={() => setActiveTab("auditoria")}><ClipboardList size={18}/> AUDITORÍA</button>
          <button style={styles.navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}><BarChart3 size={18}/> DASHBOARD</button>
        </nav>

        <div style={styles.filterBox}>
          <div style={{flex:2, display:'flex', alignItems:'center', backgroundColor:'#000', borderRadius:'8px', padding:'0 15px', border:'1px solid #222', minWidth:'220px'}}>
            <Search size={18} color="#444"/><input style={{...styles.input, border:'none'}} placeholder="Buscar ID, Nombre, Región..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          </div>
          <select style={styles.input} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}>
            <option value="">MES (TODOS)</option>
            {MESES_LISTA.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select style={styles.input} value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)}>
            <option value="">FECHA (TODAS)</option>
            {fechasDisponibles.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {activeTab === "auditoria" ? (
          <div style={{backgroundColor: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #333'}}>
            <table style={styles.table}>
              <thead>
                <tr style={{backgroundColor: '#1a1a1a'}}>
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
                      <div style={{textTransform:'uppercase', fontWeight:'bold'}}>{p.Nombre} {p.Apellido}</div>
                      <div style={{fontSize:'11px', color:'#555'}}>ID: {p.ID}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{fontSize:'13px', color:'#fbbf24', display:'flex', alignItems:'center', gap:4}}>
                        <MapPin size={12}/> {p.region}
                      </div>
                      <div style={{fontSize:'12px', color:'#fff'}}>{p.sucursal}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{fontSize:'14px', color:'#fff'}}><Calendar size={14} style={{marginRight:5}}/> {p.fecha || p.Fecha || p.FECHA || '---'}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{display:'flex', gap:'8px', justifyContent:'center'}}>
                        <select 
                          value={p.status || ""} 
                          disabled={p.bloqueado} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setPersonal(prev => prev.map(item => item.id === p.id ? {...item, status: val} : item));
                          }} 
                          style={styles.statusBadge(p.status, p.bloqueado)}
                        >
                          <option value="">SELECCIONAR</option>
                          {ESTADOS_POSIBLES.map(est => <option key={est} value={est}>{est}</option>)}
                        </select>
                        <button onClick={() => !p.bloqueado && handleGuardar(p.id, p.status)} style={styles.btnSave(p.bloqueado)}>
                          {p.bloqueado ? <CheckCircle size={18} color="#000" /> : <Save size={18} />}
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
            {/* GRÁFICO DE COMPORTAMIENTO BASADO EN FILTROS */}
            <div style={styles.dashCard}>
              <h3 style={{color: '#fbbf24', marginBottom:'25px', display:'flex', alignItems:'center', gap:10}}>
                <BarChart3 size={20}/> DISTRIBUCIÓN DE ESTADOS (VISTA ACTUAL)
              </h3>
              {ESTADOS_POSIBLES.map(est => {
                const cant = filtrados.filter(p => p.status === est).length;
                const porc = filtrados.length > 0 ? ((cant / filtrados.length) * 100).toFixed(1) : 0;
                
                let barColor = '#555';
                if (est === 'ACTIVO') barColor = '#fbbf24';
                if (est === 'SIN ACTIVIDAD') barColor = '#ef4444';

                return (
                  <div key={est} style={{marginBottom:'20px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:5}}>
                      <span style={{fontWeight:'bold'}}>{est}</span>
                      <span style={{color: '#888'}}>{cant} Colaboradores ({porc}%)</span>
                    </div>
                    <div style={{height:'12px', backgroundColor:'#222', borderRadius:'6px', overflow:'hidden'}}>
                      <div style={{width:`${porc}%`, height:'100%', backgroundColor: barColor, transition: 'width 0.5s ease-in-out'}}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.dashCard}>
              <h3 style={{color: '#fbbf24', marginBottom:'25px'}}>RESUMEN DE OPERACIÓN</h3>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                <div style={{textAlign:'center', padding:'20px', backgroundColor:'#000', borderRadius:'10px'}}>
                  <div style={{fontSize:'12px', color:'#888'}}>EFECTIVIDAD</div>
                  <div style={{fontSize:'32px', fontWeight:'bold', color:'#34d399'}}>
                    {filtrados.length > 0 ? ((cantActivos / filtrados.length) * 100).toFixed(0) : 0}%
                  </div>
                </div>
                <div style={{textAlign:'center', padding:'20px', backgroundColor:'#000', borderRadius:'10px'}}>
                  <div style={{fontSize:'12px', color:'#888'}}>INCIDENCIA</div>
                  <div style={{fontSize:'32px', fontWeight:'bold', color:'#ef4444'}}>
                    {filtrados.length > 0 ? ((cantSinActividad / filtrados.length) * 100).toFixed(0) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}