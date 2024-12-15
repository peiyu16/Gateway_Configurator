import React, {useMemo} from 'react'
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 

const SerialPortCard = React.memo((props) => {
    
    const {
        portName, // Default value if no portName is provided
        baudRate,
        dataBits,
        parityBit,
        stopBit,
        flowControl
    } = props; 
    const navigate = useNavigate();

    const goToConfig = () => {
      navigate('/serialport-config',
        {
            state: {
              portName,
              baudRate,
              dataBits,
              parityBit,
              stopBit,
              flowControl
            }
          }
      );
    };

    const handleTestClick = () => {
        const configData = {
            port: portName, // example port, adjust as necessary
            baudRate: baudRate,
            dataBits: dataBits,
            parityBit: parityBit,
            stopBit: stopBit,
            flowControl: flowControl
        };

        axios.post('http://raspberrypi.local:5000/api/serialport-configtest', configData)
            .then(response => {
                alert(response.data.message); // Show success message in alert
            })
            .catch(error => {
                console.error('Error:', error);
                alert(`Result: Failed to configure port -> ${error.response.data.error}`); // Show error message in alert
            });
    };


    return (
        <Card style={{ width: '50rem' }} className='mb-4'>
            <Card.Header as="h5" className="d-flex justify-content-between align-items-center ps-4">
                {portName}
                <Button style={{width: 80}} variant="outline-primary" onClick={handleTestClick}>Test</Button>
            </Card.Header>
            <Card.Body>
                
                <Card.Text className='ms-3 mt-3 mb-3'>
                    <>
                    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '450px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h6>Baud Rate:</h6>
                            <h6>{baudRate}bps</h6>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h6>Data Bits:</h6>
                            <h6>{dataBits}Bits</h6>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h6>Parity Bit:</h6>
                            <h6>{parityBit}</h6>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h6>Stop Bit:</h6>
                            <h6>{stopBit}</h6>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h6>Flow Control:</h6>
                            <h6>{flowControl}</h6>
                        </div>
                        {/* <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h6>Status:</h6>
                            <h6>Closed</h6>
                        </div> */}
                    </div>
                    </>
                </Card.Text>
                <Button variant="primary" onClick={goToConfig}>Edit Configuration</Button>
            </Card.Body>
        </Card>
    )
})

export default SerialPortCard
