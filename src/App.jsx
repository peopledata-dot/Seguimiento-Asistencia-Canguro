import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebaseConfig';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { RefreshCw, Calendar, LogOut, Lock, Search, Save, CheckCircle, BarChart3, ClipboardList, Users, MapPin, Filter } from 'lucide-react';

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
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' },
  card: { backgroundColor: '#111', border: '1px solid #333', padding: '15px', borderRadius: '12px', textAlign: 'center' },
  filterBox: { backgroundColor: '#111', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '10px', border: '1px solid #222', flexWrap: 'wrap' },
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
  barContainer: { height: '12px', backgroundColor: '#222', borderRadius: '6px', overflow: 'hidden', display: 'flex', margin: '8px 0', position: 'relative' },
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("auditoria");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroRegion, setFiltroRegion] = useState("");
  const [filtroTienda, setFiltroTienda] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      const q = query(collection(db, "personal"), orderBy("Nombre", "asc"));
      const unsub = onSnapshot(q, (snap) => {
        setPersonal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
      return () => unsub();
    }
  }, [isAuthenticated]);

  // --- LÓGICA DE LISTAS DESPLEGABLES ---
  const mesesOpciones = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

  const fechasDisponibles = useMemo(() => {
    const fechas = personal.map(p => p.Fecha || p.fecha || p.fechaCarga).filter(Boolean);
    return [...new Set(fechas)].sort((a, b) => b.localeCompare(a));
  }, [personal]);

  const regionesDisponibles = useMemo(() => 
    [...new Set(personal.map(p => p.region))].filter(Boolean).sort()
  , [personal]);

  const tiendasDisponibles = useMemo(() => {
    const base = filtroRegion ? personal.filter(p => p.region === filtroRegion) : personal;
    return [...new Set(base.map(p => p.sucursal))].filter(Boolean).sort();
  }, [personal, filtroRegion]);

  // --- FILTRADO MAESTRO REACTIVO ---
  const filtrados = useMemo(() => {
    return personal.filter(p => {
      const pFecha = p.Fecha || p.fecha || p.fechaCarga || "";
      const pMes = p.mes || ""; // Asumiendo que existe el campo 'mes' en Firestore
      
      const matchSearch = `${p.Nombre} ${p.Apellido} ${p.ID}`.toLowerCase().includes(busqueda.toLowerCase());
      const matchMes = !filtroMes || pMes.toUpperCase() === filtroMes;
      const matchFecha = !filtroFecha || pFecha === filtroFecha;
      const matchRegion = !filtroRegion || p.region === filtroRegion;
      const matchTienda = !filtroTienda || p.sucursal === filtroTienda;
      
      return matchSearch && matchMes && matchFecha && matchRegion && matchTienda;
    });
  }, [personal, busqueda, filtroMes, filtroFecha, filtroRegion, filtroTienda]);

  // --- ESTADÍSTICAS PARA GRÁFICOS ---
  const statsPorEstado = useMemo(() => {
    const estados = ["ACTIVO", "SIN ACTIVIDAD", "VACACIONES", "REPOSO", "EGRESO", "AUSENCIA INJUSTIFICADA"];
    const total = filtrados.length || 0;
    return estados.map(est => {
      const cant = filtrados.filter(p => p.status === est).length;
      return {
        nombre: est,
        cantidad: cant,
        porcentaje: total > 0 ? ((cant / total) * 100).toFixed(1) : 0,
        color: est === "ACTIVO" ? "#fbbf24" : est === "SIN ACTIVIDAD" ? "#ef4444" : "#555"
      };
    });
  }, [filtrados]);

  const handleGuardar = async (id, statusActual) => {
    if (window.confirm("¿Confirmar guardado irreversible?")) {
      try {
        await updateDoc(doc(db, "personal", id), { status: statusActual, bloqueado: true, fechaBloqueo: new Date().toISOString() });
      } catch (error) { alert("Error: " + error.message); }
    }
  };

  if (!isAuthenticated) return (
    <div style={styles.loginOverlay}>
      <div style={styles.loginDarken}></div>
      <div style={styles.loginCard}>
        <Lock size={40} color="#fbbf24" style={{marginBottom:'20px'}}/>
        <h2 style={{color:'#fff', marginBottom:'20px'}}>MATRIZ SRT 2026</h2>
        <form onSubmit={(e) => { e.preventDefault(); if (user === "ADMCanguro" && pass === "SRT2026") setIsAuthenticated(true); else alert("Acceso denegado"); }}>
          <input style={{...styles.input, width:'90%', marginBottom:'10px'}} placeholder="Usuario" onChange={e=>setUser(e.target.value)} />
          <input type="password" style={{...styles.input, width:'90%', marginBottom:'20px'}} placeholder="Contraseña" onChange={e=>setPass(e.target.value)} />
          <button type="submit" style={{backgroundColor:'#fbbf24', width:'100%', padding:'12px', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>ENTRAR AL PANEL</button>
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
          <button onClick={()=>setIsAuthenticated(false)} style={styles.btnOut}><LogOut size={18}/> SALIR</button>
        </header>

        <nav style={styles.navBar}>
          <button style={styles.navBtn(activeTab === "auditoria")} onClick={() => setActiveTab("auditoria")}>
            <ClipboardList size={18}/> AUDITORÍA DE CAMPO
          </button>
          <button style={styles.navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>
            <BarChart3 size={18}/> DASHBOARD REACTIVO
          </button>
        </nav>

        {/* BARRA DE FILTROS GLOBAL */}
        <div style={styles.filterBox}>
          <div style={{flex:2, display:'flex', alignItems:'center', backgroundColor:'#000', borderRadius:'8px', padding:'0 15px', border:'1px solid #222', minWidth:'220px'}}>
            <Search size={18} color="#444"/><input style={{...styles.input, border:'none'}} placeholder="Buscar Colaborador..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          </div>
          
          <select style={styles.input} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}>
            <option value="">MES (TODOS)</option>
            {mesesOpciones.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select style={styles.input} value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)}>
            <option value="">FECHA EXACTA</option>
            {fechasDisponibles.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <select style={styles.input} value={filtroRegion} onChange={e=>{setFiltroRegion(e.target.value); setFiltroTienda("");}}>
            <option value="">REGIÓN</option>
            {regionesDisponibles.map(r=><option key={r} value={r}>{r}</option>)}
          </select>

          <select style={styles.input} value={filtroTienda} onChange={e=>setFiltroTienda(e.target.value)}>
            <option value="">SUCURSAL / TIENDA</option>
            {tiendasDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {activeTab === "auditoria" ? (
          <>
            <div style={styles.grid}>
              <div style={styles.card}><p style={{color:'#888', fontSize:'10px', margin:0}}>ACTIVOS</p><h2 style={{fontSize:'32px', margin:'5px 0', color:'#fbbf24'}}>{filtrados.filter(p=>p.status==="ACTIVO").length}</h2></div>
              <div style={styles.card}><p style={{color:'#ef4444', fontSize:'10px', margin:0}}>SIN ACTIVIDAD</p><h2 style={{fontSize:'32px', margin:'5px 0', color:'#ef4444'}}>{filtrados.filter(p=>p.status==="SIN ACTIVIDAD").length}</h2></div>
              <div style={styles.card}><p style={{color:'#888', fontSize:'10px', margin:0}}>FILTRADOS</p><h2 style={{fontSize:'32px', margin:'5px 0'}}>{filtrados.length}</h2></div>
              <div style={styles.card}><p style={{color:'#888', fontSize:'10px', margin:0}}>TOTAL BASE</p><h2 style={{fontSize:'32px', margin:'5px 0'}}>{personal.length}</h2></div>
            </div>

            <div style={{backgroundColor: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #333'}}>
              <table style={styles.table}>
                <thead>
                  <tr style={{backgroundColor: '#1a1a1a'}}>
                    <th style={styles.th}>COLABORADOR / SEDE</th>
                    <th style={styles.th}>FECHA</th>
                    <th style={{...styles.th, textAlign:'center'}}>GESTIÓN ASISTENCIA</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="3" style={{textAlign:'center', padding:'50px'}}><RefreshCw className="animate-spin" color="#fbbf24" /></td></tr>
                  ) : (
                    filtrados.map(p => (
                      <tr key={p.id}>
                        <td style={styles.td}>
                          <div style={{textTransform:'uppercase', fontWeight:'bold', fontSize:'15px'}}>{p.Nombre} {p.Apellido}</div>
                          <div style={{fontSize:'15px', color:'#fbbf24'}}>{p.sucursal} <span style={{color: '#418fc0'}}>|</span> {p.region}</div>
                        </td>
                        <td style={styles.td}>
                            <div style={{fontSize:'15px', color:'#666', display:'flex', alignItems:'center', gap: '5px'}}>
                                <Calendar size={16}/> {p.Fecha || p.fecha || p.fechaCarga || '---'}
                            </div>
                        </td>
                        <td style={styles.td}>
                          <div style={{display:'flex', gap:'8px', justifyContent:'center'}}>
                            <select value={p.status} disabled={p.bloqueado} onChange={(e) => updateDoc(doc(db, "personal", p.id), { status: e.target.value })} style={styles.statusBadge(p.status, p.bloqueado)}>
                              <option value="ACTIVO">ACTIVO</option>
                              <option value="SIN ACTIVIDAD">SIN ACTIVIDAD</option>
                              <option value="VACACIONES">VACACIONES</option>
                              <option value="REPOSO">REPOSO</option>
                              <option value="EGRESO">EGRESO</option>
                              <option value="AUSENCIA INJUSTIFICADA">AUSENCIA INJUSTIFICADA</option>
                            </select>
                            <button onClick={() => !p.bloqueado && handleGuardar(p.id, p.status)} style={styles.btnSave(p.bloqueado)}>
                              {p.bloqueado ? <CheckCircle size={18} /> : <Save size={18} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={styles.dashGrid}>
              <div style={{...styles.dashCard, gridColumn: 'span 2'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'25px'}}>
                    <div>
                        <h3 style={{color: '#fbbf24', margin: 0, display:'flex', alignItems:'center', gap:'10px'}}><BarChart3 size={20}/> MÉTRICAS DE CUMPLIMIENTO</h3>
                        <p style={{color: '#555', fontSize: '12px', margin: '5px 0 0 0'}}>Visualización de estados basada en los filtros actuales.</p>
                    </div>
                    <div style={{textAlign:'right'}}>
                        <span style={{fontSize:'24px', fontWeight:'900', color:'#fff'}}>{filtrados.length}</span>
                        <p style={{fontSize:'10px', color:'#555', margin:0}}>COLABORADORES EN VISTA</p>
                    </div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px'}}>
                    {statsPorEstado.map(est => (
                    <div key={est.nombre} style={{backgroundColor:'#000', padding:'20px', borderRadius:'15px', border:'1px solid #222', position:'relative', overflow:'hidden'}}>
                        {/* Gráfico de Barra de Fondo (Progreso) */}
                        <div style={{position:'absolute', bottom:0, left:0, width:`${est.porcentaje}%`, height:'4px', backgroundColor:est.color, transition:'0.8s ease-out'}}></div>
                        
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                <div style={{width:'8px', height:'8px', borderRadius:'50%', backgroundColor: est.color}}></div>
                                <span style={{fontSize:'11px', color: '#888', fontWeight:'bold'}}>{est.nombre}</span>
                            </div>
                            <span style={{fontSize:'18px', fontWeight:'bold', color: est.color}}>{est.porcentaje}%</span>
                        </div>
                        
                        <div style={{display:'flex', alignItems:'baseline', gap:'5px'}}>
                            <span style={{fontSize:'32px', fontWeight:'900'}}>{est.cantidad}</span>
                            <span style={{fontSize:'12px', color:'#444'}}>pax</span>
                        </div>
                    </div>
                    ))}
                </div>
              </div>

              {/* Gráfico Comparativo Lateral Opcional */}
              <div style={{...styles.dashCard, gridColumn: 'span 2', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                <h4 style={{margin:'0 0 20px 0', color:'#888', fontSize:'12px', textAlign:'center', textTransform:'uppercase', letterSpacing:'1px'}}>Análisis Comparativo Nacional</h4>
                <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-around', height:'150px', paddingBottom:'20px'}}>
                    {statsPorEstado.map(est => (
                        <div key={est.nombre+"bar"} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', flex:1}}>
                            <span style={{fontSize:'10px', color:est.color, fontWeight:'bold'}}>{est.cantidad}</span>
                            <div style={{width:'30px', height:`${Math.max(est.porcentaje, 5)}%`, backgroundColor: est.color, borderRadius:'4px 4px 0 0', minHeight:'5px', transition:'height 1s'}}></div>
                            <span style={{fontSize:'8px', color:'#444', textAlign:'center', height:'20px'}}>{est.nombre.split(" ")[0]}</span>
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