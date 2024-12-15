import React from 'react'
import DigitalOutput from '../components/DigitalOutput'
import DigitalInput from '../components/DigitalInput'
import AnalogInput from '../components/AnalogInput'
import {Container } from 'react-bootstrap';

const IOStatus = () =>{
    return (
        <Container className = "mt-4 mb-4">
            <DigitalOutput/>
            <DigitalInput/>
            <AnalogInput/>
        </Container>
    )
}

export default IOStatus
