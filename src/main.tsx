import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {StudyProvider} from './store';
import './style.css';
createRoot(document.getElementById('root')!).render(<StrictMode><StudyProvider><App/></StudyProvider></StrictMode>);
