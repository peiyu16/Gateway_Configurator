// SelectInput.js
import React from 'react';
import { Controller } from 'react-hook-form';
import { Form, Row, Col } from 'react-bootstrap';

const SelectInput = ({ control, name, label, a_label, sm, options, disabled }) => (
    <Form.Group as={Row} controlId={name} className="mb-4 mt-3">
        <Col sm="2"></Col>
        <Form.Label column sm="3">
            {label}
        </Form.Label>
        <Col sm={sm || 5}>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <Form.Select {...field} aria-label={a_label}>
                        <option value="">{a_label}</option>
                        {options.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Form.Select>
                )}
                disabled={disabled}
            />
        </Col>
        <Col sm="2"></Col>
    </Form.Group>
);

export default SelectInput;
