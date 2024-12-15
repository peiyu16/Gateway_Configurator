import React, { useEffect, useState } from 'react'
import { Form, Container, Button, Row, Col, Spinner } from 'react-bootstrap'
import { useForm, Controller, useWatch } from 'react-hook-form';
import TextInput from '../formcomponents/TextInput';
import Checkbox from '../formcomponents/Checkbox';
import SelectInput from '../formcomponents/SelectInput';
import axios from 'axios';

const Ethernet2 = () => {
   // Loading state
   const [loadingEth, setloadingEth] = useState(false);
   const [showLoading, setShowLoading] = useState(false);
   const [action, setAction] = useState(false);
   const [connStatus, setConnStatus] = useState(false);
   
   const { control, watch, handleSubmit, setValue } = useForm({
       defaultValues: {
           enabledhcp: false,
       }
   });

   const enabledhcp = useWatch({ control, name: 'enabledhcp' });
   const isDHCPEnabled = enabledhcp === true;
   // console.log('enabledhcp', enabledhcp)

   useEffect(() => {
   const fetchConfig = async () => {
        try {
            setloadingEth(true);
            const response = await axios.get('http://raspberrypi.local:5000/api/network/ethernet-config-eth1');
            const { config, connectionStatus } = response.data;
            if (response.status === 200 && response.data) {
                
                setValue('enabledhcp', config.dhcpEnabled);
                setValue('staticip', config.staticIP);
                setValue('subnet', config.subnetMask);
                setValue('gateway', config.gateway);
                setValue('dns', config.dns);
                setConnStatus(connectionStatus.status);
            }
        } catch (error) {
            console.error('Error fetching Ethernet configuration:', error);
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
         const response = await axios.post('http://raspberrypi.local:5000/api/network/ethernet-config-eth1', data);
         
         console.log('Ethernet configuration updated successfully:', response.data);
         // Optionally, add logic to display a success message to the user
         alert('Ethernet configuration updated successfully:', response.data);
     } catch (error) {
         console.error('Error updating Ethernet configuration:', error);
         // Optionally, handle the error to show a message to the user
     } finally {
         setAction(false);
     }
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
                   <Col sm={3}><p>Ethernet</p></Col>
                   <Col sm={5}><p>Eth1</p></Col>
                   <Col sm={2}></Col>
               </Row>
               <Form onSubmit={handleSubmit(onSubmit)}>
                   <Checkbox control={control} name={"enabledhcp"} label={"Enable DHCP"} disabled={false}/>
                   
                       <TextInput
                       control={control}
                       name={"staticip"}
                       label={"Static IP"}
                       placeholder={"Enter Static IP"}
                       disabled={enabledhcp}
                   />
                   <TextInput
                       control={control}
                       name={"subnet"}
                       label={"Subnet Mask"}
                       placeholder={"Enter Subnet Mask (e.g., 255.255.255.0)"}
                       disabled={isDHCPEnabled}
                   />
                   <TextInput
                       control={control}
                       name={"gateway"}
                       label={"Gateway"}
                       placeholder={"Enter Gateway IP"}
                       disabled={enabledhcp}
                   />
                   <TextInput
                       control={control}
                       name={"dns"}
                       label={"DNS Server"}
                       placeholder={"Enter DNS IP"}
                       disabled={enabledhcp}
                   />
                   
                   <div className="d-flex justify-content-center mt-3">
                       <Button 
                           variant="primary" 
                           type="submit" 
                           className="mt-3 align-items-center"
                           disabled = {!connStatus}
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
                             <span className="ms-2">Updating...</span>
                           </>
                             
                         ) : (
                             "Update Ethernet"
                         )}
                       </Button>
                       
                   </div>
   
               </Form>
           </>
           )}
       </Container>
   )
}

export default Ethernet2
