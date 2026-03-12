import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database'; 
import { RefreshCw, Calendar, LogOut, Lock, Search, Save, CheckCircle, BarChart3, ClipboardList, Users, Activity, AlertCircle, MapPin, Building2 } from 'lucide-react';

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

const ESTADOS_POSIBLES = ["ACTIVO", "SIN ACTIVIDAD", "VACACIONES", "REPOSO", "EGRESO", "AUSENCIA INJUSTIFICADA"];

const styles = {
  loginOverlay: { backgroundImage: 'url("/BOT.png")', backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', position: 'relative' },
  loginDarken: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1 },
  loginCard: { backgroundColor: '#111', padding: '40px', borderRadius: '20px', border: '1px solid #fbbf24', width: '350px', textAlign: 'center', zIndex: 2, boxShadow: '0 10px 50px rgba(0,0,0,0.8)' },
  container: { backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  wrapper: { maxWidth: '1600px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '20px', marginBottom: '25px' },
  logoSection: { display: 'flex', alignItems: 'center', gap: '15px' },
  logoImg: { width: '120px', height: 'auto' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' },
  kpiCard: (color) => ({
    background: '#0a0a0a', border: `1px solid ${color}`, borderRadius: '15px', padding: '25px', position: 'relative', overflow: 'hidden'
  }),
  navBar: { display: 'flex', gap: '12px', marginBottom: '25px' },
  navBtn: (active) => ({
    backgroundColor: active ? '#fbbf24' : '#111', color: active ? '#000' : '#888',
    border: active ? 'none' : '1px solid #333', padding: '12px 25px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
  }),
  filterBox: { backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '15px', marginBottom: '25px', display: 'flex', gap: '15px', border: '1px solid #222', flexWrap: 'wrap' },
  input: { backgroundColor: '#000', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '8px', flex: 1, minWidth: '150px' },
  tableContainer: { background: '#0a0a0a', borderRadius: '15px', border: '1px solid #222', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { color: '#fbbf24', padding: '15px', textAlign: 'left', background: '#111', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '15px', borderBottom: '1px solid #1a1a1a' },
  statusSelect: (status) => ({
    width: '100%', padding: '10px', borderRadius: '6px', background: '#000', 
    color: status === 'SIN ACTIVIDAD' ? '#ef4444' : (status === 'ACTIVO' ? '#34d399' : '#fff'),
    border: '1px solid #333', fontWeight: 'bold'
  }),
  btnSave: (bloqueado) => ({
    padding: '10px', background: bloqueado ? 'transparent' : '#fbbf24', color: bloqueado ? '#fbbf24' : '#000',
    border: bloqueado ? '1px solid #fbbf24' : 'none', borderRadius: '8px', cursor: 'pointer'
  })
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("auditoria");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [busqueda, setBusqueda] = useState("");
  const [filtroRegion, setFiltroRegion] = useState("");
  const [filtroSede, setFiltroSede] = useState("");

  useEffect(() => {
    const dbRef = ref(db, 'personal');
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          region: data[key].region || data[key].Región || "N/A",
          sucursal: data[key].sucursal || data[key].Sede || "N/A",
          status: (data[key].status || "SIN ACTIVIDAD").toUpperCase()
        }));
        setPersonal(lista);
      }
      setLoading(false);
    });
  }, []);

  const filtrados = useMemo(() => {
    return personal.filter(p => {
      const matchSearch = `${p.Nombre} ${p.Apellido} ${p.ID}`.toLowerCase().includes(busqueda.toLowerCase());
      const matchReg = !filtroRegion || p.region === filtroRegion;
      const matchSed = !filtroSede || p.sucursal === filtroSede;
      return matchSearch && matchReg && matchSed;
    });
  }, [personal, busqueda, filtroRegion, filtroSede]);

  const stats = useMemo(() => {
    const total = filtrados.length;
    const activos = filtrados.filter(p => p.status === 'ACTIVO').length;
    const inactivos = filtrados.filter(p => p.status === 'SIN ACTIVIDAD').length;
    return {
      total, activos, inactivos,
      pActivo: total > 0 ? ((activos/total)*100).toFixed(1) : 0,
      pInactivo: total > 0 ? ((inactivos/total)*100).toFixed(1) : 0
    };
  }, [filtrados]);

  const handleGuardar = async (id, statusActual) => {
    try {
      await update(ref(db, `personal/${id}`), { status: statusActual, bloqueado: true });
    } catch (e) { alert("Error"); }
  };

  if (!isAuthenticated) return (
    <div style={styles.loginOverlay}>
      <div style={styles.loginDarken}></div>
      <div style={styles.loginCard}>
        <Lock size={50} color="#fbbf24" style={{marginBottom: 20}}/>
        <h2 style={{color:'#fff', fontSize: '24px', marginBottom: 30}}>MATRIZ SRT 2026</h2>
        <input style={{...styles.input, width:'85%', marginBottom:15}} placeholder="Usuario" onChange={e=>setUser(e.target.value)} />
        <input type="password" style={{...styles.input, width:'85%', marginBottom:30}} placeholder="Contraseña" onChange={e=>setPass(e.target.value)} />
        <button onClick={() => {if(user==="ADMCanguro" && pass==="SRT2026") setIsAuthenticated(true); else alert("Acceso Denegado");}} 
          style={{width:'100%', padding:15, background:'#fbbf24', border:'none', borderRadius:10, fontWeight:'900', cursor:'pointer'}}>INGRESAR AL SISTEMA</button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        
        {/* HEADER ORIGINAL */}
        <header style={styles.header}>
          <div style={styles.logoSection}>
            <img src="/logo-canguro.png" alt="Logo" style={styles.logoImg} />
            <div>
              <h1 style={{margin:0, fontSize:'30px', fontWeight:'900', fontStyle:'italic'}}>MATRIZ ASISTENCIA <span style={{color:'#fbbf24'}}>PRO</span></h1>
              <p style={{margin:0, color:'#555', fontSize:'14px', fontWeight:'bold'}}>SISTEMA DE AUDITORÍA NACIONAL 2026</p>
            </div>
          </div>
          <button onClick={() => window.location.reload()} style={{padding:'12px 20px', borderRadius:8, background:'#111', color:'#fff', border:'1px solid #333', cursor:'pointer', display:'flex', alignItems:'center', gap:10}}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""}/> {loading ? "CARGANDO..." : "SINCRONIZAR BDD"}
          </button>
        </header>

        {/* TARJETONES CON ESTILO ORIGINAL */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard('#333')}>
            <span style={{color:'#888', fontSize:'12px', fontWeight:'bold'}}>TOTAL COLABORADORES</span>
            <div style={{fontSize:'45px', fontWeight:'900', marginTop:10, display:'flex', alignItems:'center', gap:15}}>
              <Users size={40} color="#888"/> {stats.total}
            </div>
          </div>
          <div style={styles.kpiCard('#fbbf24')}>
            <span style={{color:'#fbbf24', fontSize:'12px', fontWeight:'bold'}}>ACTIVOS ({stats.pActivo}%)</span>
            <div style={{fontSize:'45px', fontWeight:'900', marginTop:10, color:'#fbbf24', display:'flex', alignItems:'center', gap:15}}>
              <Activity size={40}/> {stats.activos}
            </div>
          </div>
          <div style={styles.kpiCard('#ef4444')}>
            <span style={{color:'#ef4444', fontSize:'12px', fontWeight:'bold'}}>SIN ACTIVIDAD ({stats.pInactivo}%)</span>
            <div style={{fontSize:'45px', fontWeight:'900', marginTop:10, color:'#ef4444', display:'flex', alignItems:'center', gap:15}}>
              <AlertCircle size={40}/> {stats.inactivos}
            </div>
          </div>
        </div>

        {/* NAVBAR */}
        <nav style={styles.navBar}>
          <button style={styles.navBtn(activeTab === "auditoria")} onClick={() => setActiveTab("auditoria")}><ClipboardList size={20}/> AUDITORÍA DE CAMPO</button>
          <button style={styles.navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}><BarChart3 size={20}/> MÉTRICAS DE IMPACTO</button>
        </nav>

        {/* FILTROS */}
        <div style={styles.filterBox}>
          <div style={{flex:2, display:'flex', alignItems:'center', background:'#000', padding:'0 15px', border:'1px solid #333', borderRadius:10}}>
            <Search size={20} color="#fbbf24"/><input style={{...styles.input, border:'none'}} placeholder="Buscar nombre o ID..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          </div>
          <select style={styles.input} onChange={e=>setFiltroRegion(e.target.value)}>
            <option value="">REGIÓN (TODAS)</option>
            {[...new Set(personal.map(p=>p.region))].sort().map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <select style={styles.input} onChange={e=>setFiltroSede(e.target.value)}>
            <option value="">SEDE (TODAS)</option>
            {[...new Set(personal.map(p=>p.sucursal))].sort().map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {activeTab === "auditoria" ? (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>COLABORADOR / UBICACIÓN</th>
                  <th style={styles.th}>ÚLTIMA CARGA</th>
                  <th style={{...styles.th, textAlign:'center'}}>STATUS EN MATRIZ</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id}>
                    <td style={styles.td}>
                      <div style={{fontWeight:'bold', fontSize:'15px', textTransform:'uppercase'}}>{p.Nombre} {p.Apellido}</div>
                      <div style={{fontSize:'12px', color:'#fbbf24', marginTop:4}}><Building2 size={12}/> {p.sucursal} | {p.region}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{color:'#666', fontSize:'14px'}}><Calendar size={14}/> {p.fecha || p.Fecha || '---'}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{display:'flex', gap:10, justifyContent:'center'}}>
                        <select 
                          value={p.status} 
                          disabled={p.bloqueado}
                          onChange={(e) => setPersonal(prev => prev.map(item => item.id === p.id ? {...item, status: e.target.value} : item))}
                          style={styles.statusSelect(p.status)}
                        >
                          {ESTADOS_POSIBLES.map(est => <option key={est} value={est}>{est}</option>)}
                        </select>
                        <button onClick={() => handleGuardar(p.id, p.status)} style={styles.btnSave(p.bloqueado)}>
                          {p.bloqueado ? <CheckCircle size={22}/> : <Save size={22}/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:30}}>
            <div style={{background:'#0a0a0a', padding:30, borderRadius:20, border:'1px solid #ef4444'}}>
              <h3 style={{color:'#ef4444', marginTop:0}}>TOP SEDES CON INACTIVIDAD</h3>
              {[...new Set(filtrados.filter(x => x.status === 'SIN ACTIVIDAD').map(x => x.sucursal))].map(sede => {
                const count = filtrados.filter(x => x.sucursal === sede && x.status === 'SIN ACTIVIDAD').length;
                return (
                  <div key={sede} style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #222'}}>
                    <span style={{fontWeight:'bold'}}>{sede}</span>
                    <span style={{color:'#ef4444', fontWeight:'900'}}>{count} CASOS</span>
                  </div>
                );
              })}
            </div>
            <div style={{background:'#0a0a0a', padding:30, borderRadius:20, border:'1px solid #333', textAlign:'center'}}>
               <p style={{color:'#444'}}>Gráfico de tendencias 2026 próximamente...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}