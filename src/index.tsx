import * as React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/main.css'; // Import main CSS file that includes all styles
import App from './App';
import reportWebVitals from './reportWebVitals';
import { setupDatabase } from './lib/dbSetup';

// Iniciar configuración de la base de datos
// Ejecuta esta función de forma asíncrona para no bloquear el renderizado
setupDatabase().catch(err => {
  console.error('Error en la configuración inicial de la base de datos:', err);
  // No fallamos catastróficamente, permitimos que la app continúe
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(); 