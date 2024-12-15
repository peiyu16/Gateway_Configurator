import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';  // Import Spinner
import axios from 'axios';

const DashboardAI = () => {
  // State to hold the input data (as an object) and loading state
  const [inputStates, setInputStates] = useState({});
  const [loading, setLoading] = useState(true); // Loading state

  // Function to fetch data
  const fetchInputStates = async () => {
    try {
      const response = await axios.get('http://raspberrypi.local:5000/api/read-all-channels');
      
      // Assuming the API response returns data with keys like AI0, AI1, AI2, etc.
      if (response.data.success) {
        setInputStates(response.data.data); // Store the input data in state
      } else {
        console.error('Failed to fetch channel data');
      }
    } catch (error) {
      console.error('Error fetching channel data:', error);
    } finally {
      setLoading(false); // Set loading to false after fetching data
    }
  };

  // Fetch data initially and then every 10 seconds
  useEffect(() => {
    fetchInputStates(); // Initial fetch
    const intervalId = setInterval(fetchInputStates, 10000); // Set interval to fetch data every 10 seconds

    // Cleanup the interval on component unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div>
      <Card>
        <Card.Header>
          <Card.Title>Analog Input Status</Card.Title>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <Spinner animation="border" size="sm" role="status" />
          ) : (
            <div>
              {Object.entries(inputStates).length > 0 ? (
                Object.entries(inputStates).map(([channelKey, value], index) => (
                  <Card.Text key={index}>
                    {channelKey} Value: <span style={{ marginLeft: '10px' }}></span>
                    <strong>{value}</strong> {/* Display the analog input value */}
                  </Card.Text>
                ))
              ) : (
                <p>No analog input data available.</p> // Display message if no data is found
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardAI;
