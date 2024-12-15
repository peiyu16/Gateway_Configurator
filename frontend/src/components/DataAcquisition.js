import React, { useEffect, useState } from 'react'
import {Container, Form, Button, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import Checkbox from '../formcomponents/Checkbox';
import SelectInput from '../formcomponents/SelectInput';
import TextInput from '../formcomponents/TextInput';
import TextArea from '../formcomponents/TextArea';



const DataAcquisition = () => {
    
    const [loadingDA, setloadingDA] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [action, setAction] = useState(false);
    
    // Initialize useForm hook
    const { control, watch, handleSubmit, reset, setValue } = useForm({
        defaultValues: {
            enableDataAct: false,
            enableReport: false,
            datachannel: '',
            reportTopic: '',
            reportQOS: '',
            enableInterval: false,
            reportInterval: '',
            reportTemplate: ''
            },
    });
    const enableDataAction = watch('enableDataAct');
    const enableReport = watch('enableReport');
    const enableInterval = watch('enableInterval');
    
    const validateTemplate = (template) => {
        try {
            JSON.parse(template);
            return true;
        } catch (error) {
            alert("Invalid JSON format in template.");
            return false;
        }
    };
    // Fetch the current configuration when the component mounts
    useEffect(() => {
        const fetchConfig = async () => {
            setloadingDA(true);
            try {
                const response = await axios.get('http://raspberrypi.local:5000/api/dataacquisition');
                const configData = response.data;

                // Populate the form with the fetched configuration
                setValue('enableDataAct', configData.enableDataAct);
                setValue('enableReport', configData.enableReport);
                setValue('dataChannel', configData.dataChannel);
                setValue('reportTopic', configData.reportTopic);
                setValue('reportQOS', configData.reportQOS);
                setValue('enableInterval', configData.enableInterval);
                setValue('reportInterval', configData.reportInterval);
                setValue('reportTemplate', configData.reportTemplate); // Format as JSON string
            } catch (error) {
                console.error('Error fetching configuration:', error);
            } finally {
                setloadingDA(false);
            }
        };

        fetchConfig();
    }, []);
    
    useEffect(() => {
        let timer;

        if (loadingDA) {
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
    }, [loadingDA]);

    const onSubmit = async (data) => {
    
        try {
            setAction(true);
            const response = await axios.post('http://raspberrypi.local:5000/api/dataacquisition', data);
            alert(response.data.message);
            
            if(data.enableDataAct){
                if (data.enableReport ) {
                		if (!validateTemplate(data.reportTemplate)) {
     	                  return;
                		}
                    if (data.dataChannel === "MQTT") {
                        try{
                            const pubRes = await axios.post('http://raspberrypi.local:5000/api/dataacquisition/publish', data);
                            alert(pubRes.data.message);
                        }catch(err){
                            alert(err.response?.data?.message||"MQTT client not connected");
                        }
                        
                    }
                    else {
                        try{
                            const pubRes = await axios.post('http://raspberrypi.local:5000/api/awsiot/dataacquisition/publish', data);
                            alert(pubRes.data.message);
                        }catch(err){
                            alert(err.response?.data?.message);
                        }
                        
                    }
                } else{
                    if (data.dataChannel === "MQTT"){
                        try{
                            const stopPubRes = await axios.post('http://raspberrypi.local:5000/api/dataacquisition/stoppublish');
                            alert(stopPubRes.data.message);
                        }catch(err){
                            alert(err.res?.data?.message);
                        }
                        
                    } else {
                        try{
                            const stopPubRes = await axios.post('http://raspberrypi.local:5000/api/awsiot/dataacquisition/stoppublish');
                            alert(stopPubRes.data.message);
                        }catch(err){
                            alert(err.response?.data?.message);
                        }

                        
                    }
                    
                }
            }else{
                const stopPubRes1 = await axios.post('http://raspberrypi.local:5000/api/dataacquisition/stoppublish');
                const stopPubRes2 = await axios.post('http://raspberrypi.local:5000/api/awsiot/dataacquisition/stoppublish');
            }
            
            // Optionally handle UI feedback or state updates here
        } catch (error) {
            console.error('Error saving configuration:', error);
        } finally {
            setAction(false);
        }
    };

    return (
        <Container>
            {loadingDA && showLoading ? (
              <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
                  <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                  </Spinner>
              </div>
            ) : (
                <Form onSubmit={handleSubmit(onSubmit)} className='mt-4 mb-4'>
                    <Checkbox control={control} name={"enableDataAct"} label={"Enable Data Acquisition"} disabled={false}/>
                    {enableDataAction &&
                    <>
                        <Checkbox control={control} name={"enableReport"} label={"Enable Data Report"} disabled={false}/>
                        {enableReport &&
                        <>
                            <SelectInput 
                                control={control} 
                                name={"dataChannel"} 
                                label={"Data Channel"} 
                                a_label={"Select Data Channel"}
                                options={[
                                    {label:"MQTT", value: "MQTT"},
                                    {label:"AWS IoT", value: "AWS IoT"}
                                ]}
                                disabled={!enableReport}
                            />
                            <TextInput control={control} name={"reportTopic"} label={"Report Topic"} placeholder={"/topic"} disabled={!enableReport}/>
                            <SelectInput
                                control={control}
                                name={"reportQOS"}
                                label={"QOS"}
                                a_label={"Select QOS"}
                                options={
                                    [{label:"QOS 0", value:0}, {label:"QOS 1", value:1},{label:"QOS 2", value: 2}]
                                }
                                disabled={!enableReport}
                            />
                            <Checkbox control={control} name={"enableInterval"} label={"Periodic Interval"} disabled={!enableReport}/>
                            {enableInterval &&
                                <TextInput control={control} name={"reportInterval"} label={"Interval"} placeholder={"Enter interval (s)"} disabled={!enableInterval} type={"number"}/>
                            }
                            <TextArea control={control} name={"reportTemplate"} label={"Template"} placeholder={"{\n\"SubTopc1\":\"node01\",\n\"SubTopc2\":\"node02\"\n}"} disabled={!enableReport}/>
                        </>
                        }
                    </>
                    }
                    <div className="d-flex justify-content-center">
                        <Button 
                            variant="primary" 
                            style={{ width: '150px' }} 
                            type="submit" 
                            className="ms-2 m-4"
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

export default DataAcquisition
