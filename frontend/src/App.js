import './App.css';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { Container, Nav, Navbar, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import MQTTForm from './pages/MQTTForm';
import LoginForm from './components/LoginForm';
import DataTransmitForm from './pages/DataTransmitForm';
import SerialPortCard from './components/SerialPortCard';
import SerialPortConfig from './components/SerialPortConfig';
import Modbus from './pages/Modbus';
import IO from './pages/IO';
import MQTTPublishForm from './components/MQTTPublishForm';
import MQTTSubscribeForm from './components/MQTTSubscribeForm';
import SideBar from './components/SideBar';

function App() {
  return (
    <Router>
      <div className="App">
        <SideBar/>
      </div>
    </Router>
    
  );
}
export default App;
