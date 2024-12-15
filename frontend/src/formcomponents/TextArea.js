import React from 'react'
import { Controller } from 'react-hook-form';
import { Form, Row, Col } from 'react-bootstrap';

const TextArea = ({control,name,label,placeholder,disabled,rows=3}) => {
    return (
        <Form.Group as={Row} className="mb-4 mt-3" controlId={name}>
            <Col sm="2"></Col>
            <Form.Label column sm="3">
                {label}
            </Form.Label>
            <Col sm="5">
                <Controller
                    name={name}
                    control={control}
                    render={({ field }) => (
                        <Form.Control
                            as="textarea" // Specify that this is a textarea
                            rows={rows} // Set the number of rows
                            {...field}
                            placeholder={placeholder}
                            disabled={disabled}
                        />
                    )}
                />
            </Col>
            <Col sm="2"></Col>   
        </Form.Group>
  )
}

export default TextArea