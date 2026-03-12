import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database'; 
import { RefreshCw, Calendar, LogOut, Lock, Search, Save, CheckCircle, BarChart3, ClipboardList, FileSpreadsheet, Users, Activity, AlertCircle } from 'lucide-react';

// 1. CONFIGURACIÓN FIREBASE (REALTTIME DATABASE)
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
  logoImg: { width: '80px', height: '80px', objectFit: 'contain' },
  navBar: { display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid #222', paddingBottom: '15px' },
  navBtn: (active) => ({
    backgroundColor: active ? '#fbbf24' : 'transparent', color: active ? '#000' : '#888',
    border: active ? 'none' : '1px solid #333', padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.3s'
  }),
  filterBox: { backgroundColor: '#111', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '10px', border: '1px solid #222', flexWrap: 'wrap' },
  input: { backgroundColor: '#000', border: '1px solid #444', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', flex: '1' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' },
  kpiCard: (borderColor) => ({
    backgroundColor: '#0a0a0a', border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '20px'
  }),
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { color: '#fbbf24', padding: '12px 15px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid #222' },
  td: { padding: '12px 15px', borderBottom: '1px solid #111', backgroundColor: '#050505' },
  statusBadge: (status, bloqueado) => ({
    backgroundColor: bloqueado ? '#1a1a1a' : (status === 'SIN ACTIVIDAD' ? '#450a0a' : '#000'),
    color: bloqueado ? '#555' : (status === 'SIN ACTIVIDAD' ? '#ef4444' : (status === 'ACTIVO' ? '#34d399' : '#fff')),
    border: `1px solid ${status === 'SIN ACTIVIDAD' ? '#ef4444' : '#333'}`,
    padding: '8px', borderRadius: '6px', width: '100%', fontWeight: 'bold'
  }),
  btnSave: (bloqueado) => ({
    backgroundColor: bloqueado ? 'transparent' : '#fbbf24', color: bloqueado ? '#fbbf24' : '#000',
    border: bloqueado ? '1px solid #fbbf24' : 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer'
  })
};

const ESTADOS_POSIBLES = ["ACTIVO", "SIN ACTIVIDAD", "VACACIONES", "REPOSO", "EGRESO", "AUSENCIA INJUSTIFICADA"];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("auditoria");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // FILTROS
  const [busqueda, setBusqueda] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroRegion, setFiltroRegion] = useState("");
  const [filtroSede, setFiltroSede] = useState("");

  // 2. CONEXIÓN REALTIME DATABASE (Más estable y sin límite de cuota agresivo)
  useEffect(() => {
    const dbRef = ref(db, 'personal');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          // Normalización para que no falle si cambian los nombres en el Excel
          nombreFull: `${data[key].Nombre || ''} ${data[key].Apellido || ''}`.trim(),
          regionNormal: data[key].region || data[key].Región || "N/A",
          sedeNormal: data[key].sucursal || data[key].Sede || data[key].Sucursal || "N/A",
          status: data[key].status || "SIN ACTIVIDAD",
          mesNormal: (data[key].mes || data[key].Mes || "").toUpperCase()
        }));
        setPersonal(lista);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. LISTAS DINÁMICAS (Se llenan solas)
  const listaRegiones = useMemo(() => [...new Set(personal.map(p => p.regionNormal))].filter(Boolean).sort(), [personal]);
  const listaSedes = useMemo(() => [...new Set(personal.map(p => p.sedeNormal))].filter(Boolean).sort(), [personal]);
  const listaMeses = useMemo(() => [...new Set(personal.map(p => p.mesNormal))].filter(Boolean), [personal]);

  // 4. LÓGICA DE FILTRADO
  const filtrados = useMemo(() => {
    return personal.filter(p => {
      const matchSearch = (p.nombreFull + p.ID).toLowerCase().includes(busqueda.toLowerCase());
      const matchReg = !filtroRegion || p.regionNormal === filtroRegion;
      const matchSed = !filtroSede || p.sedeNormal === filtroSede;
      const matchMes = !filtroMes || p.mesNormal === filtroMes;
      return matchSearch && matchReg && matchSed && matchMes;
    });
  }, [personal, busqueda, filtroRegion, filtroSede, filtroMes]);

  // 5. KPIs CON PROMEDIOS ACUMULADOS
  const stats = useMemo(() => {
    const total = filtrados.length || 0;
    const activos = filtrados.filter(p => p.status === 'ACTIVO').length || 0;
    const inactivos = filtrados.filter(p => p.status === 'SIN ACTIVIDAD').length || 0;
    return {
      total, activos, inactivos,
      promActivo: total > 0 ? ((activos / total) * 100).toFixed(1) : 0,
      promInactivo: total > 0 ? ((inactivos / total) * 100).toFixed(1) : 0
    };
  }, [filtrados]);

  const handleGuardar = async (id, statusActual) => {
    try {
      await update(ref(db, `personal/${id}`), { status: statusActual, bloqueado: true });
    } catch (error) { alert("Error: " + error.message); }
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
            <button onClick={() => window.location.reload()} style={{...styles.btnOut, backgroundColor: '#333'}}>
              <RefreshCw size={18} className={loading ? "animate-spin" : ""}/> {loading ? "CONECTANDO..." : "REFRESCAR"}
            </button>
            <button onClick={()=>setIsAuthenticated(false)} style={{...styles.btnOut, backgroundColor: '#ef4444', color:'#fff', border:'none', padding:'10px 20px', borderRadius:8, cursor:'pointer', fontWeight:'bold'}}><LogOut size={18}/> SALIR</button>
          </div>
        </header>

        {/* TARJETAS KPI CON PROMEDIOS */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard('#333')}>
            <span style={{fontSize:'12px', color:'#888'}}>TOTAL REGISTROS</span>
            <div style={{fontSize:'32px', fontWeight:'bold'}}>{stats.total}</div>
          </div>
          <div style={styles.kpiCard('#fbbf24')}>
            <span style={{fontSize:'12px', color:'#fbbf24'}}>ACTIVOS ({stats.promActivo}%)</span>
            <div style={{fontSize:'32px', fontWeight:'bold', color:'#fbbf24'}}>{stats.activos}</div>
          </div>
          <div style={styles.kpiCard('#ef4444')}>
            <span style={{fontSize:'12px', color:'#ef4444'}}>SIN ACTIVIDAD ({stats.promInactivo}%)</span>
            <div style={{fontSize:'32px', fontWeight:'bold', color:'#ef4444'}}>{stats.inactivos}</div>
          </div>
        </div>

        <nav style={styles.navBar}>
          <button style={styles.navBtn(activeTab === "auditoria")} onClick={() => setActiveTab("auditoria")}><ClipboardList size={18}/> AUDITORÍA</button>
          <button style={styles.navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}><BarChart3 size={18}/> DASHBOARD</button>
        </nav>

        {/* FILTROS MEJORADOS */}
        <div style={styles.filterBox}>
          <div style={{flex:2, display:'flex', alignItems:'center', background:'#000', padding:'0 15px', border:'1px solid #222', borderRadius:8}}>
            <Search size={18} color="#444"/><input style={{...styles.input, border:'none'}} placeholder="Buscar Colaborador o ID..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          </div>
          <select style={styles.input} value={filtroRegion} onChange={e=>setFiltroRegion(e.target.value)}>
            <option value="">REGIONES (TODAS)</option>
            {listaRegiones.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select style={styles.input} value={filtroSede} onChange={e=>setFiltroSede(e.target.value)}>
            <option value="">SEDES (TODAS)</option>
            {listaSedes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={styles.input} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}>
            <option value="">MESES (TODOS)</option>
            {listaMeses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {activeTab === "auditoria" ? (
          <div style={{backgroundColor: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #333'}}>
            <table style={styles.table}>
              <thead>
                <tr style={{backgroundColor: '#1a1a1a'}}>
                  <th style={styles.th}>COLABORADOR / SEDE</th>
                  <th style={styles.th}>FECHA CARGA</th>
                  <th style={{...styles.th, textAlign:'center'}}>ESTADO EN MATRIZ</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id}>
                    <td style={styles.td}>
                      <div style={{fontWeight:'bold'}}>{p.nombreFull}</div>
                      <div style={{fontSize:'12px', color:'#fbbf24'}}>{p.sedeNormal} | {p.regionNormal}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{fontSize:'13px', color:'#666'}}><Calendar size={14}/> {p.fecha || p.Fecha || '---'}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{display:'flex', gap:'8px', justifyContent:'center'}}>
                        <select 
                          value={p.status} 
                          disabled={p.bloqueado} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setPersonal(prev => prev.map(item => item.id === p.id ? {...item, status: val} : item));
                          }} 
                          style={styles.statusBadge(p.status, p.bloqueado)}
                        >
                          {ESTADOS_POSIBLES.map(est => <option key={est} value={est}>{est}</option>)}
                        </select>
                        <button onClick={() => !p.bloqueado && handleGuardar(p.id, p.status)} style={styles.btnSave(p.bloqueado)}>
                          {p.bloqueado ? <CheckCircle size={18}/> : <Save size={18}/>}
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
            <div style={{...styles.dashCard, borderLeft: '5px solid #ef4444'}}>
              <h3 style={{color: '#ef4444', marginBottom:'20px'}}>RANKING DE AFECTACIÓN (SIN ACTIVIDAD)</h3>
              {[...new Set(filtrados.filter(x => x.status === 'SIN ACTIVIDAD').map(x => x.sedeNormal))].map(sede => {
                const count = filtrados.filter(x => x.sedeNormal === sede && x.status === 'SIN ACTIVIDAD').length;
                return (
                  <div key={sede} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #222'}}>
                    <span>{sede}</span>
                    <span style={{color:'#ef4444', fontWeight:'bold'}}>{count} Casos</span>
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