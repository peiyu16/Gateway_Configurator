import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';  // Import Spinner
import axios from 'axios';

const DashboardSerialPort = () => {
  // State to hold the list of serial ports and loading state
  const [serialPorts, setSerialPorts] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state

  // Fetch serial ports when the component mounts
  useEffect(() => {
    const fetchSerialPorts = async () => {
      try {
        const response = await axios.get('http://raspberrypi.local:5000/api/serialports');
        setSerialPorts(response.data.ports);  // Store the serial ports in state
      } catch (error) {
        console.error('Error fetching serial ports:', error);
      } finally {
        setLoading(false); // Set loading to false after fetching data
      }
    };

    fetchSerialPorts();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  return (
    <div>
      <Card>
        <Card.Header>
          <Card.Title>Serial Port List</Card.Title>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <Spinner animation="border" size="sm" role="status" />
          ) : (
            <div>
              {serialPorts.length > 0 ? (
                serialPorts.map((port, index) => (
                  <p key={index}>
                    Port {index + 1}: <strong>{port}</strong>
                  </p>
                ))
              ) : (
                <p>No serial ports found.</p> // Display message if no serial ports are found
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardSerialPort;
