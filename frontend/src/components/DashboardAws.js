import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';  // Import Spinner
import axios from 'axios';

const DashboardAws = () => {
  // State to hold the connection status and loading state
  const [connectionStatus, setConnectionStatus] = useState('');
  const [loading, setLoading] = useState(true); // Add loading state

  // Fetch MQTT status when the component mounts
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axios.get('http://raspberrypi.local:5000/api/awsiot/status');
        // Check if client is not null and update the connection status accordingly
        if (response.data.awsClient) {
          setConnectionStatus('Connected');
        } else {
          setConnectionStatus('Disconnected');
        }
      } catch (error) {
        console.error('Error fetching MQTT status:', error);
        setConnectionStatus('Disconnected'); // In case of an error, assume disconnected
      } finally {
        setLoading(false); // Set loading to false after fetching data
      }
    };

    fetchStatus();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  return (
    <div>
      <Card>
        <Card.Header>
          <Card.Title>AWS IoT Status</Card.Title>
        </Card.Header>
        <Card.Body>
          <Card.Text>
            Connection Status: <span style={{ marginLeft: '10px' }}></span>
            {loading ? (  // If loading, show spinner
              <Spinner animation="border" size="sm" role="status" />
            ) : (
              <strong>{connectionStatus}</strong>  // Otherwise, show the connection status
            )}
          </Card.Text>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardAws;
