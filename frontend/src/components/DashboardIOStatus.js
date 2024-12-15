import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';  // Import Spinner
import axios from 'axios';

const DashboardIOStatus = () => {
  // State to hold the modbus status and loading state
  const [ioStatus, setIoStatus] = useState({
    enablereport: null,
    enabledowrite: null
  });
  const [loading, setLoading] = useState(true); // Loading state

  // Fetch modbus status when the component mounts
  useEffect(() => {
    const fetchModbusStatus = async () => {
      try {
        const response = await axios.get('http://raspberrypi.local:5000/api/iostat');
        setIoStatus(response.data); // Store the modbus status in state
      } catch (error) {
        console.error('Error fetching modbus status:', error);
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
          <Card.Title>GPIO Status</Card.Title>
        </Card.Header>
        <Card.Body>
          <Card.Text>
            Inputs Reporting: <span style={{ marginLeft: '10px' }}></span>
            {loading ? (
              <Spinner animation="border" size="sm" role="status" />
            ) : (
              <strong>{ioStatus.enablereport !== null ? (ioStatus.enablereport ? 'Enabled' : 'Disabled') : '--'}</strong>
            )}
          </Card.Text>
          <Card.Text>
            Digital Output Write: <span style={{ marginLeft: '10px' }}></span>
            {loading ? (
              <Spinner animation="border" size="sm" role="status" />
            ) : (
              <strong>{ioStatus.enabledowrite !== null ? (ioStatus.enabledowrite ? 'Enabled' : 'Disabled') : '--'}</strong>
            )}
          </Card.Text>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardIOStatus;
