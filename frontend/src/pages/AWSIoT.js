import React, { useState } from 'react';
import {Container, Nav } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import AWSIoTConfig from '../components/AWSIoTConfig';
import AWSPublish from '../components/AWSPublish';
import AWSSubscribe from '../components/AWSSubscribe';

const AWSIoT = () => {

  const [activeTab, setActiveTab] = useState('config');

  const renderForm = () => {
    switch(activeTab) {
        case 'config':
            return <AWSIoTConfig />;
        case 'publish':
            return <AWSPublish />;
        case 'subscribe':
            return <AWSSubscribe />;
        default:
            return <div>Select a tab</div>;
    }
};

  return (
    <Container>
      <h2>AWS IoT</h2>
      {/* Config Form  */}
      <Nav variant="tabs" defaultActiveKey="config" onSelect={(selectedKey) => setActiveTab(selectedKey)}>
        <Nav.Item >
          <Nav.Link eventKey="config" active={activeTab === 'config'}>
            AWSIoT Configuration
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="publish" active={activeTab === 'publish'}>
            AWSIoT Publish
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="subscribe" active={activeTab === 'subscribe'}>
            AWSIoT Subscribe
          </Nav.Link>
        </Nav.Item>
      </Nav>

    {renderForm()}
    </Container>
      
  );
}

export default AWSIoT;