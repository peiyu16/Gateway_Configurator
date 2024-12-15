import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';  // Import Spinner
import axios from 'axios';

const DashboardNetwork = () => {
  // State to hold network status
  const [networkStatus, setNetworkStatus] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state

  // Fetch network status when the component mounts
  useEffect(() => {
    const fetchNetworkStatus = async () => {
      try {
        const response = await axios.get('http://raspberrypi.local:5000/api/network/status');
        setNetworkStatus(response.data);
      } catch (error) {
        console.error('Error fetching network status:', error);
      } finally {
        setLoading(false); // Set loading to false after fetching data
      }
    };

    fetchNetworkStatus();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  return (
    <div>
      <Card>
        <Card.Header>
          <Card.Title>Network Status</Card.Title>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <Spinner animation="border" size="sm" role="status" />
          ) : (
            <>
              <Card.Text>
                Ethernet 0: <strong>{networkStatus?.find((iface) => iface.interface === 'eth0')?.ipAddress || '--'}</strong>
              </Card.Text>
              <Card.Text>
                Ethernet 1: <strong>{networkStatus?.find((iface) => iface.interface === 'eth1')?.ipAddress || '--'}</strong>
              </Card.Text>
              <Card.Text>
                Wlan 0<span style={{ marginLeft: '24px' }}></span>: <strong>{networkStatus?.find((iface) => iface.interface === 'wlan0')?.ipAddress || '--'}</strong>
              </Card.Text>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardNetwork;
