import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from './firebaseConfig';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore'; 
import { RefreshCw, Calendar, LogOut, Lock, Search, Save, CheckCircle, BarChart3, ClipboardList, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

// --- ESTILOS ---
const styles = {
  loginOverlay: { backgroundImage: 'url("/BOT.png")', backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', position: 'relative' },
  loginDarken: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1 },
  loginCard: { backgroundColor: '#111', padding: '40px', borderRadius: '20px', border: '1px solid #333', width: '350px', textAlign: 'center', zIndex: 2, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  container: { backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  wrapper: { width: '100%', maxWidth: '1600px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '20px' },
  logoImg: { width: '150px', height: 'auto', objectFit: 'contain' },
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
  btnOut: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }
};

// --- CONSTANTES ---
const ESTADOS_POSIBLES = ["ACTIVO", "SIN ACTIVIDAD", "VACACIONES", "REPOSO", "EGRESO", "AUSENCIA INJUSTIFICADA"];
const MESES_MAP = {
  "ENERO": "01", "FEBRERO": "02", "MARZO": "03", "ABRIL": "04", "MAYO": "05", "JUNIO": "06",
  "JULIO": "07", "AGOSTO": "08", "SEPTIEMBRE": "09", "OCTUBRE": "10", "NOVIEMBRE": "11", "DICIEMBRE": "12"
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("auditoria");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  // Carga de datos
  const fetchDatos = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const q = query(collection(db, "personal"), orderBy("Nombre", "asc"));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPersonal(docs);
    } catch (error) {
      console.error("Error Firebase:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchDatos(); }, [fetchDatos]);

  // Lógica de Filtrado Crítica (Extrae el mes de la Columna G)
  const filtrados = useMemo(() => {
    return personal.filter(p => {
      const pFechaRaw = (p.Fecha || p.fecha || p.fechaCarga || "").toString();
      
      // Normalizamos: 11/03/2026 -> extraemos el "03"
      const partes = pFechaRaw.split('/');
      const mesExtraido = partes.length > 1 ? partes[1].padStart(2, '0') : "";

      const matchSearch = `${p.Nombre} ${p.ID}`.toLowerCase().includes(busqueda.toLowerCase());
      const matchMes = !filtroMes || mesExtraido === MESES_MAP[filtroMes];
      const matchStatus = !filtroStatus || p.status === filtroStatus;

      return matchSearch && matchMes && matchStatus;
    });
  }, [personal, busqueda, filtroMes, filtroStatus]);

  // Guardado individual
  const handleGuardar = async (id, statusActual) => {
    if (window.confirm("¿Confirmar registro?")) {
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

  // Exportación
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtrados.map(p => ({
        Nombre: p.Nombre,
        ID: p.ID,
        Sede: p.sucursal,
        Estado: p.status,
        Fecha: p.Fecha || p.fecha
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Reporte_SRT_${filtroMes || 'General'}.xlsx`);
  };

  if (!isAuthenticated) return (
    <div style={styles.loginOverlay}>
      <div style={styles.loginDarken}></div>
      <div style={styles.loginCard}>
        <Lock size={40} color="#fbbf24" style={{marginBottom:'20px'}}/>
        <h2 style={{color:'#fff', marginBottom:'20px'}}>ACCESO MATRIZ SRT</h2>
        <form onSubmit={(e) => { e.preventDefault(); if (user === "ADMCanguro" && pass === "SRT2026") setIsAuthenticated(true); else alert("Credenciales incorrectas"); }}>
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
          <img src="/logo-canguro.png" alt="Logo" style={styles.logoImg} />
          <div style={{display:'flex', gap:'10px'}}>
            <button onClick={fetchDatos} style={{...styles.btnOut, backgroundColor: '#333'}}>
              <RefreshCw size={18} className={loading ? "animate-spin" : ""}/> ACTUALIZAR
            </button>
            <button onClick={()=>setIsAuthenticated(false)} style={styles.btnOut}><LogOut size={18}/> SALIR</button>
          </div>
        </header>

        <nav style={styles.navBar}>
          <button style={styles.navBtn(activeTab === "auditoria")} onClick={() => setActiveTab("auditoria")}>
            <ClipboardList size={18}/> AUDITORÍA
          </button>
          <button style={styles.navBtn(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>
            <BarChart3 size={18}/> DASHBOARD
          </button>
        </nav>

        <div style={styles.filterBox}>
          <div style={{flex:2, display:'flex', alignItems:'center', backgroundColor:'#000', borderRadius:'8px', padding:'0 15px', border:'1px solid #222'}}>
            <Search size={18} color="#444"/><input style={{...styles.input, border:'none'}} placeholder="Buscar por Nombre o ID..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          </div>

          <select style={styles.input} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}>
            <option value="">MES (TODOS)</option>
            {Object.keys(MESES_MAP).map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select style={styles.input} value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
            <option value="">ESTADO (TODOS)</option>
            {ESTADOS_POSIBLES.map(est => <option key={est} value={est}>{est}</option>)}
          </select>

          <button onClick={exportarExcel} style={{...styles.btnOut, backgroundColor: '#166534'}}><FileSpreadsheet size={18}/> EXCEL</button>
        </div>

        {activeTab === "auditoria" ? (
          <div style={{backgroundColor: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #333'}}>
            <table style={styles.table}>
              <thead>
                <tr style={{backgroundColor: '#1a1a1a'}}>
                  <th style={styles.th}>COLABORADOR</th>
                  <th style={styles.th}>FECHA</th>
                  <th style={{...styles.th, textAlign:'center'}}>GESTIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id}>
                    <td style={styles.td}>
                      <div style={{fontWeight:'bold'}}>{p.Nombre}</div>
                      <div style={{fontSize:'12px', color:'#fbbf24'}}>{p.sucursal}</div>
                    </td>
                    <td style={styles.td}>
                        <div style={{display:'flex', alignItems:'center', gap:'5px', color:'#888'}}>
                            <Calendar size={14}/> {p.Fecha || p.fecha || '---'}
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
          <div style={{padding:'20px', textAlign:'center', color:'#555'}}>Dashboard listo para métricas de {filtroMes || 'Marzo'}</div>
        )}
      </div>
    </div>
  );
}