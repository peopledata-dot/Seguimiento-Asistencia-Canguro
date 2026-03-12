import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { RefreshCw, Calendar, LogOut, Search, Save, CheckCircle, BarChart3, ClipboardList, Users, Activity, AlertCircle, MapPin, Building2 } from 'lucide-react';

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

// Inicialización segura
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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

  // Carga de datos
  useEffect(() => {
    try {
      const dbRef = ref(db, 'personal');
      const unsubscribe = onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const lista = Object.keys(data).map(key => ({
            id: key,
            ...data[key],
            // Normalización para evitar errores de "undefined"
            region: data[key].region || data[key].Región || "N/A",
            sucursal: data[key].sucursal || data[key].Sede || data[key].Sucursal || "N/A",
            status: data[key].status || "SIN ACTIVIDAD",
            mes: (data[key].mes || data[key].Mes || "").toUpperCase()
          }));
          setPersonal(lista);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error Firebase:", error);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Error en useEffect:", e);
    }
  }, []);

  // Listas para filtros (Prevenir errores si personal está vacío)
  const listaRegiones = useMemo(() => [...new Set(personal.map(p => p.region))].filter(Boolean), [personal]);
  const listaSedes = useMemo(() => [...new Set(personal.map(p => p.sucursal))].filter(Boolean), [personal]);
  const listaMeses = useMemo(() => [...new Set(personal.map(p => p.mes))].filter(Boolean), [personal]);

  // Filtrado
  const filtrados = useMemo(() => {
    return personal.filter(p => {
      const b = busqueda.toLowerCase();
      const matchBusqueda = (p.Nombre || "").toLowerCase().includes(b) || (p.ID || "").toString().includes(b);
      const matchReg = !filtroRegion || p.region === filtroRegion;
      const matchSed = !filtroSede || p.sucursal === filtroSede;
      const matchMes = !filtroMes || p.mes === filtroMes;
      return matchBusqueda && matchReg && matchSed && matchMes;
    });
  }, [personal, busqueda, filtroRegion, filtroSede, filtroMes]);

  // KPIs
  const stats = useMemo(() => {
    const total = filtrados.length || 0;
    const activos = filtrados.filter(p => p.status === 'ACTIVO').length || 0;
    const inactivos = filtrados.filter(p => p.status === 'SIN ACTIVIDAD').length || 0;
    return {
      total, activos, inactivos,
      pActivo: total > 0 ? ((activos / total) * 100).toFixed(1) : 0,
      pInactivo: total > 0 ? ((inactivos / total) * 100).toFixed(1) : 0
    };
  }, [filtrados]);

  const handleSave = async (id, nuevoStatus) => {
    try {
      await update(ref(db, `personal/${id}`), { status: nuevoStatus, bloqueado: true });
    } catch (e) { alert("Error al guardar"); }
  };

  if (!isAuthenticated) return (
    <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', backgroundColor:'#000', color:'#fff', fontFamily:'sans-serif'}}>
      <div style={{padding:'40px', background:'#111', borderRadius:'15px', border:'1px solid #fbbf24', textAlign:'center'}}>
        <h2 style={{color:'#fbbf24'}}>MATRIZ SRT 2026</h2>
        <button onClick={() => setIsAuthenticated(true)} style={{padding:'12px 25px', backgroundColor:'#fbbf24', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold'}}>INGRESAR</button>
      </div>
    </div>
  );

  return (
    <div style={{backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif'}}>
      <div style={{maxWidth: '1400px', margin: '0 auto'}}>
        
        {/* HEADER */}
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
          <h1 style={{fontSize:'24px', fontWeight:'900'}}>MATRIZ ASISTENCIA <span style={{color:'#fbbf24'}}>PRO</span></h1>
          <button onClick={() => window.location.reload()} style={{padding:'8px 15px', borderRadius:'8px', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5}}>
            <RefreshCw size={16}/> REFRESCAR
          </button>
        </div>

        {/* TARJETAS KPI */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:'20px', marginBottom:'20px'}}>
          <div style={{padding:'20px', background:'#111', border:'1px solid #333', borderRadius:'12px'}}>
            <span style={{fontSize:'12px', color:'#888'}}>TOTAL REGISTROS</span>
            <div style={{fontSize:'30px', fontWeight:'bold'}}>{stats.total}</div>
          </div>
          <div style={{padding:'20px', background:'#111', border:'1px solid #fbbf24', borderRadius:'12px'}}>
            <span style={{fontSize:'12px', color:'#fbbf24'}}>ACTIVOS ({stats.pActivo}%)</span>
            <div style={{fontSize:'30px', fontWeight:'bold', color:'#fbbf24'}}>{stats.activos}</div>
          </div>
          <div style={{padding:'20px', background:'#111', border:'1px solid #ef4444', borderRadius:'12px'}}>
            <span style={{fontSize:'12px', color:'#ef4444'}}>SIN ACTIVIDAD ({stats.pInactivo}%)</span>
            <div style={{fontSize:'30px', fontWeight:'bold', color:'#ef4444'}}>{stats.inactivos}</div>
          </div>
        </div>

        {/* FILTROS */}
        <div style={{display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap'}}>
          <input 
            placeholder="Buscar..." 
            style={{padding:'12px', borderRadius:'8px', border:'1px solid #333', background:'#111', color:'#fff', flex:2}}
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
          />
          <select style={{padding:'12px', borderRadius:'8px', border:'1px solid #333', background:'#111', color:'#fff', flex:1}} value={filtroRegion} onChange={e => setFiltroRegion(e.target.value)}>
            <option value="">REGIÓN (TODAS)</option>
            {listaRegiones.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select style={{padding:'12px', borderRadius:'8px', border:'1px solid #333', background:'#111', color:'#fff', flex:1}} value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
            <option value="">SEDE (TODAS)</option>
            {listaSedes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={{padding:'12px', borderRadius:'8px', border:'1px solid #333', background:'#111', color:'#fff', flex:1}} value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
            <option value="">MES (TODOS)</option>
            {listaMeses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* TABS */}
        <div style={{display:'flex', gap:10, marginBottom:20}}>
          <button onClick={() => setActiveTab("auditoria")} style={{padding:'10px 20px', borderRadius:8, background: activeTab === "auditoria" ? '#fbbf24' : '#111', color: activeTab === "auditoria" ? '#000' : '#fff', border:'none', fontWeight:'bold', cursor:'pointer'}}>AUDITORÍA</button>
          <button onClick={() => setActiveTab("panel")} style={{padding:'10px 20px', borderRadius:8, background: activeTab === "panel" ? '#fbbf24' : '#111', color: activeTab === "panel" ? '#000' : '#fff', border:'none', fontWeight:'bold', cursor:'pointer'}}>RANKING AFECTACIÓN</button>
        </div>

        {activeTab === "auditoria" ? (
          <div style={{background:'#111', borderRadius:'12px', overflow:'hidden', border:'1px solid #222'}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#1a1a1a', color:'#fbbf24', fontSize:'12px', textAlign:'left'}}>
                  <th style={{padding:'15px'}}>COLABORADOR</th>
                  <th style={{padding:'15px'}}>UBICACIÓN</th>
                  <th style={{padding:'15px'}}>ESTADO MATRIZ</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id} style={{borderBottom:'1px solid #222'}}>
                    <td style={{padding:'15px'}}>
                      <div style={{fontWeight:'bold', textTransform:'uppercase'}}>{p.Nombre} {p.Apellido}</div>
                      <div style={{fontSize:'11px', color:'#555'}}>ID: {p.ID}</div>
                    </td>
                    <td style={{padding:'15px'}}>
                      <div style={{fontSize:'13px', color:'#fbbf24'}}><MapPin size={12}/> {p.region}</div>
                      <div style={{fontSize:'12px', color:'#888'}}><Building2 size={12}/> {p.sucursal}</div>
                    </td>
                    <td style={{padding:'15px'}}>
                      <div style={{display:'flex', gap:8}}>
                        <select 
                          style={{padding:'8px', borderRadius:6, background:'#000', color: p.status === 'SIN ACTIVIDAD' ? '#ef4444' : '#fff', border:'1px solid #333', width:'100%'}}
                          value={p.status}
                          disabled={p.bloqueado}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPersonal(prev => prev.map(item => item.id === p.id ? {...item, status: val} : item));
                          }}
                        >
                          {ESTADOS_POSIBLES.map(est => <option key={est} value={est}>{est}</option>)}
                        </select>
                        <button onClick={() => handleSave(p.id, p.status)} style={{padding:'8px', background:'#fbbf24', border:'none', borderRadius:6, cursor:'pointer'}}>
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
          <div style={{background:'#111', padding:'30px', borderRadius:'12px', border:'1px solid #ef4444'}}>
            <h3 style={{color:'#ef4444', marginTop:0}}><AlertCircle size={20}/> SEDES CON MAYOR INACTIVIDAD</h3>
            <div style={{marginTop:'20px'}}>
              {listaSedes.map(sede => {
                const count = filtrados.filter(p => p.sucursal === sede && p.status === 'SIN ACTIVIDAD').length;
                if (count === 0) return null;
                const reg = filtrados.find(p => p.sucursal === sede)?.region;
                return (
                  <div key={sede} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #222'}}>
                    <span><b>{sede}</b> <small style={{color:'#555'}}>({reg})</small></span>
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