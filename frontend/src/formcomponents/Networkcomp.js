import React from 'react'
import { Form, Container, Button,Row,Col } from 'react-bootstrap'

const Networkcomp = (props) => {
  const {title, value} = props;
  
    return (
    <Row className='mt-2'>
        <Col sm={2}></Col>
        <Col sm={3}>
            <p style={{fontWeight:"bold"}}> {title} </p>
        </Col>
        <Col sm={5}>
            <p> {value} </p>
        </Col>
        <Col sm={2}></Col>
    </Row>
  )
}

export default Networkcomp
