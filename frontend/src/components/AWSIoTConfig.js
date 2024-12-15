import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form, Button, Container, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Checkbox from '../formcomponents/Checkbox';
import TextInput from '../formcomponents/TextInput';
import SelectInput from '../formcomponents/SelectInput';
import FileInput from '../formcomponents/FileInput';
import axios from 'axios';

const AWSIoTConfig = () => {

    const [loadingConfig, setLoadingConfig] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [enableStat, setEnableStat] = useState(false);
    
    const { control, watch, handleSubmit, setValue, register } = useForm({
        defaultValues: {
            enableService: false,
            clientID: '',
            serverAddress: '',
            serverPort: '',
            keepAlive: '',
            reconnectTimeout: '',
            reconnectInterval: '',
            cleanSession: false,
            sslProtocol: '',
            serverCA: null,
            clientCA: null,
            clientKey: null
        }
    });

    // Fetch the MQTT status (whether client is connected or not)
    useEffect(() => {
        const fetchMqttStatus = async () => {
            try {
                const response = await axios.get('http://raspberrypi.local:5000/api/awsiot/status');
                const isClientConnected = response.data.awsClient;
                setEnableStat(isClientConnected); // Update enable/disable state
                setValue("enableService", isClientConnected); // Sync form state
                console.log('MQTT Status:', response.data);
            } catch (error) {
                console.error('Failed to fetch MQTT status:', error);
            }
        };

        fetchMqttStatus();
    }, []);

    // Fetch the current configuration when the component mounts
    useEffect(() => {
        const fetchConfig = async () => {
            setLoadingConfig(true);
            try {
                const response = await axios.get('http://raspberrypi.local:5000/api/awsiot/latest-config');
                const config = response.data;
                console.log(config);
                // Set form values with the fetched configuration
                Object.keys(config).forEach(key => {
                    if(key!="enableService"){
                        setValue(key, config[key]);
                    }
                });
            } catch (error) {
                console.error('Failed to fetch AWS IoT configuration:', error);
            } finally {
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

    const enableService = watch("enableService");

    const onSubmit = async (data) => {
        setSubmitting(true);
        const formData = new FormData();

        // Append files if they exist and are included in the form data
        if (data.serverCA && data.serverCA.length > 0) {
            formData.append("serverCA", data.serverCA[0]);
        }
        if (data.clientCA && data.clientCA.length > 0) {
            formData.append("clientCA", data.clientCA[0]);
        }
        if (data.clientKey && data.clientKey.length > 0) {
            formData.append("clientKey", data.clientKey[0]);
        }

        // Append all other form data
        Object.keys(data).forEach(key => {
            if (key !== "serverCA" && key !== "clientCA" && key !== "clientKey") {
                formData.append(key, data[key]);
            }
        });

        try {
            const response = await axios.post('http://raspberrypi.local:5000/api/awsiot/configure', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log('Server response:', response.data);
            alert(response.data.message);
        } catch (error) {
            const errorMessage = error.response && error.response.data && error.response.data.message
                ? error.response.data.message
                : 'Failed to configure AWS IoT!';

            alert(errorMessage);
        } finally{
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
                        <Checkbox control={control} name="enableService" label="Enable Service"/>
                        <TextInput control={control} name="clientID" label="Client ID*" placeholder="Enter Client ID" disabled={!enableService} />
                        <TextInput control={control} name="serverAddress" label="Server Address (IP)*" placeholder="Enter server address" disabled={!enableService} />
                        <TextInput control={control} name="serverPort" label="Server Port*" placeholder="Enter server port" type="number" disabled={!enableService} />
                        <TextInput control={control} name="keepAlive" label="Keep Alive*" placeholder="Enter keep alive time (seconds)" type="number" disabled={!enableService} />
                        <TextInput control={control} name="reconnectTimeout" label="Reconnect Timeout*" placeholder="Enter reconnect timeout (seconds)" type="number" disabled={!enableService} />
                        <TextInput control={control} name="reconnectInterval" label="Reconnection Interval*" placeholder="Enter reconnection interval (seconds)" type="number" disabled={!enableService} />
                        <Checkbox control={control} name="cleanSession" label="Clean Session" disabled={!enableService} />
                        <SelectInput
                            control={control}
                            name="sslProtocol"
                            label="SSL Protocol*"
                            a_label="Select SSL Protocol"
                            options={[
                                { label: "TLS1.2", value: "TLS1.2" },
                                { label: "TLS1.3", value: "TLS1.3" }
                            ]}
                            disabled={!enableService}
                        />
                        <FileInput label="Upload Server CA*" name="serverCA" register={register} disabled={!enableService} />
                        <FileInput label="Upload Client CA*" name="clientCA" register={register} disabled={!enableService} />
                        <FileInput label="Upload Client Private Key*" name="clientKey" register={register} disabled={!enableService} />
                        <div className="d-flex justify-content-center">
                            <Button 
                                type="submit" 
                                className="mt-3"
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
    );
};

export default AWSIoTConfig;
