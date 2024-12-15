import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Form, Row, Col, Button, Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import SelectInput from '../formcomponents/SelectInput';

const SerialPortConfig = () => {
    const navigate = useNavigate();
    const [ loading, setLoading ] = useState(false);

    const location = useLocation();
    const { portName, baudRate, dataBits, parityBit, stopBit, flowControl } = location.state || {};   


    const onSubmit = (data) => {
        // console.log(data);
        // Handle form submission
        setLoading(true);
        axios.post('http://raspberrypi.local:5000/api/serialports/update',data)
        .then(response => {
            console.log('Response from server:', response.data);
            console.log(response.data.message);
            alert(`Result: ${response.data.message}`);
             navigate(-1);
        })
        .catch(error => {
            console.error('There was an error!', error);
        })
        .finally(() => { 
            setLoading(false);
           
        });

    };

    const { control, handleSubmit, setValue } = useForm({
        defaultValues: {
            port: portName || '',
            baudRate: baudRate || '',
            dataBits: dataBits || '',
            parityBit: parityBit || '',
            stopBit: stopBit || '',
            flowControl: flowControl || ''
        }
    });

    return (
        <Container>
        <h2>Data Transmission</h2>
        <Form className='p-5' onSubmit={handleSubmit(onSubmit)}>
            <Form.Group as={Row} className="mb-4 mt-3" controlId="port">
                <Col sm="2"></Col>
                <Form.Label column sm="3">
                    Port
                </Form.Label>
                <Col sm="5">
                    <Controller
                        name="port"
                        control={control}
                        defaultValue="" // This can also be dynamically set if needed
                        render={({ field }) => (
                            <Form.Control 
                                type="text"
                                {...field}
                                aria-label="Selected Port"
                                // readOnly
                                value={portName || "No port available"} // Use the `selectedPort` prop
                            />
                        )}
                    />
                </Col>
                <Col sm="2"></Col>
            </Form.Group>
            <SelectInput
                    control={control}
                    name="baudRate"
                    label="Baud Rate"
                    a_label = "Select Baud Rate"
                    options={[
                        { label: "1200 bps", value: "1200" }, 
                        { label: "2400 bps", value: "2400" },
                        { label: "9600 bps", value: "9600" }, 
                        { label: "19200 bps", value: "19200" }, 
                        { label: "38400 bps", value: "38400" },
                        { label: "57600 bps", value: "57600" }, 
                        { label: "115200 bps", value: "115200" },
                        { label: "230400 bps", value: "230400" },
                    ]}
                    disabled={false}
            />
            <SelectInput
                    control={control}
                    name="dataBits"
                    label="Data Bits"
                    a_label="Select Data Bits"
                    options={[
                        { label: "5 Bits", value: "5" },
                        { label: "6 Bits", value: "6" },
                        { label: "7 Bits", value: "7" },
                        { label: "8 Bits", value: "8" },
                    ]}
                    disabled={false}
            />
            <SelectInput
                control={control}
                name="parityBit"
                label="Parity Bit"
                a_label="Select Parity Bit"
                options={[
                    { label: "None", value: "none" },
                    { label: "Even", value: "even" },
                    { label: "Odd", value: "odd" },
                    { label: "Mark", value: "mark" },
                    { label: "Space", value: "space" },
                ]}
                disabled={false}
            />
            <SelectInput
                control={control}
                name="stopBit"
                label="Stop Bit"
                a_label="Select Stop Bit"
                options={[
                    { label: "1 Bit", value: "1" },
                    { label: "2 Bits", value: "2" },
                ]}
                disabled={false}
            />
            <SelectInput
                control={control}
                name="flowControl"
                label="Flow Control"
                a_label="Select Flow Control"
                options={[
                    { label: "None", value: "none" },
                    { label: "Software", value: "software" },
                    { label: "Hardware", value: "hardware" },
                ]}
                disabled={false}
            />
            <br/>
            <div className="d-flex justify-content-center mb-3">
                <Button 
                    type="submit" 
                    style={{ width: '150px' }} 
                    disabled={false}
                >
                {loading ? 
                  
                  (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span className="sr-only">Loading...</span>
                  </>
                  ):
                  (
                    'Save Setting'
                  )
                }
                </Button>
                <Button variant="btn btn-outline-secondary" className="ms-5" style={{ width: '150px' }} onClick={() => navigate(-1)}>Cancel</Button>
            </div>
            {/* <Button type="button" className="m-2" onClick={setDefaultSettings} disabled={noPortsAvailable}>Default Setting</Button> */}
        </Form>
        </Container>
    );
  
}

export default SerialPortConfig
