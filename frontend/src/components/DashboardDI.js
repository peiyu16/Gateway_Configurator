import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';  // Import Spinner
import axios from 'axios';

const DashboardDI = () => {
  // State to hold the input states and loading state
  const [inputStates, setInputStates] = useState({});
  const [loading, setLoading] = useState(true); // Loading state

  // Fetch digital input states when the component mounts
  useEffect(() => {
    const fetchInputStates = async () => {
      try {
        const response = await axios.get('http://raspberrypi.local:5000/api/digital-input-states');
        setInputStates(response.data); // Store the input states in state
      } catch (error) {
        console.error('Error fetching digital input states:', error);
      } finally {
        setLoading(false); // Set loading to false after fetching data
      }
    };

    fetchInputStates();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  return (
    <div>
      <Card>
        <Card.Header>
          <Card.Title>Digital Input Status</Card.Title>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <Spinner animation="border" size="sm" role="status" />
          ) : (
            <div>
              {Object.keys(inputStates).length > 0 ? (
                Object.entries(inputStates).map(([inputKey, value], index) => (
                  <Card.Text key={index}>
                    {inputKey} Status: <span style={{ marginLeft: '10px' }}></span>
                    <strong>{value === 1 ? 'High' : 'Low'}</strong> {/* Show 'High' or 'Low' based on state */}
                  </Card.Text>
                ))
              ) : (
                <p>No digital input states available.</p> // Display message if no data is found
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardDI;
