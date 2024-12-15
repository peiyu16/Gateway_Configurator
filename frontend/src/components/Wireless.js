import React, {useEffect, useState} from 'react'
import { Form, Container, Button, Row, Col, Spinner } from 'react-bootstrap'
import { useForm, Controller, useWatch } from 'react-hook-form';
import TextInput from '../formcomponents/TextInput';
import Checkbox from '../formcomponents/Checkbox';
import SelectInput from '../formcomponents/SelectInput';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CDBIcon } from 'cdbreact';

const Wireless = () =>{
    
    const [ssidOptions, setSsidOptions] = useState([]);
    // Loading state
    const [loadingWiFi, setLoadingWifi] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [action, setAction] = useState(false);
    
    const history = useNavigate();

    const { control, handleSubmit, setValue } = useForm({
        defaultValues: {
            wifi: '',
            password: '',
        },
    });
    
    const fetchSSIDs = async () => {
        try {
            setLoadingWifi(true);
            const response = await axios.get('http://raspberrypi.local:5000/api/network/wifi-scan');
            if (response.data.networks) {
                const options = response.data.networks.map(network => ({
                    label: network.ssid, 
                    value: network.ssid,
                }));
                setSsidOptions(options);
            }
        } catch (error) {
            console.error('Error fetching SSIDs:', error);
        } finally {
            setLoadingWifi(false);
        }
    };
    
    // Fetch SSID list on component mount
    useEffect(() => {
        fetchSSIDs();
    }, []);

    // Handle form submission
    const onSubmit = async (data) => {
        try {
            setAction(true);
            const response = await axios.post('http://raspberrypi.local:5000/api/network/connect-wifi', {
                ssid: data.wifi,
                password: data.password,
            });

            alert('Connected to Wi-Fi successfully');
            history(-1);
        } catch (error) {
            console.error('Error connecting to Wi-Fi:', error);
            alert('Failed to connect to Wi-Fi');
        } finally {
            setAction(false);
        }
    };
    return (
        <Container className="d-flex justify-content-center"
            style={{ flexDirection: 'column' }}
        >
            <Row>
                <Col sm={1}></Col>
                <Col sm={2}>
                    <Button
                        variant="primary"
                        onClick={()=> history(-1)}
                        className="d-flex align-items-center"
                        style={{ fontSize: '24px' }}
                    >
                        <CDBIcon icon="chevron-circle-left" /> {/* CDBReact back arrow icon */}
                        <span className="ms-2" style={{ display: 'none' }}>Back</span> {/* Hidden text for accessibility */}
                    </Button>
                </Col>
                <Col sm={6}><h3 style={{textAlign:'center'}}>Wi-Fi Connection</h3></Col>
                <Col sm={3}></Col>
            </Row>
            <hr style={{ width: '90%', margin: '20px auto' }} />
            <Form className="mt-5" onSubmit={handleSubmit(onSubmit)}>
                <SelectInput
                    control={control}
                    name={'wifi'}
                    label={'Wifi SSID'}
                    a_label={loadingWiFi? 'Retrieving Wi-Fi SSID':'Select Wifi SSID'}
                    disabled={loadingWiFi}
                    options={ssidOptions}
                />
                <TextInput
                    control={control}
                    name={"password"}
                    label={"Password"}
                    placeholder={"Enter Password"}
                    disabled={false}
                    type={"password"}
                />
                <div className="d-flex justify-content-center mt-3">
                    <Button 
                        variant="primary" 
                        type="submit" 
                        className="me-2" 
                        style={{ width: '150px', marginTop:'100px' }}
                    >
                        {action ? (
                            <>
                              <Spinner
                                  as="span"
                                  animation="border"
                                  size="sm"
                                  role="status"
                                  aria-hidden="true"
                                  className="me-2" // Adds margin to the right of the spinner
                              />
                              <span className="ms-2">Connecting...</span>
                            </>
                              
                          ) : (
                              "Connect to Wi-Fi"
                          )}
                    </Button>
                    <Button variant="outline-primary" onClick={fetchSSIDs} style={{ width: '150px', marginTop:'100px' }}>
                        Refresh
                    </Button>
                </div>
            </Form>
        </Container>
    )
}

export default Wireless
