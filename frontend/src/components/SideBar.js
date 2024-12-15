import React from 'react';
import {
    CDBSidebar,
    CDBSidebarContent,
    CDBSidebarFooter,
    CDBSidebarHeader,
    CDBSidebarMenu,
    CDBSidebarMenuItem,
} from 'cdbreact';
import { NavLink, Route, Routes } from 'react-router-dom';

// Import your components/pages here
import SerialPortCard from './SerialPortCard';
import DataTransmitForm from '../pages/DataTransmitForm';
import MQTTForm from '../pages/MQTTForm';
import Modbus from '../pages/Modbus';
import IO from '../pages/IO';
import SerialPortConfig from './SerialPortConfig';
import MQTTPublishForm from './MQTTPublishForm';
import MQTTSubscribeForm from './MQTTSubscribeForm';
import AWSIoT from '../pages/AWSIoT';
import Dashboard from '../pages/Dashboard';
import Network from '../pages/Network';
import Wireless from './Wireless';
const SideBar = () => {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar Navigation */}
      <CDBSidebar textColor="#fff" backgroundColor="#333" style={{ height: '100vh' }}>
        <CDBSidebarHeader prefix={<i className="fa fa-bars fa-large"></i>} >
          <a href="/" className="text-decoration-none" style={{ color: 'inherit' }}>
            IIoT Gateway
          </a>
        </CDBSidebarHeader>

        <CDBSidebarContent className="sidebar-content">
          <CDBSidebarMenu>
            <NavLink exact to="/" activeClassName="activeClicked">
              <CDBSidebarMenuItem icon="columns">Dashboard</CDBSidebarMenuItem>
            </NavLink>
            <NavLink exact to="/datatransmit-configure" activeClassName="activeClicked">
              <CDBSidebarMenuItem icon="exchange-alt">Data Transmission</CDBSidebarMenuItem>
            </NavLink>
            <NavLink exact to="/mqtt-configure" activeClassName="activeClicked">
              <CDBSidebarMenuItem icon="paper-plane">MQTT</CDBSidebarMenuItem>
            </NavLink>
            <NavLink exact to="/modbus" activeClassName="activeClicked">
              <CDBSidebarMenuItem icon="digital-tachograph">Modbus</CDBSidebarMenuItem>
            </NavLink>
            <NavLink exact to="/controlio" activeClassName="activeClicked">
              <CDBSidebarMenuItem icon="toggle-on">IO Control</CDBSidebarMenuItem>
            </NavLink>
            <NavLink exact to="/awsiot" activeClassName="activeClicked">
              <CDBSidebarMenuItem icon="cloud">AWS IoT</CDBSidebarMenuItem>
            </NavLink>
            <NavLink exact to="/network" activeClassName="activeClicked">
              <CDBSidebarMenuItem icon="network-wired">Network</CDBSidebarMenuItem>
            </NavLink>
          </CDBSidebarMenu>
        </CDBSidebarContent>

        <CDBSidebarFooter style={{ textAlign: 'center' }}>
          <div style={{ padding: '20px 5px' }}>
            EAT40004 FYRP2
          </div>
        </CDBSidebarFooter>
      </CDBSidebar>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/datatransmit-configure" element={<DataTransmitForm />} />
          <Route path="/mqtt-configure" element={<MQTTForm />} />
          <Route path="/modbus" element={<Modbus />} />
          <Route path="/controlio" element={<IO />} />
          <Route path="/serialport-config" element={<SerialPortConfig />} />
          <Route path="/mqttpublishform" element={<MQTTPublishForm />} />
          <Route path="/mqttsubform" element={<MQTTSubscribeForm />} />
          <Route path="/awsiot" element={<AWSIoT />} />
          <Route path="/network" element={<Network />} />
          <Route path="/wireless" element={<Wireless />} />
        </Routes>
      </div>
    </div>
  );
};

export default SideBar;
