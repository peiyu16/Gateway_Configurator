import React, { useState } from 'react';
import {Container, Nav } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import MQTTConfig from '../components/MQTTConfig';
import MQTTPublish from '../../src/components/MQTTPublish';
import MQTTSubscribe from '../../src/components/MQTTSubscribe';

const MQTTForm = () => {

  const [activeTab, setActiveTab] = useState('config');

  const renderForm = () => {
    switch(activeTab) {
        case 'config':
            return <MQTTConfig />;
        case 'publish':
            return <MQTTPublish />;
        case 'subscribe':
            return <MQTTSubscribe />;
        default:
            return <div>Select a tab</div>;
    }
};

  return (
    <Container>
      <h2>MQTT</h2>
      {/* Config Form  */}
      <Nav variant="tabs" defaultActiveKey="config" onSelect={(selectedKey) => setActiveTab(selectedKey)}>
        <Nav.Item >
          <Nav.Link eventKey="config" active={activeTab === 'config'}>
            MQTT Configuration
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="publish" active={activeTab === 'publish'}>
            MQTT Publish
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="subscribe" active={activeTab === 'subscribe'}>
            MQTT Subscribe
          </Nav.Link>
        </Nav.Item>
      </Nav>

    {renderForm()}
    </Container>
      
  );
}

export default MQTTForm;