import './style.css';
import { createApi } from './api';
import { mountApp } from './app';

void mountApp(document.getElementById('app')!, createApi());
