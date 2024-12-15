import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';  // Import Spinner
import axios from 'axios';

const DashboardGPIO = () => {
  // State to hold the digital output states and loading state
  const [digitalOutputs, setDigitalOutputs] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state

  // Fetch digital output states when the component mounts
  useEffect(() => {
    const fetchDigitalOutputs = async () => {
      try {
        const response = await axios.get('http://raspberrypi.local:5000/api/digital-output');
        setDigitalOutputs(response.data);  // Store the states in the state variable
      } catch (error) {
        console.error('Error fetching digital output states:', error);
      } finally {
        setLoading(false); // Set loading to false after fetching data
      }
    };

    fetchDigitalOutputs();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  return (
    <div>
      <Card>
        <Card.Header>
          <Card.Title>Digital Output Status</Card.Title>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <Spinner animation="border" size="sm" role="status" />
          ) : (
            digitalOutputs.map((output, index) => (
              <Card.Text key={index}>
                {output.pin} Status: <span style={{ marginLeft: '10px' }}></span>
                <strong>{output.state ? 'On' : 'Off'}</strong> {/* Show 'On' or 'Off' based on state */}
              </Card.Text>
            ))
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardGPIO;
