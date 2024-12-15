import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';  // Import Spinner
import axios from 'axios';

const DashboardModbus = () => {
  // State to hold the Modbus status and loading state
  const [modbusStatus, setModbusStatus] = useState({ enabledAcq: null, enableReg: null });
  const [loading, setLoading] = useState(true); // Loading state

  // Fetch Modbus status when the component mounts
  useEffect(() => {
    const fetchModbusStatus = async () => {
      try {
        const response = await axios.get('http://raspberrypi.local:5000/api/modbusstat');
        setModbusStatus(response.data);  // Store the states in the state variable
      } catch (error) {
        console.error('Error fetching Modbus status:', error);
      } finally {
        setLoading(false); // Set loading to false after fetching data
      }
    };

    fetchModbusStatus();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  return (
    <div>
      <Card>
        <Card.Header>
          <Card.Title>Modbus Status</Card.Title>
        </Card.Header>
        <Card.Body>
          <Card.Text>
            Data Acquisition: <span style={{ marginLeft: '10px' }}></span>
            {loading ? (
              <Spinner animation="border" size="sm" role="status" />
            ) : (
              <strong>{modbusStatus.enabledAcq !== null ? (modbusStatus.enabledAcq ? 'Enabled' : 'Disabled') : '--'}</strong> // Show Enabled/Disabled or '--' if no data
            )}
          </Card.Text>
          <Card.Text>
            Register Write: <span style={{ marginLeft: '10px' }}></span>
            {loading ? (
              <Spinner animation="border" size="sm" role="status" />
            ) : (
              <strong>{modbusStatus.enableReg !== null ? (modbusStatus.enableReg ? 'Enabled' : 'Disabled') : '--'}</strong> // Show Enabled/Disabled or '--' if no data
            )}
          </Card.Text>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardModbus;
