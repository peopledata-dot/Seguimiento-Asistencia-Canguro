import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database'; 
import { RefreshCw, Calendar, LogOut, Lock, Search, Save, CheckCircle, BarChart3, ClipboardList, FileSpreadsheet, Users, Activity, AlertCircle, MapPin, Building2, TrendingUp } from 'lucide-react';
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

const styles = {
  container: { backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  wrapper: { width: '100%', maxWidth: '1600px', margin: '0 auto' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '25px' },
  kpiCard: (borderColor) => ({
    backgroundColor: '#0a0a0a', border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column'
  }),
  filterRow: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
  input: { backgroundColor: '#0a0a0a', border: '1px solid #222', color: '#fff', padding: '12px', borderRadius: '8px', flex: 1, minWidth: '150px' },
  statusBadge: (status) => ({
    backgroundColor: '#0a0a0a', color: status === 'ACTIVO' ? '#34d399' : status === 'SIN ACTIVIDAD' ? '#ef4444' : '#fff',
    border: '1px solid #333', padding: '8px', borderRadius: '6px', width: '100%', fontWeight: 'bold'
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
        // NORMALIZACIÓN DE DATOS (Para asegurar que lea cualquier nombre de columna)
        const lista = Object.keys(data).map(key => {
          const item = data[key];
          return {
            id: key,
            ...item,
            // Normalizamos campos críticos para que el código no falle si cambian en el Excel
            nombreFull: `${item.Nombre || ''} ${item.Apellido || ''}`.trim(),
            regionNormal: item.region || item.Región || item.REGION || "Sin Región",
            sedeNormal: item.sucursal || item.Sede || item.Sucursal || "Sin Sede",
            statusNormal: item.status || item.Status || item.STATUS || "SIN ACTIVIDAD",
            mesNormal: (item.mes || item.Mes || "").toUpperCase()
          };
        });
        setPersonal(lista);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listas desplegables dinámicas (Se llenan solas)
  const listaRegiones = useMemo(() => [...new Set(personal.map(p => p.regionNormal))].sort(), [personal]);
  const listaSedes = useMemo(() => [...new Set(personal.map(p => p.sedeNormal))].sort(), [personal]);
  const listaMeses = useMemo(() => [...new Set(personal.map(p => p.mesNormal).filter(Boolean))], [personal]);

  // Filtrado lógico
  const filtrados = useMemo(() => {
    return personal.filter(p => {
      const matchBusqueda = (p.nombreFull + p.ID).toLowerCase().includes(busqueda.toLowerCase());
      const matchReg = !filtroRegion || p.regionNormal === filtroRegion;
      const matchSed = !filtroSede || p.sedeNormal === filtroSede;
      const matchMes = !filtroMes || p.mesNormal === filtroMes;
      return matchBusqueda && matchReg && matchSed && matchMes;
    });
  }, [personal, busqueda, filtroRegion, filtroSede, filtroMes]);

  // KPIs con Promedios
  const stats = useMemo(() => {
    const total = filtrados.length;
    const activos = filtrados.filter(p => p.statusNormal === 'ACTIVO').length;
    const inactivos = filtrados.filter(p => p.statusNormal === 'SIN ACTIVIDAD').length;
    return {
      total,
      activos,
      inactivos,
      promedioActivo: total > 0 ? ((activos / total) * 100).toFixed(1) : 0,
      promedioInactivo: total > 0 ? ((inactivos / total) * 100).toFixed(1) : 0
    };
  }, [filtrados]);

  const handleSave = async (id, status) => {
    try {
      await update(ref(db, `personal/${id}`), { status, bloqueado: true });
    } catch (e) { alert("Error al guardar"); }
  };

  if (!isAuthenticated) return (
    <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', backgroundColor:'#000'}}>
      <button onClick={() => setIsAuthenticated(true)} style={{padding:'15px 30px', backgroundColor:'#fbbf24', fontWeight:'bold', borderRadius:'8px', cursor:'pointer'}}>INGRESAR A MATRIZ 2026</button>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        
        <header style={{display:'flex', justifyContent:'space-between', marginBottom:'30px'}}>
          <div>
            <h1 style={{margin:0, fontSize:'28px', fontWeight:'900'}}>MATRIZ <span style={{color:'#fbbf24'}}>PRO</span></h1>
            <p style={{margin:0, color:'#555', fontSize:'12px'}}>GESTIÓN NACIONAL DE ASISTENCIA</p>
          </div>
          <button onClick={() => window.location.reload()} style={{backgroundColor:'#333', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:8}}>
            <RefreshCw size={18}/> REFRESCAR
          </button>
        </header>

        {/* TARJETAS CON PROMEDIOS ACUMULADOS */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard('#222')}>
            <span style={{fontSize:'11px', color:'#888', fontWeight:'bold'}}>TOTAL COLABORADORES</span>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10}}>
              <span style={{fontSize:'35px', fontWeight:'bold'}}>{stats.total}</span>
              <Users size={30} color="#888"/>
            </div>
          </div>
          <div style={styles.kpiCard('#fbbf24')}>
            <span style={{fontSize:'11px', color:'#fbbf24', fontWeight:'bold'}}>EFECTIVIDAD (ACTIVOS)</span>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10}}>
              <span style={{fontSize:'35px', fontWeight:'bold'}}>{stats.activos}</span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'18px', fontWeight:'bold', color:'#fbbf24'}}>{stats.promedioActivo}%</div>
                <Activity size={20} color="#fbbf24"/>
              </div>
            </div>
          </div>
          <div style={styles.kpiCard('#ef4444')}>
            <span style={{fontSize:'11px', color:'#ef4444', fontWeight:'bold'}}>INCIDENCIA (SIN ACTIVIDAD)</span>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10}}>
              <span style={{fontSize:'35px', fontWeight:'bold'}}>{stats.inactivos}</span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'18px', fontWeight:'bold', color:'#ef4444'}}>{stats.promedioInactivo}%</div>
                <AlertCircle size={20} color="#ef4444"/>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS ACTUALIZADA */}
        <div style={styles.filterRow}>
          <input style={styles.input} placeholder="Buscar Nombre o ID..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          
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

        <nav style={{display:'flex', gap:10, marginBottom:20}}>
          <button style={{...styles.navBtn(activeTab === "auditoria"), padding:'10px 20px', borderRadius:8}} onClick={()=>setActiveTab("auditoria")}>AUDITORÍA</button>
          <button style={{...styles.navBtn(activeTab === "panel"), padding:'10px 20px', borderRadius:8}} onClick={()=>setActiveTab("panel")}>PANEL DE AFECTACIÓN</button>
        </nav>

        {activeTab === "auditoria" ? (
          <div style={{backgroundColor:'#0a0a0a', borderRadius:'12px', border:'1px solid #222', overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:'1px solid #222', textAlign:'left'}}>
                  <th style={{padding:15, color:'#fbbf24', fontSize:12}}>COLABORADOR</th>
                  <th style={{padding:15, color:'#fbbf24', fontSize:12}}>UBICACIÓN</th>
                  <th style={{padding:15, color:'#fbbf24', fontSize:12}}>ESTADO ACTUAL</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id} style={{borderBottom:'1px solid #111'}}>
                    <td style={{padding:15}}>
                      <div style={{fontWeight:'bold', textTransform:'uppercase'}}>{p.nombreFull}</div>
                      <div style={{fontSize:11, color:'#555'}}>ID: {p.ID}</div>
                    </td>
                    <td style={{padding:15}}>
                      <div style={{fontSize:13, color:'#fbbf24'}}><MapPin size={12}/> {p.regionNormal}</div>
                      <div style={{fontSize:12, color:'#888'}}><Building2 size={12}/> {p.sedeNormal}</div>
                    </td>
                    <td style={{padding:15}}>
                      <div style={{display:'flex', gap:8}}>
                        <select 
                          style={styles.statusBadge(p.statusNormal)}
                          value={p.statusNormal}
                          disabled={p.bloqueado}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPersonal(prev => prev.map(item => item.id === p.id ? {...item, statusNormal: val} : item));
                          }}
                        >
                          {ESTADOS_POSIBLES.map(est => <option key={est} value={est}>{est}</option>)}
                        </select>
                        <button onClick={()=>handleSave(p.id, p.statusNormal)} style={{backgroundColor:'#fbbf24', border:'none', borderRadius:6, padding:8, cursor:'pointer'}}>
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
          <div style={{backgroundColor:'#0a0a0a', padding:30, borderRadius:15, border:'1px solid #222'}}>
            <h3 style={{color:'#ef4444', display:'flex', alignItems:'center', gap:10}}><AlertCircle/> SEDES AFECTADAS (SIN ACTIVIDAD)</h3>
            <p style={{color:'#555', fontSize:12}}>Ranking de sedes con mayor número de inactividad según filtros</p>
            <div style={{marginTop:20}}>
              {[...new Set(filtrados.filter(x => x.statusNormal === 'SIN ACTIVIDAD').map(x => x.sedeNormal))].map(sede => {
                const cant = filtrados.filter(x => x.sedeNormal === sede && x.statusNormal === 'SIN ACTIVIDAD').length;
                const reg = filtrados.find(x => x.sedeNormal === sede)?.regionNormal;
                return (
                  <div key={sede} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #111'}}>
                    <span><b style={{color:'#fbbf24'}}>{sede}</b> ({reg})</span>
                    <span style={{color:'#ef4444', fontWeight:'bold'}}>{cant} Incidencias</span>
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