import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // Importa esto

const firebaseConfig = {
  apiKey: "AIzaSyB2k-WOoIy_hSnzlkClaf7DCL3ERTbs-Qg",
  authDomain: "matrizpro-c27c6.firebaseapp.com",
  projectId: "matrizpro-c27c6",
  storageBucket: "matrizpro-c27c6.firebasestorage.app",
  messagingSenderId: "529048990599",
  appId: "1:529048990599:web:787453dd2185ea06801922",
  databaseURL: "https://matrizpro-c27c6-default-rtdb.firebaseio.com" // Añade esta línea
};

const app = initializeApp(firebaseConfig);
export const realTimeDb = getDatabase(app); // Exporta la base de datos