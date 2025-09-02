import logo from './logo.svg';
import './App.css';
import {BrowserRouter,Routes,Route} from 'react-router-dom';
import ERPDashboard from './components/Erp';
import ProductionCapacitySystem from './components/Plantcapacity';
function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<ERPDashboard />} />
      <Route path="/erp" element={<ERPDashboard />} />
      <Route path="/plant-capacity" element={<ProductionCapacitySystem />} />
    </Routes>

    </BrowserRouter>
  );
}

export default App;
