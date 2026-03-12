import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database'; 
import { RefreshCw, Calendar, LogOut, Lock, Search, Save, CheckCircle, BarChart3, ClipboardList, Users, Activity, AlertCircle, MapPin, Building2 } from 'lucide-react';

// CONFIGURACIÓN FIREBASE
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

// TODOS LOS STATUS DE LA COLUMNA F
const ESTADOS_POSIBLES = [
  "ACTIVO", 
  "SIN ACTIVIDAD", 
  "VACACIONES", 
  "REPOSO", 
  "EGRESO", 
  "AUSENCIA INJUSTIFICADA"
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("auditoria");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [busqueda, setBusqueda] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroRegion, setFiltroRegion] = useState("");
  const [filtroSede, setFiltroSede] = useState("");

  // CARGA DE DATOS DESDE FIREBASE
  useEffect(() => {
    const dbRef = ref(db, 'personal');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data).map(key => {
          const item = data[key];
          return {
            id: key,
            ...item,
            // Normalización para asegurar que los tarjetones sumen bien
            nombreFull: `${item.Nombre || ''} ${item.Apellido || ''}`.trim(),
            region: item.region || item.Región || item.REGION || "N/A",
            sucursal: item.sucursal || item.Sede || item.Sucursal || "N/A",
            // Aseguramos que el status sea uno de los permitidos o "SIN ACTIVIDAD" por defecto
            status: (item.status || "SIN ACTIVIDAD").toUpperCase()
          };
        });
        setPersonal(lista);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // FILTRADO DINÁMICO
  const filtrados = useMemo(() => {
    return personal.filter(p => {
      const matchSearch = (p.nombreFull + p.ID).toLowerCase().includes(busqueda.toLowerCase());
      const matchReg = !filtroRegion || p.region === filtroRegion;
      const matchSed = !filtroSede || p.sucursal === filtroSede;
      const matchMes = !filtroMes || (p.mes || "").toUpperCase() === filtroMes.toUpperCase();
      return matchSearch && matchReg && matchSed && matchMes;
    });
  }, [personal, busqueda, filtroRegion, filtroSede, filtroMes]);

  // ACOMODO DE NÚMEROS DE LOS TARJETONES (KPIs)
  const stats = useMemo(() => {
    const total = filtrados.length;
    const activos = filtrados.filter(p => p.status === 'ACTIVO').length;
    const inactivos = filtrados.filter(p => p.status === 'SIN ACTIVIDAD').length;
    
    return {
      total,
      activos,
      inactivos,
      pActivo: total > 0 ? ((activos / total) * 100).toFixed(1) : "0.0",
      pInactivo: total > 0 ? ((inactivos / total) * 100).toFixed(1) : "0.0"
    };
  }, [filtrados]);

  const handleSave = async (id, nuevoStatus) => {
    try {
      await update(ref(db, `personal/${id}`), { status: nuevoStatus, bloqueado: true });
    } catch (e) { alert("Error al guardar"); }
  };

  if (!isAuthenticated) return (
    <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', backgroundColor:'#000', backgroundImage:'url("/BOT.png")', backgroundSize:'cover'}}>
      <div style={{padding:'40px', background:'rgba(10,10,10,0.9)', borderRadius:'20px', border:'1px solid #333', textAlign:'center', width:'350px'}}>
        <Lock size={40} color="#fbbf24" style={{marginBottom:20}}/>
        <h2 style={{color:'#fff'}}>MATRIZ SRT 2026</h2>
        <input style={{width:'100%', padding:12, marginBottom:10, borderRadius:8, border:'1px solid #333', background:'#000', color:'#fff'}} placeholder="Usuario" onChange={e=>setUser(e.target.value)} />
        <input type="password" style={{width:'100%', padding:12, marginBottom:20, borderRadius:8, border:'1px solid #333', background:'#000', color:'#fff'}} placeholder="Contraseña" onChange={e=>setPass(e.target.value)} />
        <button onClick={() => {if(user==="ADMCanguro" && pass==="SRT2026") setIsAuthenticated(true); else alert("Error");}} style={{width:'100%', padding:12, background:'#fbbf24', border:'none', borderRadius:8, fontWeight:'bold', cursor:'pointer'}}>INGRESAR</button>
      </div>
    </div>
  );

  return (
    <div style={{backgroundColor:'#000', color:'#fff', minHeight:'100vh', padding:'20px', fontFamily:'sans-serif'}}>
      <div style={{maxWidth:'1600px', margin:'0 auto'}}>
        
        {/* HEADER */}
        <header style={{display:'flex', justifyContent:'space-between', marginBottom:'30px', borderBottom:'1px solid #222', paddingBottom:'20px'}}>
          <div>
            <h1 style={{margin:0, fontSize:'28px', fontWeight:'900'}}>MATRIZ ASISTENCIA <span style={{color:'#fbbf24'}}>PRO</span></h1>
            <p style={{margin:0, color:'#555', fontWeight:'bold'}}>SISTEMA NACIONAL 2026</p>
          </div>
          <button onClick={() => window.location.reload()} style={{padding:'10px 20px', borderRadius:8, background:'#222', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8}}>
            <RefreshCw size={18}/> REFRESCAR BDD
          </button>
        </header>

        {/* TARJETONES ACTUALIZADOS */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'20px', marginBottom:'30px'}}>
          <div style={{background:'#0a0a0a', padding:'25px', borderRadius:'15px', border:'1px solid #333'}}>
            <span style={{color:'#888', fontSize:'12px'}}>REGISTROS FILTRADOS</span>
            <div style={{fontSize:'40px', fontWeight:'bold', marginTop:10}}><Users style={{color:'#888'}}/> {stats.total}</div>
          </div>
          <div style={{background:'#0a0a0a', padding:'25px', borderRadius:'15px', border:'1px solid #fbbf24'}}>
            <span style={{color:'#fbbf24', fontSize:'12px'}}>ACTIVOS ({stats.pActivo}%)</span>
            <div style={{fontSize:'40px', fontWeight:'bold', marginTop:10, color:'#fbbf24'}}><Activity/> {stats.activos}</div>
          </div>
          <div style={{background:'#0a0a0a', padding:'25px', borderRadius:'15px', border:'1px solid #ef4444'}}>
            <span style={{color:'#ef4444', fontSize:'12px'}}>SIN ACTIVIDAD ({stats.pInactivo}%)</span>
            <div style={{fontSize:'40px', fontWeight:'bold', marginTop:10, color:'#ef4444'}}><AlertCircle/> {stats.inactivos}</div>
          </div>
        </div>

        {/* TABLA DE AUDITORÍA */}
        <div style={{background:'#0a0a0a', borderRadius:'15px', border:'1px solid #222', overflow:'hidden'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#111', color:'#fbbf24', textAlign:'left', fontSize:'12px'}}>
                <th style={{padding:'15px'}}>COLABORADOR / SEDE</th>
                <th style={{padding:'15px'}}>ESTADO EN MATRIZ (COL. F)</th>
                <th style={{padding:'15px', textAlign:'center'}}>GESTIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                  <td style={{padding:'15px'}}>
                    <div style={{fontWeight:'bold', textTransform:'uppercase'}}>{p.nombreFull}</div>
                    <div style={{fontSize:'12px', color:'#fbbf24'}}>{p.sucursal} | {p.region}</div>
                  </td>
                  <td style={{padding:'15px'}}>
                    <select 
                      value={p.status} 
                      disabled={p.bloqueado}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPersonal(prev => prev.map(item => item.id === p.id ? {...item, status: val} : item));
                      }}
                      style={{
                        width:'100%', padding:'10px', borderRadius:6, background:'#000', 
                        color: p.status === 'SIN ACTIVIDAD' ? '#ef4444' : (p.status === 'ACTIVO' ? '#34d399' : '#fff'),
                        border: '1px solid #333', fontWeight:'bold'
                      }}
                    >
                      {ESTADOS_POSIBLES.map(est => <option key={est} value={est}>{est}</option>)}
                    </select>
                  </td>
                  <td style={{padding:'15px', textAlign:'center'}}>
                    <button onClick={() => handleSave(p.id, p.status)} style={{background:'#fbbf24', border:'none', padding:10, borderRadius:8, cursor:'pointer'}}>
                      {p.bloqueado ? <CheckCircle size={20}/> : <Save size={20}/>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}