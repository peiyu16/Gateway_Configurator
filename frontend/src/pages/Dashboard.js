import React from 'react';
import DashboardMQTT from '../components/DashboardMQTT';
import DashboardAws from '../components/DashboardAws';
import DashboardNetwork from '../components/DashboardNetwork';
import DashboardGPIO from '../components/DashboardGPIO';
import DashboardModbus from '../components/DashboardModbus';
import DashboardSerialPort from '../components/DashboardSerialPort';
import DashboardEvent from '../components/DashboardEvent';
import DashboardIOStatus from '../components/DashboardIOStatus';
import DashboardAI from '../components/DashboardAI';
import DashboardDI from '../components/DashboardDI';
import { Row, Col} from 'react-bootstrap';

function Dashboard() {
  return (
    <div>
      <h2>Dashboard</h2>
      <Row className='mt-2'>
        <Col sm={'4'}>
          <Row><DashboardNetwork/></Row>
          <Row className='mt-4'><DashboardSerialPort/></Row>
          <Row className='mt-4'><DashboardModbus/></Row>
          <Row className='mt-4'><DashboardIOStatus/></Row>
        </Col>
        <Col sm={'8'}>
          <Row>
            <Col><DashboardMQTT/></Col>
            <Col><DashboardAws/></Col>
          </Row>
          <Row className='mt-4'>
            <Col><DashboardGPIO/></Col>
            <Col><DashboardDI/></Col>
            <Col><DashboardAI/></Col>
          </Row>
          <Row className='mt-4'>
            <DashboardEvent/>
          </Row>
          
        </Col>
        
      </Row>
    </div>
  )
}

export default Dashboard
