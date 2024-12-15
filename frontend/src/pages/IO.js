import React, { useState } from 'react';
import {Container, Nav } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import IOStatus from '../components/IOStatus'
import IOReport from '../components/IOReport';
import DOWrite from '../components/DOWrite';
import IOEvent from '../components/IOEvent';

const IO = () => {
  const [activeTab, setActiveTab] = useState('status');

  const renderForm = () => {
      switch(activeTab) {
          case 'status':
              return <IOStatus />;
          case 'report':
              return <IOReport />;
          case 'write':
            return <DOWrite />;
          case 'event':
            return <IOEvent />;

          default:
              return <div>Select a tab</div>;
      }
  };  
return (
  <Container>
    <h2>GPIO</h2>
    {/* Config Form  */}
    <Nav variant="tabs" defaultActiveKey="config" onSelect={(selectedKey) => setActiveTab(selectedKey)}>
      <Nav.Item >
        <Nav.Link eventKey="status" active={activeTab === 'status'}>
          Status
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link eventKey="report" active={activeTab === 'report'}>
          Input Report
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link eventKey="write" active={activeTab === 'write'}>
          DO Write
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

export default IO
