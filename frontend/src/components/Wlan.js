import React, { useEffect, useState } from 'react'
import { Form, Container, Button, Row, Col, Spinner } from 'react-bootstrap'
import { useForm, useWatch } from 'react-hook-form';
import TextInput from '../formcomponents/TextInput';
import Checkbox from '../formcomponents/Checkbox';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const Wlan = () => {
  // Loading state
  const [loadingEth, setloadingEth] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [action, setAction] = useState(false);
  const [wifi, setWifi] = useState([]);
  const [connStatus, setConnStatus] = useState(false);

  const { control, handleSubmit, setValue } = useForm({
      defaultValues: {
          enabledhcp: false,
      }
  });

  const enabledhcp = useWatch({ control, name: 'enabledhcp' });
  const isDHCPEnabled = enabledhcp === true;

  const navigate = useNavigate(); // Initialize the useNavigate hook

  useEffect(() => {
    const fetchConfig = async () => {
        try {
            setloadingEth(true);
            const response = await axios.get('http://raspberrypi.local:5000/api/network/wlan');
            const config = response.data;
            if (response.status === 200 && response.data) {
                
                setWifi(config);
                setValue('enabledhcp', config.dhcpEnabled);
                setValue('staticip', config.staticIP);
                setValue('subnet', config.subnetMask);
                setValue('gateway', config.gateway);
                setValue('dns', config.dns);
                if(config.ssidName){
                  setConnStatus(true);
                  console.log(config.ssidName);
                }else{
                  setConnStatus(false);
                }

                
            }
        } catch (error) {
            console.error('Error fetching Wi-Fi configuration:', error);
        } finally {
            setloadingEth(false);
        }
    };

    fetchConfig();
  }, [setValue]);

  useEffect(() => {
      let timer;
      if (loadingEth) {
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
  }, [loadingEth]);

  const onSubmit = async (data) => {
    try {
        setAction(true);
        const response = await axios.post('http://raspberrypi.local:5000/api/network/wifiConnect', data);
        console.log('Wi-Fi configuration updated successfully:', response.data);
        alert('Wi-Fi configuration updated successfully:', response.data);
    } catch (error) {
        console.error('Error updating Wi-Fi configuration:', error);
    } finally {
        setAction(false);
    }
  };

  const handleNavigate = () => {
    // Navigates to the Wireless.js page
    navigate('/wireless');
  };

  return (
      <Container>
        {loadingEth && showLoading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : (
            <>
              <Row className='mt-4'>
                  <Col sm={2}></Col>
                  <Col sm={3}><p>Wi-Fi</p></Col>
                  <Col sm={5}><p>{wifi.ssidName || 'No WiFi connection'}</p></Col>
                  <Col sm={2}></Col>
              </Row>
              <Form onSubmit={handleSubmit(onSubmit)}>
                  <Checkbox control={control} name={"enabledhcp"} label={"Enable DHCP"} disabled={false}/>
                  <TextInput control={control} name={"staticip"} label={"Static IP"} placeholder={"Enter Static IP"} disabled={enabledhcp}/>
                  <TextInput control={control} name={"subnet"} label={"Subnet Mask"} placeholder={"Enter Subnet Mask (e.g., 255.255.255.0)"} disabled={isDHCPEnabled}/>
                  <TextInput control={control} name={"gateway"} label={"Gateway"} placeholder={"Enter Gateway IP"} disabled={enabledhcp}/>
                  <TextInput control={control} name={"dns"} label={"DNS Server"} placeholder={"Enter DNS IP"} disabled={enabledhcp}/>

                  <div className="d-flex justify-content-center mt-3">
                      <Button variant="primary" type="submit" className="mt-3 align-items-center" disabled = {!connStatus}>
                      {action ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                            <span className="ms-2">Updating...</span>
                          </>
                        ) : (
                            "Update Wi-Fi"
                        )}
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        type="button" // Change to type="button" to prevent form submission
                        className="mt-3 ms-3 align-items-center"
                        onClick={handleNavigate} // Trigger navigation to Wireless.js
                      >
                        Other Wi-Fi
                      </Button>
                  </div>
              </Form>
          </>
          )}
      </Container>
  );
}

export default Wlan;
