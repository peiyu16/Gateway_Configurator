import React, { useEffect, useState } from 'react';
import { Row, Col, Button, Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import SerialPortCard from '../components/SerialPortCard';

const DataTransmitForm = () => {

  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  const fetchConfig = async () => {
      try {
          setLoading(true);
          const response = await axios.get('http://raspberrypi.local:5000/api/serialports/configdata');
          const config = response.data;
          setConfigs(config);
      } catch (error) {
          console.error('Failed to fetch Serial Port configuration:', error);
      } finally {
          setLoading(false);
      }
  };

  // Read the current port while onMount
  useEffect(() => {

    // Initially fetch the latest configuration when the component mounts
    fetchConfig();
  }, []);
  
  useEffect(() => {
        let timer;

        if (loading) {
            // Set a timer to show the spinner after 1 second
            timer = setTimeout(() => {
                setShowLoading(true);
            }, 500);
        } else {
            // Reset the spinner display immediately when loading is complete
            setShowLoading(false);
        }

        // Clear the timer if loadingState changes
        return () => clearTimeout(timer);
    }, [loading]);

  return(
    <Container>

      <Row className="align-items-center"> {/* Ensures vertical alignment */}
        <Col xs={8}> {/* Adjust the size as needed */}
          <h2 className='mb-4'>Serial Port</h2>
        </Col>
        <Col xs={4} className="text-end"> {/* Aligns the button to the right */}
          <Button
            variant="primary"
            onClick={fetchConfig}
            disabled={loading} // Disable button when loading
          >
            {loading && showLoading? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span className="sr-only">Loading...</span>
              </>
            ) : (
              'Refresh Port'
            )}
          </Button>
        </Col>
      </Row>
      <Row>
        {configs.length > 0 ? (
          configs.map(config => (
            <SerialPortCard
              portName={config.path}
              baudRate={config.baudRate}
              dataBits={config.dataBits}
              parityBit={config.parityBit}
              stopBit={config.stopBit}
              flowControl={config.flowControl}
              // connectionStatus="Closed" // Assume default status or derive from config if available
            />
          ))
        ) : (
          <p>No available serial port.</p>
        )}
      </Row>
    </Container>
    
  )
}

export default DataTransmitForm;