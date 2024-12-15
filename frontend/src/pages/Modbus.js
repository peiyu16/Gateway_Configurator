import React, { useState } from 'react';
import {Container, Nav } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Device from '../components/Device'
import DeviceNode from '../components/DeviceNode';
import DataAcquisition from '../components/DataAcquisition';
import DataSet from '../components/DataSet';
import EventControl from '../components/EventControl';

const Modbus = () => {
    
    // Change the default tab
    const [activeTab, setActiveTab] = useState('device');

    const renderForm = () => {
      switch(activeTab) {
          case 'device':
            return <Device />;
          case 'node':
            return <DeviceNode/>
          case 'acquisition':
            return <DataAcquisition/>
          case 'set':
            return <DataSet/>
          case 'event':
          return <EventControl/>
          default:
            return <div>Select a tab</div>;
      }
  };

    return (
      <Container>
      <h2>Modbus</h2>
      {/* Modbus  */}
      <Nav variant="tabs" defaultActiveKey="device" onSelect={(selectedKey) => setActiveTab(selectedKey)}>
        <Nav.Item >
          <Nav.Link eventKey="device" active={activeTab === 'device'}>
            Modbus Device
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="node" active={activeTab === 'node'}>
            Device Node
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="acquisition" active={activeTab === 'acquisition'}>
            Data Acquisition
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="set" active={activeTab === 'set'}>
            Register Write
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="event" active={activeTab === 'event'}>
            Event Control
          </Nav.Link>
        </Nav.Item>
      </Nav>

    {renderForm()}
    </Container>
    )
  
}

export default Modbus
