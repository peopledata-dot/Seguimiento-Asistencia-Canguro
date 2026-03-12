import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { 
  Users, Activity, AlertCircle, Search, 
  Download, RefreshCw, Calendar, MapPin 
} from 'lucide-react';
import * as XLSX from 'xlsx';

// 1. CONFIGURACIÓN DE FIREBASE (Usa tus credenciales)
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

const App = () => {
  const [personal, setPersonal] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  // 2. CARGA DE DATOS DESDE REALTIME DATABASE
  useEffect(() => {
    const dbRef = ref(db, 'personal');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convertimos a array si Firebase lo devuelve como objeto
        const lista = Array.isArray(data) ? data : Object.values(data);
        setPersonal(lista);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. LÓGICA DE FILTRADO Y MÉTRICAS (TARJETONES)
  const filtrados = useMemo(() => {
    return personal.filter(p => 
      Object.values(p).some(val => 
        val.toString().toLowerCase().includes(busqueda.toLowerCase())
      )
    );
  }, [personal, busqueda]);

  const cantActivos = filtrados.filter(p => p.status?.toUpperCase() === 'ACTIVO').length;
  const cantSinActividad = filtrados.filter(p => p.status?.toUpperCase() === 'SIN ACTIVIDAD').length;

  // 4. FUNCIÓN EXPORTAR A EXCEL
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtrados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Matriz_Auditoria_${new Date().toLocaleDateString()}.xlsx`);
  };

  // 5. DISEÑO (ESTILOS)
  const styles = {
    container: { padding: '20px', backgroundColor: '#111', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
    card: (color) => ({
      backgroundColor: '#1a1a1a', borderLeft: `5px solid ${color}`, padding: '20px', borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
    }),
    searchBox: { display: 'flex', gap: '10px', marginBottom: '20px' },
    input: { flex: 1, padding: '12px', borderRadius: '5px', border: 'none', backgroundColor: '#222', color: 'white' },
    btn: { padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' },
    tabla: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' },
    th: { backgroundColor: '#333', padding: '15px', textAlign: 'left', color: '#888', fontSize: '12px' },
    td: { padding: '15px', borderBottom: '1px solid #333' }
  };

  if (loading) return <div style={styles.container}>Cargando datos de Matriz SRT...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{margin:0, color: '#fbbf24'}}>MATRIZ PRO - AUDITORÍA 2026</h1>
        <div style={{display:'flex', gap:'10px'}}>
          <button onClick={() => window.location.reload()} style={{...styles.btn, backgroundColor: '#333', color: '#fff'}}><RefreshCw size={18}/>Refrescar</button>
          <button onClick={exportarExcel} style={{...styles.btn, backgroundColor: '#fbbf24', color: '#000'}}><Download size={18}/>Exportar</button>
        </div>
      </div>

      {/* TARJETONES (KPIs) */}
      <div style={styles.kpiGrid}>
        <div style={styles.card('#fbbf24')}>
          <div style={{color: '#888', fontSize: '12px'}}>TOTAL PERSONAL</div>
          <div style={{fontSize: '32px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px'}}><Users color="#fbbf24"/> {filtrados.length}</div>
        </div>
        <div style={styles.card('#fbbf24')}>
          <div style={{color: '#fbbf24', fontSize: '12px'}}>ACTIVOS</div>
          <div style={{fontSize: '32px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px'}}><Activity color="#fbbf24"/> {cantActivos}</div>
        </div>
        <div style={styles.card('#ef4444')}>
          <div style={{color: '#ef4444', fontSize: '12px'}}>SIN ACTIVIDAD</div>
          <div style={{fontSize: '32px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px'}}><AlertCircle color="#ef4444"/> {cantSinActividad}</div>
        </div>
      </div>

      <div style={styles.searchBox}>
        <Search style={{position:'absolute', marginLeft:'12px', marginTop:'12px'}} color="#555" size={20}/>
        <input 
          style={{...styles.input, paddingLeft:'45px'}} 
          placeholder="Buscar por ID, nombre, región..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <table style={styles.tabla}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>NOMBRE Y APELLIDO</th>
            <th style={styles.th}>ESTADO</th>
            <th style={styles.th}>REGIÓN / SUCURSAL</th>
            <th style={styles.th}>FECHA CARGA</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map((p, i) => (
            <tr key={i}>
              <td style={styles.td}>{p.ID || p.id}</td>
              <td style={styles.td}>
                <div style={{fontWeight:'bold'}}>{p.Nombre} {p.Apellido}</div>
              </td>
              <td style={styles.td}>
                <span style={{
                  padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                  backgroundColor: p.status === 'ACTIVO' ? '#065f46' : '#991b1b',
                  color: p.status === 'ACTIVO' ? '#34d399' : '#f87171'
                }}>
                  {p.status || 'SIN ESTADO'}
                </span>
              </td>
              <td style={styles.td}>
                <div style={{fontSize: '12px', color: '#888'}}><MapPin size={12}/> {p.region} - {p.sucursal}</div>
              </td>
              <td style={styles.td}>
                <div style={{fontSize: '13px'}}><Calendar size={13}/> {p.fecha}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;