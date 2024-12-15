import React, {useEffect, useState} from 'react'
import { Form, Container, Button, Row, Col, Spinner } from 'react-bootstrap'
import Networkcomp from '../formcomponents/Networkcomp'
import axios from 'axios';

const NetworkStatus = () =>{

    const [networkData, setNetworkData] = useState([]);
    // Loading state
    const [loadingStatus, setloadingStatus] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    
    // Fetch network status data from the API
    const fetchNetworkStatus = async () => {
        try {
            setloadingStatus(true);
            const response = await axios.get('http://raspberrypi.local:5000/api/network/status');
            setNetworkData(response.data); // Set the data to state
        } catch (error) {
            console.error('Error fetching network status:', error);
        } finally {
            setloadingStatus(false);
        }
    };

    useEffect(() => {
        fetchNetworkStatus();
    }, []);
    
    useEffect(() => {
        let timer;

        if (loadingStatus) {
            // Set a timer to show the spinner after 1 second
            timer = setTimeout(() => {
                setShowLoading(true);
            }, 1000);
        } else {
            // Reset the spinner display immediately when loading is complete
            setShowLoading(false);
        }

        // Clear the timer if loadingState changes
        return () => clearTimeout(timer);
    }, [loadingStatus]);

    return (
      <Container className='mt-4'>
      
          {loadingStatus && showLoading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            networkData.map((network) => (
              <Row className='mt-4 mb-2' key={network.interface}>
                <Col sm={2}></Col>
                <Col sm={8}>
                  <div style={{ borderWidth: "2px", borderColor: "gray", borderStyle: "solid" }}>
                    <Networkcomp title={"Interface"} value={network.interface} />
                    <Networkcomp title={"State"} value={network.state || 'Disconnected'} />
                    <Networkcomp title={"Connection"} value={network.conn || 'N/A'} />
                    <Networkcomp title={"IPv4 Address"} value={network.ipAddress || 'N/A'} />
                    <Networkcomp title={"IPv4 Gateway"} value={network.gateway || 'N/A'} />
                    <Networkcomp title={"DNS"} value={network.dns || 'N/A'} />
                  </div>
                </Col>
                <Col sm={2}></Col>
              </Row>
            ))
          )}
      </Container>
    )
}

export default NetworkStatus
