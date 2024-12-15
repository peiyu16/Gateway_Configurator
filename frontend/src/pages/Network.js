import React, { useState } from 'react';
import {Container, Nav } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import NetworkStatus from '../components/NetworkStatus';
import Ethernet from '../components/Ethernet';
import Ethernet2 from '../components/Ethernet2';
import Wireless from '../components/Wireless';
import Wlan from '../components/Wlan';

const Network = () => {

    const [activeTab, setActiveTab] = useState('status');

    const renderForm = () => {
        switch(activeTab) {
            case 'status':
                return <NetworkStatus />;
            case 'ethernet':
                return <Ethernet />;
            case 'ethernet2':
                return <Ethernet2 />;
            case 'wireless':
                return <Wlan />;
            default:
                return <div>Select a tab</div>;
        }
    };  
  return (
    <Container>
      <h2 style={{marginBottom: "25px"}}>Network</h2>
      {/* Config Form  */}
      <Nav variant="tabs" defaultActiveKey="config" onSelect={(selectedKey) => setActiveTab(selectedKey)}>
        <Nav.Item >
          <Nav.Link eventKey="status" active={activeTab === 'status'}>
            Status
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="ethernet" active={activeTab === 'ethernet'}>
            ETH 0
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="ethernet2" active={activeTab === 'ethernet2'}>
            ETH 1
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="wireless" active={activeTab === 'wireless'}>
            Wi-Fi
          </Nav.Link>
        </Nav.Item>
      </Nav>

    {renderForm()}
    </Container>
  )
}

export default Network
