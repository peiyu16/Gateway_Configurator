import React, { useEffect, useState } from 'react'
import {Container, Form, Button, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import Checkbox from '../formcomponents/Checkbox';
import SelectInput from '../formcomponents/SelectInput';
import TextInput from '../formcomponents/TextInput';

const DataSet = () => {
    
    const [loadingRW, setloadingRW] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [action, setAction] = useState(false);
    
    // Initialize useForm hook
    const { control, watch, handleSubmit, reset, setValue } = useForm({
        defaultValues: {
            enableset: false,
            datachannel: "",
            subtopic: "",
            subQOS: "",
            restopic: "",
            resQOS:""
        },
    });

    const enableSet = watch('enableset');

    useEffect(() => {
        const fetchDataSet = async () => {
            try {
                setloadingRW(true);
                const response = await axios.get('http://raspberrypi.local:5000/api/dataset');
                if (response.status === 200 && response.data) {
                    const data = response.data;
                    setValue('enableset', data.enableset);
                    setValue('datachannel', data.datachannel);
                    setValue('subtopic', data.subtopic);
                    setValue('subQOS', data.subQOS);
                    setValue('restopic', data.restopic);
                    setValue('resQOS', data.resQOS);
                    console.log(data);
                } else {
                    console.log('No DataSet configuration found'); // Log a message instead of showing an alert
                }
            } catch (error) {
                console.error('Error fetching data set configuration:', error);
            } finally {
                setloadingRW(false);
            }
        };
    
        fetchDataSet();
    }, [setValue]);
    
    useEffect(() => {
        let timer;

        if (loadingRW) {
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
    }, [loadingRW]);

    const onSubmit = async (data) => {
        try {
            setAction(true);
            const response = await axios.post('http://raspberrypi.local:5000/api/dataset', {
                enableset: data.enableset,
                datachannel: data.datachannel,
                subtopic: data.subtopic,
                subQOS: data.subQOS,
                restopic: data.restopic,
                resQOS: data.resQOS
            });
            
            if(data.enableset){
                if(data.datachannel==="MQTT"){
                    try{
                        const registerWrite = await axios.post('http://raspberrypi.local:5000/api/dataset/subscribe',{
                            datachannel: data.datachannel,
                            subtopic: data.subtopic,
                            subQOS: data.subQOS,
                            restopic: data.restopic,
                            resQOS: data.resQOS
                        });
                        alert(registerWrite.data.message);
                    }catch(err){
                        alert(err.response?.data?.message || "MQTT Client not connected");
                    }
                    
                } else {
                    try{
                        const registerWrite = await axios.post('http://raspberrypi.local:5000/api/awsiot/dataset/subscribe',{
                            datachannel: data.datachannel,
                            subtopic: data.subtopic,
                            subQOS: data.subQOS,
                            restopic: data.restopic,
                            resQOS: data.resQOS
                        });
                        alert(registerWrite.data.message);
                    }
                    catch(err){
                        alert(err.response?.data?.message || "AWS IoT Client not connected");
                    }
                }
            } else {
            
                if(data.datachannel==="MQTT"){
                    const stoplistening = await axios.post('http://raspberrypi.local:5000/api/dataset/stoplistening');
                    alert(stoplistening.data.message);
                    console.log(stoplistening.data.message);
                } else {
                    const stoplistening = await axios.post('http://raspberrypi.local:5000/api/awsiot/dataset/stoplistening');
                    alert(stoplistening.data.message);
                    console.log(stoplistening.data.message);
                }
              
            }
            
            console.log('Data saved successfully:', response.data);
            alert('Data set saved successfully');
            
        } catch (error) {
            console.error('Error saving data set:', error);
            alert('Failed to save data set');
        } finally {
            setAction(false);
        }
    };

    return (
        <div>
            {loadingRW && showLoading ? (
              <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
                  <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                  </Spinner>
              </div>
            ) : (
                <Form onSubmit={handleSubmit(onSubmit)} className='mt-4 mb-4'>
                    <Checkbox control={control} name={"enableset"} label={"Enable Register Write"} disabled={false}/>
                    {
                        enableSet &&
                        <>
                            <SelectInput 
                                control={control}
                                name={"datachannel"}
                                label={"Data Channel"}
                                a_label={"Select Data Channel"}
                                options={
                                    [
                                        {label:"MQTT", value: "MQTT"},
                                        {label:"AWS IoT", value: "AWS IoT"}
                                    ]
                                }
                                disabled={!enableSet}
                            />
                            <TextInput control={control} name={"subtopic"} label={"Subscribed Topic"} placeholder={"/regWrite"} disabled={!enableSet}/>
                            <SelectInput
                                control={control}
                                name={"subQOS"}
                                label={"QOS"}
                                a_label={"Select QOS"}
                                options={
                                    [
                                        {label:"QOS 0", value: 0},
                                        {label:"QOS 1", value: 1},
                                        {label:"QOS 2", value: 2}
                                    ]
                                }
                            />
                            <TextInput control={control} name={"restopic"} label={"Respond Topic"} placeholder={"/regWrite/res"} disabled={!enableSet}/>
                            <SelectInput
                                control={control}
                                name={"resQOS"}
                                label={"QOS"}
                                a_label={"Select QOS"}
                                options={
                                    [
                                        {label:"QOS 0", value: 0},
                                        {label:"QOS 1", value: 1},
                                        {label:"QOS 2", value: 2}
                                    ]
                                }
                            />
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
        </div>
    )
}

export default DataSet
