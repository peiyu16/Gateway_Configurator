import React, {useEffect, useState} from 'react'
import { useForm, Controller, useFormContext } from 'react-hook-form';
import { Form, Row, Col, Button, Container, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Checkbox from '../formcomponents/Checkbox';
import TextInput from '../formcomponents/TextInput';
import SelectInput from '../formcomponents/SelectInput';
import FileInput from '../formcomponents/FileInput';
import axios from 'axios';    

const MQTTConfig = () => {
    
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [enablestat, setEnableStat] = useState(false);
    
    const { control, watch, handleSubmit, setValue, register } = useForm({
        defaultValues: {
            enablemqtt: false,
            hostname: "",
            clientID: "",
            version: "",
            clean: false,
            keepAlive: "",
            reconnectPeriod: "",
            connectTimeout: "",
            usercredential: false,
            username: "",
            password: "",
            lastwill: false,
            lastwilltopic: "",
            lastwillpayload: "",
            lastwillqos: "",
            retainflag: false,
            enablessl: false,
            tlsversion: "",
            caFile: null,
            clientCert: null,
            clientKey: null
        }
    });

    // Fetch the MQTT status (whether client is connected or not)
    useEffect(() => {
        const fetchMqttStatus = async () => {
            try {
                const response = await axios.get('http://raspberrypi.local:5000/api/mqtt/status');
                // If client is null, set enablemqtt to false, otherwise true
                const isClientConnected = response.data.client;
                setEnableStat(isClientConnected); // Update enable/disable state
                setValue("enablemqtt", isClientConnected); // Sync form state
                console.log('MQTT Status:', response.data);
            } catch (error) {
                console.error('Failed to fetch MQTT status:', error);
            }
        };

        fetchMqttStatus();
    }, []);

    /* Get Lastest Config while onMount */
    useEffect(() => {
        // Fetch the latest configuration when the component mounts
        const fetchConfig = async () => {
            try {
                setLoadingConfig(true);
                const response = await axios.get('http://raspberrypi.local:5000/api/mqtt/latest-config');
                const config = response.data;
                console.log(config);
                // Set form values with the fetched configuration
                Object.keys(config).forEach(key => {
                    if(key!=='enablemqtt'){
                        setValue(key, config[key]);
                    }
                    
                });

            } catch (error) {
                console.error('Failed to fetch MQTT configuration:', error);
            } finally{
                setLoadingConfig(false);
            }
        };

        fetchConfig();
    }, [setValue]);
    
    useEffect(() => {
        let timer;

        if (loadingConfig) {
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
    }, [loadingConfig]);

    const enableMQTTConfig = watch("enablemqtt");
    const enableUserCrendential = watch("usercredential");
    const enableLastWill = watch("lastwill");
    const enableSSL = watch("enablessl");

    const onSubmit = async (data) => {
    
        setSubmitting(true);
        const formData = new FormData();
    
        // Append files if they exist and are included in the form data
        if (data.caFile && data.caFile.length > 0) {
            formData.append("caFile", data.caFile[0]);
        }
        if (data.clientCert && data.clientCert.length > 0) {
            formData.append("clientCert", data.clientCert[0]);
        }
        if (data.clientKey && data.clientKey.length > 0) {
            formData.append("clientKey", data.clientKey[0]);
        }
    
        // Append all other form data
        Object.keys(data).forEach(key => {
            // Make sure not to re-append file fields
            if (key !== "caFile" && key !== "clientCert" && key !== "clientKey") {
                formData.append(key, data[key]);
            }
        });
    
        try {
            const response = await axios.post('http://raspberrypi.local:5000/api/mqtt/configure', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log('Server response:', response.data);
            alert(`MQTT Configuration successful! ${response.data.message}`);
        } catch (error) {
            const errorMessage = error.response && error.response.data && error.response.data.message
                ? error.response.data.message
                : 'Failed to configure MQTT';

            alert(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container>
            {loadingConfig && showLoading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                </div>
            ) : (   
                <Form onSubmit={handleSubmit(onSubmit)}>
                    <Checkbox control={control} name="enablemqtt" label="Enable MQTT" disabled={false}/>
                    <TextInput control={control} name="hostname" label="Hostname / Server IP *" placeholder="Enter hostname or IP address" disabled={!enableMQTTConfig}/>
                    <TextInput control={control} name="clientID" label="Client ID*" placeholder="Enter client ID" disabled={!enableMQTTConfig}/>
                    <SelectInput
                        control={control}
                        name="version"
                        label="MQTT Version*"
                        a_label = "Select MQTT version"
                        options={[{ label: "MQTT v3.1.1", value: 4 }, { label: "MQTT v5.0", value: 5 }]}
                        disabled={!enableMQTTConfig}
                    />
                    <Checkbox control={control} name="clean" label="Clean" disabled={!enableMQTTConfig}/>
                    <TextInput control={control} name="keepAlive" label="Keep Alive*" placeholder="Enter keepalive time in seconds" disabled={!enableMQTTConfig}/>
                    <TextInput control={control} name="reconnectPeriod" label="Reconnect Period*" placeholder="Enter reconnect period in seconds" disabled={!enableMQTTConfig}/>
                    <TextInput control={control} name="connectTimeout" label="Connect Timeout*" placeholder="Enter connect timeout in seconds" disabled={!enableMQTTConfig}/>
                    {/*Enable to enter username and password*/}
                    <Checkbox control={control} name="usercredential" label="User Credential" disabled={!enableMQTTConfig}/>
                    {enableUserCrendential && (
                        <>
                            <TextInput control={control} name="username" label="Username" placeholder="Enter username" disabled={!(enableUserCrendential&&enableMQTTConfig)}/>
                            <TextInput control={control} name="password" label="Password" placeholder="Enter password" disabled={!(enableUserCrendential&&enableMQTTConfig)}/>   
                        </>
                    )}
                    {/*Enable to enter lastwill parameter*/}
    
                    <Checkbox control={control} name="lastwill" label="Last Will" disabled={!enableMQTTConfig}/>
                    {enableLastWill && (
                        <>
                            <TextInput control={control} name="lastwilltopic" label="Topic" placeholder="Topic" disabled={!(enableLastWill&&enableMQTTConfig)}/>
                            <TextInput control={control} name="lastwillpayload" label="Payload" placeholder="Payload" disabled={!(enableLastWill&&enableMQTTConfig)}/>
                            <SelectInput
                                control={control}
                                name="lastwillqos"
                                label="QOS"
                                a_label="Select QOS"
                                options={[{ label: "0", value: 0 }, { label: "1", value: 1 },{ label: "2", value: 2 }]}
                                disabled={!(enableLastWill&&enableMQTTConfig)}
                            />
                            <Checkbox control={control} name="retainflag" label="Retain Flag" disabled={!(enableLastWill&&enableMQTTConfig)}/>
                        </>
                    )}
                    <Checkbox control={control} name="enablessl" label="SSL Protocol" disabled={!(enableMQTTConfig)}/>
                    {enableSSL &&(
                        <>
                            <SelectInput 
                                control={control}
                                name="tlsversion"
                                label="TLS Version"
                                a_label="Select TLS Version"
                                options={[{ label: "TLS 1.0", value: 1.0 }, { label: "TLS 1.1", value: 1.1 },{ label: "TLS 1.2", value: 1.2 },{ label: "TLS 1.3", value: 1.3 }]}
                                disabled={!(enableSSL&&enableMQTTConfig)}
                            />
                            <FileInput label="CA Certificate" name="caFile" register={register} disabled={!(enableSSL&&enableMQTTConfig)}/>
                            <FileInput label="Client Certificate" name="clientCert" register={register} disabled={!(enableSSL&&enableMQTTConfig)} />
                            <FileInput label="Client Private Key" name="clientKey" register={register} disabled={!(enableSSL&&enableMQTTConfig)} />
                        </>
                    )}
                    
                    <div className="d-flex justify-content-center">
                          <Button 
                              type="submit"  
                              className="mb-3"
                          > 
                              { submitting ? (
                                <>
                                    <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
                                    <span className="ms-2">Saving...</span>
                                </>
                        
                              ) : (
                                    "Save & Apply"
                              )}
                          </Button> 
                      </div>  
    
                </Form>
            )}
        </Container>
    )
}

export default MQTTConfig

